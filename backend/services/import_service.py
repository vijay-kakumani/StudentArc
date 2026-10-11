import csv
import io
import math
import re
import time
import uuid
from datetime import datetime
import pandas as pd
from services.scoring import ScoringEngine
from supabase_client import get_supabase

CANONICAL_FIELDS = {
    # Identity
    "student_id": {
        "label": "Student ID",
        "category": "Identity",
        "type": "string",
        "required": True,
        "description": "Unique student identifier (e.g. STU0001, Roll No, USN)",
        "aliases": [
            "student_id", "studentid", "student id", "roll_no", "rollno", "roll number",
            "roll_num", "reg_no", "regno", "registration_no", "registration number",
            "usn", "id", "enrollment_no", "enrollment number", "candidate_id", "student_code"
        ]
    },
    "student_name": {
        "label": "Student Name",
        "category": "Identity",
        "type": "string",
        "required": True,
        "description": "Full name of the student",
        "aliases": [
            "student_name", "studentname", "student name", "name", "full_name",
            "fullname", "full name", "candidate_name", "candidate name", "student"
        ]
    },
    "department": {
        "label": "Department",
        "category": "Academic",
        "type": "string",
        "required": False,
        "description": "Academic department or engineering branch",
        "aliases": [
            "department", "dept", "branch", "major", "stream", "discipline",
            "faculty", "dept_name", "academic_department"
        ]
    },
    "semester": {
        "label": "Semester",
        "category": "Academic",
        "type": "integer",
        "required": False,
        "min": 1,
        "max": 12,
        "description": "Current academic semester (1-8)",
        "aliases": [
            "semester", "sem", "term", "current_semester", "current sem", "academic_semester"
        ]
    },
    "year_of_study": {
        "label": "Year of Study",
        "category": "Academic",
        "type": "integer",
        "required": False,
        "min": 1,
        "max": 6,
        "description": "Academic year (1-4)",
        "aliases": [
            "year_of_study", "year", "academic_year", "class_year", "study_year", "batch_year"
        ]
    },
    "program": {
        "label": "Degree Program",
        "category": "Academic",
        "type": "string",
        "required": False,
        "description": "Degree or program name (e.g. B.Tech, B.E., BCA)",
        "aliases": [
            "program", "programme", "degree", "course", "degree_program"
        ]
    },
    "enrollment_status": {
        "label": "Enrollment Status",
        "category": "Academic",
        "type": "string",
        "required": False,
        "description": "Active, Inactive, Graduated, or On Leave",
        "aliases": [
            "enrollment_status", "status", "admission_status", "student_status"
        ]
    },
    "gender": {
        "label": "Gender",
        "category": "Demographics",
        "type": "string",
        "required": False,
        "aliases": ["gender", "sex"]
    },
    "age": {
        "label": "Age",
        "category": "Demographics",
        "type": "integer",
        "required": False,
        "min": 15,
        "max": 70,
        "aliases": ["age", "student_age"]
    },
    # Academic Performance
    "cgpa": {
        "label": "CGPA",
        "category": "Academic",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 10.0,
        "description": "Cumulative Grade Point Average (0.0 to 10.0 scale)",
        "aliases": [
            "cgpa", "gpa", "cumulative_gpa", "overall_gpa", "cumulative grade", "cgpa_score",
            "grade_point", "grade_point_average"
        ]
    },
    "current_semester_gpa": {
        "label": "Current Semester GPA",
        "category": "Academic",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 10.0,
        "description": "Latest term SGPA / GPA",
        "aliases": [
            "current_semester_gpa", "sgpa", "current_gpa", "term_gpa", "semester_gpa", "sem_gpa"
        ]
    },
    "previous_semester_gpa": {
        "label": "Previous Semester GPA",
        "category": "Academic",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 10.0,
        "description": "Prior term SGPA",
        "aliases": [
            "previous_semester_gpa", "prev_gpa", "past_gpa", "previous_gpa", "last_semester_gpa"
        ]
    },
    "backlog_count": {
        "label": "Active Backlogs",
        "category": "Academic",
        "type": "integer",
        "required": False,
        "min": 0,
        "max": 50,
        "description": "Number of currently uncleared failed courses / arrears",
        "aliases": [
            "backlog_count", "backlogs", "backlog", "active_backlogs", "arrears",
            "active_arrears", "failed_subjects", "standing_arrears", "failed_courses", "kts"
        ]
    },
    "failed_subject_count": {
        "label": "Failed Subject Count",
        "category": "Academic",
        "type": "integer",
        "required": False,
        "min": 0,
        "max": 50,
        "description": "Cumulative historical failed courses count",
        "aliases": [
            "failed_subject_count", "failed_subjects_count", "total_failures", "failed_count"
        ]
    },
    # Learning Engagement & Attendance
    "overall_attendance_percentage": {
        "label": "Attendance Percentage",
        "category": "Engagement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Aggregate class attendance rate (0% to 100%)",
        "aliases": [
            "overall_attendance_percentage", "attendance", "attendance_percentage",
            "attendance_rate", "overall_attendance", "attendance %", "present_percentage",
            "class_attendance", "total_attendance", "attendance_pct", "attd_pct", "attd",
            "attd_percentage", "attendance_score"
        ]
    },
    "assignment_completion_rate": {
        "label": "Assignment Completion Rate",
        "category": "Engagement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Percentage of assignments completed on time (0% to 100%)",
        "aliases": [
            "assignment_completion_rate", "assignment_completion", "assignment_rate",
            "assignments_completed", "assignment_percentage", "assignment %", "assignments"
        ]
    },
    "lms_login_count": {
        "label": "LMS Logins",
        "category": "Engagement",
        "type": "integer",
        "required": False,
        "min": 0,
        "description": "Frequency of logins to LMS platform",
        "aliases": [
            "lms_login_count", "lms_logins", "login_count", "portal_logins", "moodle_logins", "logins"
        ]
    },
    "lms_activity_score": {
        "label": "LMS Activity Score",
        "category": "Engagement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Normalized online engagement / module completion score (0-100)",
        "aliases": [
            "lms_activity_score", "lms_activity", "lms_score", "moodle_activity",
            "online_activity", "lms_engagement", "digital_engagement"
        ]
    },
    "class_participation_score": {
        "label": "Class Participation Score",
        "category": "Engagement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "In-class interactive participation rating (0-100)",
        "aliases": [
            "class_participation_score", "participation_score", "class_participation", "participation"
        ]
    },
    "engagement_score": {
        "label": "Overall Engagement Score",
        "category": "Engagement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Campus activities and co-curricular score (0-100)",
        "aliases": [
            "engagement_score", "engagement", "overall_engagement", "campus_engagement", "activity_score"
        ]
    },
    # Placement Preparation
    "aptitude_score": {
        "label": "Aptitude Assessment Score",
        "category": "Placement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Quantitative, logical, and verbal test score (0-100)",
        "aliases": [
            "aptitude_score", "aptitude", "aptitude_test", "quant_score",
            "reasoning_score", "aptitude assessment", "general_aptitude"
        ]
    },
    "coding_score": {
        "label": "Coding Assessment Score",
        "category": "Placement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Data structures & programming assessment score (0-100)",
        "aliases": [
            "coding_score", "coding", "programming_score", "dsa_score",
            "coding_test", "technical_coding", "code_score", "hackathon_score"
        ]
    },
    "technical_interview_score": {
        "label": "Technical Interview Score",
        "category": "Placement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Domain interview evaluation (0-100)",
        "aliases": [
            "technical_interview_score", "tech_interview", "technical_interview", "tech_round_score"
        ]
    },
    "mock_interview_score": {
        "label": "Mock Interview Score",
        "category": "Placement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Simulated interview performance score (0-100)",
        "aliases": [
            "mock_interview_score", "mock_interview", "mock_score",
            "interview_score", "interview_rating", "mock_rating"
        ]
    },
    "communication_score": {
        "label": "Communication Score",
        "category": "Placement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Verbal presentation and language clarity score (0-100)",
        "aliases": [
            "communication_score", "communication", "comm_skills", "verbal_score", "english_score"
        ]
    },
    "technical_skills": {
        "label": "Technical Skills Score",
        "category": "Placement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Core software, engineering, and tooling assessment (0-100)",
        "aliases": [
            "technical_skills", "tech_skills", "technical_skill", "core_tech", "tech_proficiency"
        ]
    },
    "soft_skills": {
        "label": "Soft Skills Score",
        "category": "Placement",
        "type": "float",
        "required": False,
        "min": 0.0,
        "max": 100.0,
        "description": "Teamwork, adaptability, and leadership assessment (0-100)",
        "aliases": [
            "soft_skills", "soft_skill", "behavioral_score", "people_skills", "interpersonal_skills"
        ]
    },
    "placement_status": {
        "label": "Placement Status",
        "category": "Placement",
        "type": "string",
        "required": False,
        "description": "Placed, Unplaced, or In Progress",
        "aliases": [
            "placement_status", "placement", "placed", "placed_status", "job_status", "recruitment_status"
        ]
    },
    # Feedback
    "student_feedback": {
        "label": "Student Feedback Rating",
        "category": "Feedback",
        "type": "float",
        "required": False,
        "min": 1.0,
        "max": 5.0,
        "description": "Student course satisfaction rating (1.0 to 5.0 scale)",
        "aliases": [
            "student_feedback", "student_rating", "student_satisfaction", "course_feedback"
        ]
    },
    "faculty_feedback": {
        "label": "Faculty Feedback Rating",
        "category": "Feedback",
        "type": "float",
        "required": False,
        "min": 1.0,
        "max": 5.0,
        "description": "Faculty assessment and mentor rating (1.0 to 5.0 scale)",
        "aliases": [
            "faculty_feedback", "faculty_rating", "teacher_feedback", "mentor_feedback"
        ]
    }
}

