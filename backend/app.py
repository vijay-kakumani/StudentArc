import re
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.imports import imports_bp
from routes.students import students_bp
from routes.dashboard import dashboard_bp
from routes.interventions import interventions_bp
from routes.reports import reports_bp

def create_app():
    Config.validate()
    
    app = Flask(__name__)
    app.config.from_object(Config)
    
    origins = [Config.FRONTEND_ORIGIN] if Config.FRONTEND_ORIGIN and Config.FRONTEND_ORIGIN != "*" else "*"
    if isinstance(origins, list):
        origins.extend([
            "https://student-arc.vercel.app",
            "https://studentarc.vercel.app",
            re.compile(r"^https://.*\.vercel\.app$"),
            "http://localhost:5173", "http://127.0.0.1:5173",
            "http://localhost:5174", "http://127.0.0.1:5174",
            "http://localhost:5000", "http://127.0.0.1:5000",
            "http://localhost:3000", "http://127.0.0.1:3000"
        ])
        seen = set()
        deduped = []
        for o in origins:
            key = o.pattern if hasattr(o, 'pattern') else o
            if key not in seen:
                seen.add(key)
                deduped.append(o)
        origins = deduped
    CORS(app, resources={r"/api/*": {"origins": origins}})
    
    # Register blueprints
    app.register_blueprint(imports_bp, url_prefix="/api/imports")
    app.register_blueprint(students_bp, url_prefix="/api/students")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(interventions_bp, url_prefix="/api/interventions")
    app.register_blueprint(reports_bp, url_prefix="/api")
    
    @app.route("/api/health")
    def health_check():
        try:
            from supabase_client import get_supabase
            client = get_supabase()
            
            # Check required source tables
            try:
                res1 = client.table('raw_students_csv').select('student_id', count='exact').limit(1).execute()
                res2 = client.table('raw_indicators_csv').select('indicator_id', count='exact').limit(1).execute()
                
                return jsonify({
                    "status": "healthy",
                    "database": "connected",
                    "tables": "available"
                }), 200
            except Exception as e:
                error_str = str(e)
                if "relation" in error_str or "Could not find the table" in error_str:
                    return jsonify({
                        "status": "degraded",
                        "database": "connected",
                        "tables": "missing",
                        "error": "Required source tables (raw_students_csv, raw_indicators_csv) are not available."
                    }), 200
                raise e

        except Exception as e:
            error_str = str(e)
            if "Supabase credentials are not configured" in error_str:
                return jsonify({
                    "status": "degraded",
                    "database": "unconfigured",
                    "error": "Database credentials missing in environment."
                }), 200
            
            return jsonify({
                "status": "unhealthy",
                "database": "error",
                "error": "Failed to connect to database."
            }), 500

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)