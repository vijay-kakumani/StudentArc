import io
import uuid
from flask import Blueprint, request, jsonify
import pandas as pd
from werkzeug.utils import secure_filename
from services.import_service import ImportService, CANONICAL_FIELDS, import_audit_history
from supabase_client import get_supabase

imports_bp = Blueprint("imports", __name__)

ALLOWED_EXTENSIONS = {'csv', 'xlsx'}
temp_store = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@imports_bp.route("/canonical-fields", methods=["GET"])
def get_canonical_fields():
    """Returns all supported canonical fields, data types, and requirements for UI mapping."""
    return jsonify({
        "fields": ImportService.get_canonical_fields_metadata()
    }), 200

@imports_bp.route("/preview", methods=["POST"])
def preview_import():
    """
    Profiles uploaded CSV/XLSX:
    - Delimiter detection and UTF-8 BOM handling
    - Drops legacy columns
    - Generates smart proposed column mappings with confidence scores
    - Gathers representative samples and duplicate warnings
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not supported. Please upload CSV or XLSX."}), 400

    try:
        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower()
        file_bytes = file.read()
        
        if len(file_bytes) == 0:
            return jsonify({"error": "The uploaded file is empty."}), 400

        if ext == 'csv':
            df = ImportService.read_csv_safely(file_bytes, filename)
        else:
            df = pd.read_excel(io.BytesIO(file_bytes))
            
        if df.empty:
            return jsonify({"error": "The uploaded file is empty."}), 400
            
        # Ignore legacy reference columns
        cols_to_drop = [c for c in df.columns if str(c).lower().startswith('legacy_')]
        df = df.drop(columns=cols_to_drop, errors='ignore')
            
        total_rows = len(df)
        columns = df.columns.tolist()
        missing_counts = df.isnull().sum().to_dict()
        
        # Smart dynamic column mapping proposals
        proposed_mappings = ImportService.propose_column_mapping(columns, df)
        
        duplicate_warnings = []
        
        # Check if student_id is mapped (or directly named)
        id_col = None
        for col_name, prop in proposed_mappings.items():
            if prop.get("canonical_field") == "student_id":
                id_col = col_name
                break
                
        if id_col and id_col in df.columns:
            dupes = df.duplicated(subset=[id_col]).sum()
            if dupes > 0:
                duplicate_warnings.append(f"Found {dupes} duplicate entries in column '{id_col}'.")
        elif 'student_id' in columns:
            dupes = df.duplicated(subset=['student_id']).sum()
            if dupes > 0:
                duplicate_warnings.append(f"Found {dupes} duplicate entries in column 'student_id'.")
        
        preview_df = df.head(5).where(pd.notnull(df), None)
        preview_data = preview_df.to_dict(orient="records")
        
        preview_id = str(uuid.uuid4())
        # Store in memory for confirmation and validation
        temp_store[preview_id] = {
            "df": df,
            "filename": filename,
            "proposed_mappings": proposed_mappings
        }
        
        return jsonify({
            "message": "File parsed successfully",
            "preview_id": preview_id,
            "filename": filename,
            "total_rows": total_rows,
            "columns": columns,
            "missing_data": missing_counts,
            "warnings": duplicate_warnings,
            "preview_data": preview_data,
            "proposed_mappings": proposed_mappings,
            "canonical_fields": ImportService.get_canonical_fields_metadata()
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error processing file: {str(e)}"}), 500


@imports_bp.route("/validate", methods=["POST"])
def validate_import():
    """
    Validates user-reviewed column mappings, checks ranges, detects database conflicts,
    and returns a full quality summary before commitment.
    """
    data = request.json or {}
    preview_id = data.get("preview_id")
    mapping = data.get("mapping", {})
    mode = data.get("mode", "upsert")
    
    if not preview_id or preview_id not in temp_store:
        return jsonify({"error": "Missing or invalid preview_id"}), 400
        
    stored = temp_store[preview_id]
    df = stored["df"] if isinstance(stored, dict) and "df" in stored else pd.DataFrame(stored)
    
    # If no mapping provided, use automatic proposed mapping
    if not mapping and isinstance(stored, dict) and "proposed_mappings" in stored:
        mapping = {k: v.get("canonical_field") for k, v in stored["proposed_mappings"].items()}
        
    try:
        validation_report = ImportService.validate_and_profile_data(df, mapping, mode=mode)
        return jsonify({
            "status": "success",
            "report": validation_report
        }), 200
    except Exception as e:
        return jsonify({"error": f"Validation failed: {str(e)}"}), 500


@imports_bp.route("/confirm", methods=["POST"])
def confirm_import():
    """
    Executes the validated import:
    1. Maps columns to canonical schema.
    2. Vectorized calculation of Student Success Score, Academic Score, Engagement Score,
       Placement Score, Risk Flags, and Cohort Segments via ScoringEngine.
    3. Commits to Supabase database in bounded batches (Upsert or Insert-only mode).
    4. Records execution audit metrics.
    """
    data = request.json or {}
    preview_id = data.get("preview_id")
    user_mapping = data.get("mapping") or {}
    mode = data.get("mode", "upsert")
    import_partial = data.get("import_partial", True)
    
    if not preview_id or preview_id not in temp_store:
        return jsonify({"error": "Missing or invalid preview_id"}), 400
        
    stored = temp_store[preview_id]
    
    # Support both DataFrame and legacy list-of-dicts stored in temp_store
    if isinstance(stored, dict) and "df" in stored:
        df = stored["df"]
        # Default mapping if none supplied
        if not user_mapping:
            user_mapping = {
                k: v.get("canonical_field")
                for k, v in stored.get("proposed_mappings", {}).items()
                if v.get("canonical_field")
            }
    elif isinstance(stored, list):
        df = pd.DataFrame(stored)
        if not user_mapping:
            # Map exact matching canonical column names
            user_mapping = {c: c for c in df.columns if c in CANONICAL_FIELDS}
    else:
        df = pd.DataFrame(stored)
        
    try:
        client = get_supabase()
        summary = ImportService.precalculate_and_commit(
            df=df,
            mapping=user_mapping,
            mode=mode,
            import_partial=import_partial,
            client=client
        )
        
        # Clean up in-memory preview
        del temp_store[preview_id]
        
        # Return summary matching both new rich structure and legacy tests expectations
        return jsonify({
            "message": "Import confirmed and processed with calculated scores.",
            "status": summary["status"],
            "rows_processed": summary["rows_processed"],
            "rows_inserted": summary["rows_inserted"],
            "rows_updated": summary["rows_updated"],
            "rows_skipped": summary["rows_skipped"],
            "rows_rejected": summary["rows_rejected"],
            "duration_ms": summary["duration_ms"],
            "errors": summary["errors"]
        }), 200
        
    except Exception as e:
        if "Supabase credentials are not configured" in str(e):
            return jsonify({"error": "Supabase connection is unconfigured. Cannot persist data."}), 500
        return jsonify({"error": str(e)}), 500


@imports_bp.route("/history", methods=["GET"])
def get_import_history():
    """Returns audit log of all completed imports in the current session."""
    return jsonify({
        "history": import_audit_history
    }), 200
