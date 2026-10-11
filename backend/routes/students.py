from flask import Blueprint, jsonify, request
from services.data_service import DataService

students_bp = Blueprint("students", __name__)

@students_bp.route("/", methods=["GET"])
def get_students():
    try:
        # Extract filters
        department = request.args.get("department")
        semester = request.args.get("semester")
        search = request.args.get("search")
        
        all_students = DataService.get_joined_students()
        
        # Apply filters
        filtered = []
        for s in all_students:
            if department and str(s.get('department')).lower() != department.lower():
                continue
            if semester and str(s.get('semester')).lower() != semester.lower():
                continue
            if search and search.lower() not in str(s.get('name', '')).lower() and search.lower() not in str(s.get('id', '')).lower():
                continue
            filtered.append(s)
            
        return jsonify({
            "data": filtered,
            "count": len(filtered)
        }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@students_bp.route("/<student_id>", methods=["GET"])
def get_student(student_id):
    try:
        all_students = DataService.get_joined_students()
        student = next((s for s in all_students if str(s.get('id')) == str(student_id)), None)
        
        if not student:
            return jsonify({"error": "Student not found"}), 404
            
        return jsonify({"data": student}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@students_bp.route("/<student_id>/brief", methods=["GET"])
def get_student_brief(student_id):
    try:
        from services.ai_service import AIBriefService
        all_students = DataService.get_joined_students()
        student = next((s for s in all_students if str(s.get('id')) == str(student_id)), None)
        
        if not student:
            return jsonify({"error": "Student not found"}), 404
            
        brief = AIBriefService.generate_brief(student)
        return jsonify({"data": brief}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
