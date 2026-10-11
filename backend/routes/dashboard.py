from flask import Blueprint, jsonify
from services.data_service import DataService

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/summary", methods=["GET"])
def get_summary():
    try:
        try:
            from flask import request
            department = request.args.get("department")
            semester = request.args.get("semester")
            
            all_records = DataService.get_joined_students()
            records = []
            for r in all_records:
                if department and str(r.get('department')).lower() != department.lower():
                    continue
                if semester and str(r.get('semester')).lower() != semester.lower():
                    continue
                records.append(r)
            
            if not records:
                return jsonify({"has_data": False}), 200
                
            total_students = len(records)
            sum_success = 0
            count_success = 0
            
            sum_attendance = 0
            count_attendance = 0
            
            # Health Indicators
            sum_assign = 0
            count_assign = 0
            sum_lms = 0
            count_lms = 0
            sum_eng = 0
            count_eng = 0
            
            # Feedback
            feedback_counts = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
            
            # Distribution
            distribution = {"0-49": 0, "50-59": 0, "60-69": 0, "70-79": 0, "80-89": 0, "90-100": 0}
            
            # Dept comparisons
            dept_stats = {}
            
            # Semester stats
            sem_stats = {}
            
            priority_queue = []
            
            for r in records:
                # Basic
                success_score = r.get('success_score')
                if success_score is not None:
                    sum_success += success_score
                    count_success += 1
                    
                    if success_score < 50: distribution["0-49"] += 1
                    elif success_score < 60: distribution["50-59"] += 1
                    elif success_score < 70: distribution["60-69"] += 1
                    elif success_score < 80: distribution["70-79"] += 1
                    elif success_score < 90: distribution["80-89"] += 1
                    else: distribution["90-100"] += 1
                    
                attendance = r.get('attendance_rate')
                if attendance is not None:
                    sum_attendance += float(attendance)
                    count_attendance += 1
                    
                raw = r.get('raw_data', {})
                assign = raw.get('assignment_completion_rate')
                if assign is not None:
                    sum_assign += float(assign)
                    count_assign += 1
                    
                lms = raw.get('lms_activity_score')
                if lms is not None:
                    sum_lms += float(lms)
                    count_lms += 1
                    
                eng = raw.get('engagement_score')
                if eng is not None:
                    sum_eng += float(eng)
                    count_eng += 1
                    
                fb = raw.get('student_feedback')
                if fb is not None:
                    fb_val = str(int(float(fb)))
                    if fb_val in feedback_counts:
                        feedback_counts[fb_val] += 1
                        
                # Dept stats
                dept = r.get('department', 'Unknown')
                if dept not in dept_stats:
                    dept_stats[dept] = {'sum_acad': 0, 'cnt_acad': 0, 'sum_place': 0, 'cnt_place': 0}
                
                acad = r.get('academic_score')
                if acad is not None:
                    dept_stats[dept]['sum_acad'] += acad
                    dept_stats[dept]['cnt_acad'] += 1
                    
                place = r.get('placement_score')
                if place is not None:
                    dept_stats[dept]['sum_place'] += place
                    dept_stats[dept]['cnt_place'] += 1
                    
                # Semester stats
                sem = str(r.get('semester', 'Unknown'))
                if sem not in sem_stats:
                    sem_stats[sem] = {'sum_score': 0, 'cnt_score': 0}
                if success_score is not None:
                    sem_stats[sem]['sum_score'] += success_score
                    sem_stats[sem]['cnt_score'] += 1
                    
                # Priority queue
                if acad is not None and acad < 60:
                    priority_queue.append({
                        "id": r['id'],
                        "name": r.get('name', 'Unknown'),
                        "reason": "Academic Risk",
                        "score": round(acad, 1)
                    })
                elif place is not None and place < 60:
                    priority_queue.append({
                        "id": r['id'],
                        "name": r.get('name', 'Unknown'),
                        "reason": "Placement Risk",
                        "score": round(place, 1)
                    })
                    
            avg_success = (sum_success / count_success) if count_success > 0 else None
            
            # Format outputs
            health_indicators = [
                {"name": "Attendance", "value": round(sum_attendance/count_attendance, 1) if count_attendance else 0},
                {"name": "Assignments", "value": round(sum_assign/count_assign, 1) if count_assign else 0},
                {"name": "LMS Activity", "value": round(sum_lms/count_lms, 1) if count_lms else 0},
                {"name": "Engagement", "value": round(sum_eng/count_eng, 1) if count_eng else 0}
            ]
            
            semester_trends = [
                {"name": sem, "score": round(stats['sum_score']/stats['cnt_score'], 1) if stats['cnt_score'] else 0}
                for sem, stats in sorted(sem_stats.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 999)
            ]
            
            dist_list = [{"name": k, "count": v} for k, v in distribution.items()]
            
            feedback_list = [{"rating": f"{k} Stars", "count": v} for k, v in feedback_counts.items()]
            
            dept_comparisons = [
                {
                    "name": dept, 
                    "academic": round(stats['sum_acad']/stats['cnt_acad'], 1) if stats['cnt_acad'] else 0,
                    "placement": round(stats['sum_place']/stats['cnt_place'], 1) if stats['cnt_place'] else 0
                }
                for dept, stats in dept_stats.items()
            ]
            
            expected_fields = [
                'cgpa', 'backlog_count', 'overall_attendance_percentage',
                'assignment_completion_rate', 'lms_activity_score', 'engagement_score',
                'coding_score', 'aptitude_score', 'mock_interview_score',
                'technical_skills', 'soft_skills'
            ]
            
            total_expected = 0
            total_populated = 0
            
            for r in records:
                raw = r.get('raw_data', {})
                for field in expected_fields:
                    total_expected += 1
                    val = raw.get(field)
                    if val is not None and str(val).strip() != "" and str(val).lower() != "nan":
                        total_populated += 1
                        
            data_completeness = round((total_populated / total_expected) * 100) if total_expected > 0 else 0

            return jsonify({
                "has_data": True,
                "metrics": {
                    "totalStudentsAnalyzed": total_students,
                    "averageSuccessScore": round(avg_success, 1) if avg_success else None,
                    "academicSupportReviews": sum(1 for r in records if r.get('academic_score') is not None and r['academic_score'] < 60),
                    "placementSupportReviews": sum(1 for r in records if r.get('placement_score') is not None and r['placement_score'] < 60),
                    "dataCompleteness": data_completeness,
                },
                "charts": {
                    "health": health_indicators,
                    "semester": semester_trends,
                    "distribution": dist_list,
                    "feedback": feedback_list,
                    "departments": dept_comparisons
                },
                "priority_queue": sorted(priority_queue, key=lambda x: x['score'])[:10]
            }), 200
            
        except Exception as query_err:
            return jsonify({
                "has_data": False,
                "error": "Database error",
                "details": str(query_err)
            }), 200
            
    except Exception as e:
        return jsonify({"has_data": False, "error": str(e)}), 200