import_audit_history = []

class ImportService:
    @staticmethod
    def get_canonical_fields_metadata():
        """Returns clean list of all canonical fields for frontend mapping review."""
        fields = []
        for key, meta in CANONICAL_FIELDS.items():
            fields.append({
                "key": key,
                "label": meta["label"],
                "category": meta["category"],
                "type": meta["type"],
                "required": meta.get("required", False),
                "description": meta.get("description", ""),
                "min": meta.get("min"),
                "max": meta.get("max")
            })
        return fields

    @staticmethod
    def normalize_header(header: str) -> str:
        """Strips punctuation, underscores, dashes, and extra spaces for matching."""
        if not header:
            return ""
        # Lowercase and replace non-alphanumeric with spaces
        cleaned = re.sub(r'[^a-zA-Z0-9]', ' ', str(header).lower())
        return " ".join(cleaned.split())

    @staticmethod
    def propose_column_mapping(columns: list, sample_df: pd.DataFrame) -> dict:
        """
        Intelligently maps raw columns to canonical fields with confidence scoring.
        Returns: { raw_col: { canonical_field, confidence, detected_type, is_conflict, is_legacy } }
        """
        proposed = {}
        assigned_canonical = {}

        # Precompute normalized alias lookup
        normalized_lookup = {}
        for canonical_key, meta in CANONICAL_FIELDS.items():
            # Exact key
            normalized_lookup[ImportService.normalize_header(canonical_key)] = (canonical_key, 1.0)
            # Aliases
            for alias in meta.get("aliases", []):
                norm_alias = ImportService.normalize_header(alias)
                if norm_alias:
                    normalized_lookup[norm_alias] = (canonical_key, 1.0)

        for col in columns:
            col_str = str(col).strip()
            norm_col = ImportService.normalize_header(col_str)

            # Check if legacy column
            if col_str.lower().startswith("legacy_"):
                proposed[col_str] = {
                    "canonical_field": None,
                    "confidence": 0.0,
                    "detected_type": "legacy",
                    "is_legacy": True,
                    "is_conflict": False,
                    "reason": "Legacy reference column automatically skipped"
                }
                continue

            # Check exact match
            match = None
            confidence = 0.0

            if norm_col in normalized_lookup:
                match, confidence = normalized_lookup[norm_col]
            else:
                # Fuzzy token matching
                col_tokens = set(norm_col.split())
                best_match = None
                best_score = 0.0

                for norm_alias, (canon_key, _) in normalized_lookup.items():
                    alias_tokens = set(norm_alias.split())
                    if alias_tokens and alias_tokens.issubset(col_tokens):
                        score = 0.85
                        if score > best_score:
                            best_score = score
                            best_match = canon_key
                    elif any(t in norm_alias for t in col_tokens if len(t) > 3):
                        score = 0.65
                        if score > best_score:
                            best_score = score
                            best_match = canon_key

                if best_match and best_score >= 0.65:
                    match = best_match
                    confidence = round(best_score, 2)

            # Infer column type from sample
            detected_type = "string"
            if col_str in sample_df.columns:
                series = sample_df[col_str].dropna()
                if not series.empty:
                    if pd.api.types.is_numeric_dtype(series):
                        # Check if integers or floats
                        if (series % 1 == 0).all():
                            detected_type = "integer"
                        else:
                            detected_type = "float"

            # Check if canonical field already claimed
            is_conflict = False
            if match:
                if match in assigned_canonical:
                    # Conflict detected! Two raw columns claim the same canonical field
                    is_conflict = True
                    prev_col = assigned_canonical[match]
                    proposed[prev_col]["is_conflict"] = True
                else:
                    assigned_canonical[match] = col_str

            proposed[col_str] = {
                "canonical_field": match,
                "confidence": confidence,
                "detected_type": detected_type,
                "is_legacy": False,
                "is_conflict": is_conflict,
                "reason": "Matched via synonym" if match else "Unmapped"
            }

        return proposed

    @staticmethod
    def read_csv_safely(file_bytes: bytes, filename: str) -> pd.DataFrame:
        """
        Parses CSV with delimiter sniffing, UTF-8-sig BOM support, and fallback encodings.
        """
        encodings_to_try = ['utf-8-sig', 'utf-8', 'latin1', 'cp1252']
        delimiters_to_try = [',', ';', '\t', '|']

        df = None
        last_error = None

        for encoding in encodings_to_try:
            try:
                # First try pandas default
                decoded_str = file_bytes.decode(encoding)
                
                # Check for empty content
                if not decoded_str.strip():
                    raise ValueError("File is empty.")

                # Try delimiter detection with csv.Sniffer on first 2048 chars
                sample = decoded_str[:4096]
                detected_sep = ','
                try:
                    sniffer = csv.Sniffer()
                    dialect = sniffer.sniff(sample, delimiters=delimiters_to_try)
                    detected_sep = dialect.delimiter
                except Exception:
                    pass

                # Read into pandas
                df = pd.read_csv(
                    io.StringIO(decoded_str),
                    sep=detected_sep,
                    skipinitialspace=True,
                    engine='python'
                )
                
                # Clean column names (strip whitespace and drop completely empty unnamed cols)
                df.columns = [str(c).strip() for c in df.columns]
                unnamed_empty = [c for c in df.columns if c.startswith('Unnamed:') and df[c].isnull().all()]
                if unnamed_empty:
                    df = df.drop(columns=unnamed_empty)
                
                if df is not None and not df.empty:
                    break
            except Exception as e:
                last_error = e
                continue

        if df is None or df.empty:
            raise ValueError(f"Could not parse CSV file: {str(last_error or 'Empty or invalid content')}")

        return df

    @staticmethod
    def validate_and_profile_data(df: pd.DataFrame, mapping: dict, mode: str = "upsert") -> dict:
        """
        Validates the mapped DataFrame against canonical rules and existing database IDs.
        Returns a rich validation report with row-level issues and statistics.
        """
        # Inverse mapping: source_col -> canonical_field
        active_mapping = {
            src: canon for src, canon in mapping.items()
            if canon and canon in CANONICAL_FIELDS
        }

        total_rows = len(df)
        issues = []
        file_student_ids = []
        valid_row_indices = []

        # Check required fields
        has_id_mapping = any(c == 'student_id' for c in active_mapping.values())
        has_name_mapping = any(c == 'student_name' for c in active_mapping.values())

        id_col = next((src for src, c in active_mapping.items() if c == 'student_id'), None)
        name_col = next((src for src, c in active_mapping.items() if c == 'student_name'), None)

        if not has_id_mapping:
            issues.append({
                "row": 0,
                "field": "student_id",
                "value": None,
                "reason": "Missing required mapping for Student ID",
                "severity": "critical"
            })

        # Fetch existing student IDs from Supabase to check conflicts / updates
        existing_db_ids = set()
        try:
            client = get_supabase()
            res = client.table('raw_students_csv').select('student_id').execute()
            if res.data:
                existing_db_ids = {str(r.get('student_id')) for r in res.data if r.get('student_id')}
        except Exception:
            pass

        seen_file_ids = set()
        duplicate_file_ids = set()

        # Row-level validation
        for idx, row in df.iterrows():
            row_num = idx + 1
            row_has_error = False

            # Check student_id
            if id_col:
                val = row.get(id_col)
                if pd.isnull(val) or str(val).strip() == "" or str(val).lower() == "nan":
                    issues.append({
                        "row": row_num,
                        "field": "student_id",
                        "value": str(val),
                        "reason": "Student ID is required but missing or empty",
                        "severity": "error"
                    })
                    row_has_error = True
                else:
                    sid = str(val).strip()
                    file_student_ids.append(sid)
                    if sid in seen_file_ids:
                        duplicate_file_ids.add(sid)
                        issues.append({
                            "row": row_num,
                            "field": "student_id",
                            "value": sid,
                            "reason": f"Duplicate Student ID '{sid}' within the file",
                            "severity": "warning"
                        })
                    seen_file_ids.add(sid)

            # Check student_name
            if name_col:
                n_val = row.get(name_col)
                if pd.isnull(n_val) or str(n_val).strip() == "":
                    issues.append({
                        "row": row_num,
                        "field": "student_name",
                        "value": None,
                        "reason": "Student Name is required but missing",
                        "severity": "error"
                    })
                    row_has_error = True

            # Validate numeric bounds on mapped fields
            for src_col, canon_field in active_mapping.items():
                if canon_field in ['student_id', 'student_name']:
                    continue

                raw_val = row.get(src_col)
                if pd.isnull(raw_val) or str(raw_val).strip() in ['', 'nan', 'null', 'None']:
                    continue  # Missing values are allowed, not penalized as zero

                meta = CANONICAL_FIELDS.get(canon_field, {})
                f_type = meta.get("type")

                if f_type in ["float", "integer"]:
                    try:
                        num_val = float(raw_val)
                        if math.isnan(num_val):
                            continue

                        # Check range limits
                        f_min = meta.get("min")
                        f_max = meta.get("max")

                        if f_min is not None and num_val < f_min:
                            issues.append({
                                "row": row_num,
                                "field": canon_field,
                                "value": num_val,
                                "reason": f"Value {num_val} is below minimum allowed {f_min}",
                                "severity": "warning"
                            })
                        elif f_max is not None and num_val > f_max:
                            issues.append({
                                "row": row_num,
                                "field": canon_field,
                                "value": num_val,
                                "reason": f"Value {num_val} exceeds maximum allowed {f_max}",
                                "severity": "warning"
                            })
                    except (ValueError, TypeError):
                        issues.append({
                            "row": row_num,
                            "field": canon_field,
                            "value": str(raw_val),
                            "reason": f"Invalid numeric format for field '{canon_field}'",
                            "severity": "error"
                        })
                        row_has_error = True

            if not row_has_error:
                valid_row_indices.append(idx)

        # Calculate counts
        valid_rows = len(valid_row_indices)
        invalid_rows = total_rows - valid_rows

        new_students_count = 0
        existing_students_count = 0

        for sid in seen_file_ids:
            if sid in existing_db_ids:
                existing_students_count += 1
            else:
                new_students_count += 1

        mapped_canonical = list(set(active_mapping.values()))
        missing_canonical = [
            k for k in CANONICAL_FIELDS.keys()
            if k not in mapped_canonical and k not in ['gender', 'age', 'enrollment_status', 'program']
        ]

        # Determine import predictions based on mode
        predicted_inserts = new_students_count
        predicted_updates = existing_students_count if mode == "upsert" else 0
        predicted_skipped = existing_students_count if mode == "insert_only" else 0

        return {
            "total_rows": total_rows,
            "valid_rows": valid_rows,
            "invalid_rows": invalid_rows,
            "new_students_count": new_students_count,
            "existing_students_count": existing_students_count,
            "file_duplicates_count": len(duplicate_file_ids),
            "predicted_inserts": predicted_inserts,
            "predicted_updates": predicted_updates,
            "predicted_skipped": predicted_skipped,
            "mapped_canonical": mapped_canonical,
            "missing_canonical": missing_canonical,
            "issues": issues[:60], # Top 60 row-level issues
            "total_issues_count": len(issues),
            "has_critical_error": not has_id_mapping
        }

    @staticmethod
    def precalculate_and_commit(df: pd.DataFrame, mapping: dict, mode: str = "upsert", import_partial: bool = True, client=None) -> dict:
        """
        1. Maps and normalizes raw records.
        2. Vectorized / batch calculation of Student Success Score, Academic Score,
           Engagement Score, Placement Score, Risk Flags, and Segments via ScoringEngine.
        3. Commits to Supabase database in bounded batches.
        4. Logs execution audit history.
        """
        start_time = time.time()
        if client is None:
            client = get_supabase()

        active_mapping = {
            src: canon for src, canon in mapping.items()
            if canon and canon in CANONICAL_FIELDS
        }

        # Filter out rows missing student_id
        id_col = next((src for src, c in active_mapping.items() if c == 'student_id'), None)
        name_col = next((src for src, c in active_mapping.items() if c == 'student_name'), None)

        if not id_col:
            raise ValueError("Student ID mapping is missing.")

        clean_records = []
        errors = []
        skipped_count = 0

        # Existing IDs for insert_only mode
        existing_db_ids = set()
        try:
            res = client.table('raw_students_csv').select('student_id').execute()
            if res and hasattr(res, 'data') and res.data:
                existing_db_ids = {str(r.get('student_id')) for r in res.data if r.get('student_id')}
        except Exception:
            pass

        seen_ids = set()

        for idx, row in df.iterrows():
            sid_raw = row.get(id_col)
            if pd.isnull(sid_raw) or str(sid_raw).strip() == "" or str(sid_raw).lower() == "nan":
                if not import_partial:
                    raise ValueError(f"Row {idx + 1} has empty Student ID.")
                continue

            # Preserve integer ID if numeric
            if isinstance(sid_raw, (int, float)) and not math.isnan(sid_raw) and int(sid_raw) == sid_raw:
                sid = int(sid_raw)
            else:
                sid = str(sid_raw).strip()

            # Handle intra-file duplicate by keeping latest row
            if str(sid) in seen_ids:
                clean_records = [r for r in clean_records if str(r.get('student_id')) != str(sid)]
            seen_ids.add(str(sid))

            if mode == "insert_only" and str(sid) in existing_db_ids:
                skipped_count += 1
                continue

            # Construct canonical record
            record = {"student_id": sid}

            # Map student name
            if name_col and not pd.isnull(row.get(name_col)):
                record["student_name"] = str(row.get(name_col)).strip()
            else:
                record["student_name"] = "Unknown"

            # Map other fields
            for src_col, canon_field in active_mapping.items():
                if canon_field in ['student_id', 'student_name']:
                    continue

                raw_val = row.get(src_col)
                if pd.isnull(raw_val) or str(raw_val).strip() in ['', 'nan', 'null', 'None']:
                    continue

                meta = CANONICAL_FIELDS.get(canon_field, {})
                f_type = meta.get("type")

                try:
                    if f_type == "float":
                        v = float(raw_val)
                        if not math.isnan(v):
                            record[canon_field] = round(v, 2)
                    elif f_type == "integer":
                        v = float(raw_val)
                        if not math.isnan(v):
                            record[canon_field] = int(v)
                    else:
                        record[canon_field] = str(raw_val).strip()
                except Exception:
                    pass

            # Precalculate Scores using existing authoritative ScoringEngine
            scores = ScoringEngine.calculate_success_score(record)

            record["success_score"] = scores.get("success_score")
            record["academic_score"] = scores.get("academic_score")
            record["engagement_score"] = scores.get("engagement_score")
            record["placement_score"] = scores.get("placement_score")
            
            # Risk levels
            acad = scores.get("academic_score")
            place = scores.get("placement_score")
            
            acad_risk = "High" if (acad is not None and acad < 60) else ("Medium" if (acad is not None and acad < 75) else "Low")
            place_risk = "High" if (place is not None and place < 60) else ("Medium" if (place is not None and place < 75) else "Low")
            
            overall_risk = "High" if (acad_risk == "High" or place_risk == "High") else ("Medium" if (acad_risk == "Medium" or place_risk == "Medium") else "Low")

            record["academic_risk_level"] = acad_risk
            record["placement_risk_level"] = place_risk
            record["overall_risk_level"] = overall_risk

            # Formulate risk factors summary string
            factors = []
            if acad is not None and acad < 60:
                factors.append("Low Academic Progress")
            if place is not None and place < 60:
                factors.append("Low Placement Readiness")
            if record.get("overall_attendance_percentage") and record.get("overall_attendance_percentage") < 75:
                factors.append("Low Attendance")
            if record.get("backlog_count") and record.get("backlog_count") > 0:
                factors.append("Active Backlogs")
            record["risk_factors"] = ", ".join(factors) if factors else "None"

            # Segment assignment
            eng = scores.get("engagement_score")
            if acad is not None and acad > 75 and place is not None and place < 60:
                seg = "Strong Academics, Weak Placement"
            elif place is not None and place > 75 and acad is not None and acad < 60:
                seg = "Strong Placement, Weak Academics"
            elif eng is not None and eng < 50 and acad is not None and acad > 60:
                seg = "Low Engagement, Decent Academics"
            else:
                seg = "Standard"
            record["segment"] = seg

            now_str = datetime.now().strftime("%Y-%m-%d")
            record["last_updated"] = now_str

            clean_records.append(record)

        # Batch insert into Supabase with row-by-row fallback
        batch_size = 50
        processed_count = 0
        inserted_count = 0
        updated_count = 0

        for i in range(0, len(clean_records), batch_size):
            batch = clean_records[i:i + batch_size]
            try:
                client.table('raw_students_csv').insert(batch).execute()
                for rec in batch:
                    if str(rec['student_id']) in existing_db_ids:
                        updated_count += 1
                    else:
                        inserted_count += 1
                processed_count += len(batch)
            except Exception as e:
                # Fallback to row-by-row for the batch
                for rec in batch:
                    sid_val = rec.get('student_id')
                    try:
                        client.table('raw_students_csv').insert(rec).execute()
                        if str(rec['student_id']) in existing_db_ids:
                            updated_count += 1
                        else:
                            inserted_count += 1
                        processed_count += 1
                    except Exception as inner_e:
                        error_str = str(inner_e).lower()
                        if "duplicate" in error_str or "unique constraint" in error_str or "already exists" in error_str or "23505" in error_str:
                            errors.append(f"Student {sid_val} already exists (Conflict).")
                        else:
                            errors.append(f"Failed to insert {sid_val}: {str(inner_e)}")

        duration_ms = round((time.time() - start_time) * 1000, 1)

        summary = {
            "status": "success" if (processed_count > 0 or (len(clean_records) == 0 and skipped_count > 0)) else "failed",
            "rows_read": len(df),
            "rows_processed": processed_count,
            "rows_inserted": inserted_count,
            "rows_updated": updated_count,
            "rows_skipped": skipped_count,
            "rows_rejected": len(df) - (processed_count + skipped_count),
            "mapped_fields_count": len(active_mapping),
            "duration_ms": duration_ms,
            "timestamp": datetime.now().isoformat(),
            "errors": errors[:10]
        }

        # Save to audit history
        import_audit_history.append(summary)

        return summary

        return summary
