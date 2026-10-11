from flask import Blueprint, jsonify, request
from services.data_service import DataService

reports_bp = Blueprint("reports", __name__)

@reports_bp.route("/<report_type>/summary", methods=["GET"])
@reports_bp.route("/<report_type>", methods=["GET"])
def get_report(report_type):
    try:
        records = DataService.get_joined_students()
        if not records:
            return jsonify({"has_data": False}), 200

        # Apply common filters
        department = request.args.get("department")
        semester = request.args.get("semester")
        
        filtered = []
        for r in records:
            if department and str(r.get('department')).lower() != department.lower():
                continue
            if semester and str(r.get('semester')).lower() != semester.lower():
                continue
            filtered.append(r)
            
        records = filtered

        if report_type == "attendance":
            # Attendance logic
            sum_att = sum(float(r['attendance_rate']) for r in records if r.get('attendance_rate') is not None)
            count_att = sum(1 for r in records if r.get('attendance_rate') is not None)
            avg_att = sum_att / count_att if count_att else 0
            
            low_attendance = [r for r in records if r.get('attendance_rate') is not None and float(r['attendance_rate']) < 75]
            
            return jsonify({
                "has_data": True,
                "metrics": {
                    "averageAttendance": round(avg_att, 1),
                    "lowAttendanceCount": len(low_attendance),
                    "totalStudents": len(records)
                },
                "flagged_students": sorted(low_attendance, key=lambda x: float(x['attendance_rate']))[:50]
            }), 200

        elif report_type == "academic-performance":
            sum_acad = sum(r['academic_score'] for r in records if r.get('academic_score') is not None)
            count_acad = sum(1 for r in records if r.get('academic_score') is not None)
            
            return jsonify({
                "has_data": True,
                "metrics": {
                    "averageAcademicScore": round(sum_acad/count_acad, 1) if count_acad else None,
                    "totalStudents": len(records)
                }
            }), 200

        elif report_type == "at-risk-students":
            at_risk = [r for r in records if (r.get('academic_score') is not None and r['academic_score'] < 60) or (r.get('placement_score') is not None and r['placement_score'] < 60)]
            
            return jsonify({
                "has_data": True,
                "metrics": {
                    "atRiskCount": len(at_risk),
                    "totalStudents": len(records)
                },
                "students": sorted(at_risk, key=lambda x: min(x.get('academic_score', 100), x.get('placement_score', 100)))[:50]
            }), 200

        elif report_type == "placement-readiness":
            sum_place = sum(r['placement_score'] for r in records if r.get('placement_score') is not None)
            count_place = sum(1 for r in records if r.get('placement_score') is not None)
            
            return jsonify({
                "has_data": True,
                "metrics": {
                    "averagePlacementScore": round(sum_place/count_place, 1) if count_place else None,
                    "totalStudents": len(records)
                }
            }), 200

        elif report_type == "student-segments":
            # strong academic (>75) with weak placement (<60)
            strong_acad_weak_place = [
                r for r in records 
                if r.get('academic_score') and r['academic_score'] > 75
                and r.get('placement_score') and r['placement_score'] < 60
            ]
            
            # strong placement (>75) with weak academic (<60)
            strong_place_weak_acad = [
                r for r in records 
                if r.get('placement_score') and r['placement_score'] > 75
                and r.get('academic_score') and r['academic_score'] < 60
            ]
            
            # low engagement (<50) but decent academic (>60)
            low_eng_decent_acad = [
                r for r in records 
                if r.get('engagement_score') and r['engagement_score'] < 50
                and r.get('academic_score') and r['academic_score'] > 60
            ]

            return jsonify({
                "has_data": True,
                "metrics": {
                    "strongAcadWeakPlacement": len(strong_acad_weak_place),
                    "strongPlacementWeakAcad": len(strong_place_weak_acad),
                    "lowEngagementDecentAcad": len(low_eng_decent_acad),
                    "totalStudents": len(records)
                },
                "segments": {
                    "strongAcadWeakPlacement": strong_acad_weak_place,
                    "strongPlacementWeakAcad": strong_place_weak_acad,
                    "lowEngagementDecentAcad": low_eng_decent_acad,
                    "totalStudents": records
                }
            }), 200

        elif report_type == "reports":
            total_students = len(records)
            sum_success, count_success = 0, 0
            sum_acad, count_acad = 0, 0
            sum_place, count_place = 0, 0
            sum_eng, count_eng = 0, 0
            sum_att, count_att = 0, 0
            sum_cgpa, count_cgpa = 0, 0

            # Distributions
            dist_success = {"0-49": 0, "50-59": 0, "60-69": 0, "70-79": 0, "80-89": 0, "90-100": 0}
            dist_acad = {"0-39": 0, "40-59": 0, "60-79": 0, "80-100": 0}
            dist_place = {"0-39": 0, "40-59": 0, "60-79": 0, "80-100": 0}

            # Quadrant
            both_risk = 0
            acad_only = 0
            place_only = 0
            on_track = 0

            # Competency accumulators
            comp_sums = {"coding": 0, "aptitude": 0, "mock_interview": 0, "technical_skills": 0, "soft_skills": 0}
            comp_counts = {"coding": 0, "aptitude": 0, "mock_interview": 0, "technical_skills": 0, "soft_skills": 0}

            # Dept & Sem stats
            dept_map = {}
            sem_map = {}

            # Field completeness trackers
            expected_fields = [
                ('cgpa', 'CGPA', 'Academic'),
                ('backlog_count', 'Active Backlogs', 'Academic'),
                ('overall_attendance_percentage', 'Attendance Rate', 'Engagement'),
                ('assignment_completion_rate', 'Assignment Completion', 'Engagement'),
                ('lms_activity_score', 'LMS Activity', 'Engagement'),
                ('engagement_score', 'Engagement Score', 'Engagement'),
                ('coding_score', 'Coding Score', 'Placement'),
                ('aptitude_score', 'Aptitude Score', 'Placement'),
                ('mock_interview_score', 'Mock Interview', 'Placement'),
                ('technical_skills', 'Technical Skills', 'Placement'),
                ('soft_skills', 'Soft Skills', 'Placement')
            ]
            field_populated = {f[0]: 0 for f in expected_fields}

            formatted_students = []

            for r in records:
                s_score = r.get('success_score')
                a_score = r.get('academic_score')
                p_score = r.get('placement_score')
                e_score = r.get('engagement_score')
                raw = r.get('raw_data', {})
                att = r.get('attendance_rate') or raw.get('overall_attendance_percentage')
                cgpa = raw.get('cgpa')

                if s_score is not None:
                    sum_success += float(s_score)
                    count_success += 1
                    if s_score < 50: dist_success["0-49"] += 1
                    elif s_score < 60: dist_success["50-59"] += 1
                    elif s_score < 70: dist_success["60-69"] += 1
                    elif s_score < 80: dist_success["70-79"] += 1
                    elif s_score < 90: dist_success["80-89"] += 1
                    else: dist_success["90-100"] += 1

                if a_score is not None:
                    sum_acad += float(a_score)
                    count_acad += 1
                    if a_score < 40: dist_acad["0-39"] += 1
                    elif a_score < 60: dist_acad["40-59"] += 1
                    elif a_score < 80: dist_acad["60-79"] += 1
                    else: dist_acad["80-100"] += 1

                if p_score is not None:
                    sum_place += float(p_score)
                    count_place += 1
                    if p_score < 40: dist_place["0-39"] += 1
                    elif p_score < 60: dist_place["40-59"] += 1
                    elif p_score < 80: dist_place["60-79"] += 1
                    else: dist_place["80-100"] += 1

                if e_score is not None:
                    sum_eng += float(e_score)
                    count_eng += 1

                if att is not None:
                    try:
                        sum_att += float(att)
                        count_att += 1
                    except (ValueError, TypeError):
                        pass

                if cgpa is not None:
                    try:
                        sum_cgpa += float(cgpa)
                        count_cgpa += 1
                    except (ValueError, TypeError):
                        pass

                is_acad_risk = (a_score is not None and a_score < 60)
                is_place_risk = (p_score is not None and p_score < 60)

                if is_acad_risk and is_place_risk:
                    both_risk += 1
                elif is_acad_risk:
                    acad_only += 1
                elif is_place_risk:
                    place_only += 1
                else:
                    on_track += 1

                # Competencies
                for comp, key in [('coding', 'coding_score'), ('aptitude', 'aptitude_score'),
                                  ('mock_interview', 'mock_interview_score'),
                                  ('technical_skills', 'technical_skills'), ('soft_skills', 'soft_skills')]:
                    c_val = raw.get(key)
                    if c_val is not None:
                        try:
                            comp_sums[comp] += float(c_val)
                            comp_counts[comp] += 1
                        except (ValueError, TypeError):
                            pass

                # Dept aggregation
                d_name = r.get('department') or 'General'
                if d_name not in dept_map:
                    dept_map[d_name] = {'total': 0, 'sum_s': 0, 'cnt_s': 0, 'sum_a': 0, 'cnt_a': 0, 'sum_p': 0, 'cnt_p': 0, 'acad_flag': 0, 'place_flag': 0}
                dm = dept_map[d_name]
                dm['total'] += 1
                if s_score is not None: dm['sum_s'] += s_score; dm['cnt_s'] += 1
                if a_score is not None: dm['sum_a'] += a_score; dm['cnt_a'] += 1
                if p_score is not None: dm['sum_p'] += p_score; dm['cnt_p'] += 1
                if is_acad_risk: dm['acad_flag'] += 1
                if is_place_risk: dm['place_flag'] += 1

                # Sem aggregation
                s_sem = str(r.get('semester') or 'Unknown')
                if s_sem not in sem_map:
                    sem_map[s_sem] = {'total': 0, 'sum_s': 0, 'cnt_s': 0, 'sum_a': 0, 'cnt_a': 0, 'sum_p': 0, 'cnt_p': 0}
                sm = sem_map[s_sem]
                sm['total'] += 1
                if s_score is not None: sm['sum_s'] += s_score; sm['cnt_s'] += 1
                if a_score is not None: sm['sum_a'] += a_score; sm['cnt_a'] += 1
                if p_score is not None: sm['sum_p'] += p_score; sm['cnt_p'] += 1

                # Completeness fields
                for f_name, _, _ in expected_fields:
                    val = raw.get(f_name)
                    if val is not None and str(val).strip() != "" and str(val).lower() != "nan":
                        field_populated[f_name] += 1

                # Compact student record for reports table
                formatted_students.append({
                    "id": r.get('id'),
                    "name": r.get('name', 'Unknown'),
                    "department": r.get('department', 'Unknown'),
                    "semester": str(r.get('semester', '')),
                    "success_score": s_score,
                    "academic_score": a_score,
                    "placement_score": p_score,
                    "engagement_score": e_score,
                    "attendance_rate": att,
                    "cgpa": cgpa,
                    "backlog_count": raw.get('backlog_count', 0),
                    "coding_score": raw.get('coding_score'),
                    "aptitude_score": raw.get('aptitude_score'),
                    "mock_interview_score": raw.get('mock_interview_score'),
                    "placement_status": raw.get('placement_status', 'Pending'),
                    "is_academic_risk": is_acad_risk,
                    "is_placement_risk": is_place_risk,
                    "flags": r.get('scores', {}).get('flags', []),
                    "segment": raw.get('segment') or ('High Achiever' if s_score and s_score >= 80 else 'Standard Cohort')
                })

            total_expected_checks = total_students * len(expected_fields)
            total_populated_checks = sum(field_populated.values())
            data_completeness = round((total_populated_checks / total_expected_checks * 100)) if total_expected_checks else 0

            # Build response
            return jsonify({
                "has_data": True,
                "metrics": {
                    "totalStudents": total_students,
                    "studentsAnalyzed": count_success,
                    "academicSupportReviews": sum(1 for s in formatted_students if s['is_academic_risk']),
                    "placementSupportReviews": sum(1 for s in formatted_students if s['is_placement_risk']),
                    "bothSupportReviews": both_risk,
                    "averageSuccessScore": round(sum_success / count_success, 1) if count_success else None,
                    "averageAcademicScore": round(sum_acad / count_acad, 1) if count_acad else None,
                    "averagePlacementScore": round(sum_place / count_place, 1) if count_place else None,
                    "averageEngagementScore": round(sum_eng / count_eng, 1) if count_eng else None,
                    "averageAttendance": round(sum_att / count_att, 1) if count_att else None,
                    "averageCGPA": round(sum_cgpa / count_cgpa, 2) if count_cgpa else None,
                    "dataCompleteness": data_completeness,
                },
                "distributions": {
                    "success": [{"range": k, "count": v} for k, v in dist_success.items()],
                    "academic": [{"range": k, "count": v} for k, v in dist_acad.items()],
                    "placement": [{"range": k, "count": v} for k, v in dist_place.items()],
                    "risk_quadrant": [
                        {"name": "Both at Risk", "count": both_risk, "color": "#F47735"},
                        {"name": "Academic Risk Only", "count": acad_only, "color": "#FFB080"},
                        {"name": "Placement Risk Only", "count": place_only, "color": "#8793A5"},
                        {"name": "Good Standing", "count": on_track, "color": "#172B4D"}
                    ]
                },
                "departments": [
                    {
                        "name": d,
                        "student_count": dm['total'],
                        "avg_success": round(dm['sum_s'] / dm['cnt_s'], 1) if dm['cnt_s'] else 0,
                        "avg_academic": round(dm['sum_a'] / dm['cnt_a'], 1) if dm['cnt_a'] else 0,
                        "avg_placement": round(dm['sum_p'] / dm['cnt_p'], 1) if dm['cnt_p'] else 0,
                        "academic_flagged": dm['acad_flag'],
                        "placement_flagged": dm['place_flag']
                    }
                    for d, dm in dept_map.items()
                ],
                "semesters": [
                    {
                        "semester": sem,
                        "student_count": sm['total'],
                        "avg_success": round(sm['sum_s'] / sm['cnt_s'], 1) if sm['cnt_s'] else 0,
                        "avg_academic": round(sm['sum_a'] / sm['cnt_a'], 1) if sm['cnt_a'] else 0,
                        "avg_placement": round(sm['sum_p'] / sm['cnt_p'], 1) if sm['cnt_p'] else 0,
                    }
                    for sem, sm in sorted(sem_map.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 999)
                ],
                "competencies": [
                    {"skill": "Coding", "score": round(comp_sums['coding'] / comp_counts['coding'], 1) if comp_counts['coding'] else 0},
                    {"skill": "Aptitude", "score": round(comp_sums['aptitude'] / comp_counts['aptitude'], 1) if comp_counts['aptitude'] else 0},
                    {"skill": "Mock Interview", "score": round(comp_sums['mock_interview'] / comp_counts['mock_interview'], 1) if comp_counts['mock_interview'] else 0},
                    {"skill": "Technical Skills", "score": round(comp_sums['technical_skills'] / comp_counts['technical_skills'], 1) if comp_counts['technical_skills'] else 0},
                    {"skill": "Soft Skills", "score": round(comp_sums['soft_skills'] / comp_counts['soft_skills'], 1) if comp_counts['soft_skills'] else 0},
                ],
                "data_quality": {
                    "overall_completeness": data_completeness,
                    "total_expected": total_expected_checks,
                    "total_populated": total_populated_checks,
                    "indicators": [
                        {
                            "field": f_name,
                            "label": f_label,
                            "category": f_cat,
                            "populated": field_populated[f_name],
                            "missing": total_students - field_populated[f_name],
                            "coverage": round((field_populated[f_name] / total_students * 100), 1) if total_students else 0
                        }
                        for f_name, f_label, f_cat in expected_fields
                    ]
                },
                "students": formatted_students
            }), 200

        return jsonify({"error": "Unknown report type"}), 404

    except Exception as e:
        return jsonify({"has_data": False, "error": str(e)}), 500


@reports_bp.route("/reports/insights", methods=["GET", "POST"])
def get_report_insights():
    """
    Returns AI-assisted or rule-based executive brief for the filtered report.
    """
    try:
        from services.ai_service import AIBriefService
        records = DataService.get_joined_students()
        
        department = request.args.get("department")
        semester = request.args.get("semester")
        
        filtered = []
        for r in records:
            if department and str(r.get('department')).lower() != department.lower():
                continue
            if semester and str(r.get('semester')).lower() != semester.lower():
                continue
            filtered.append(r)
            
        total = len(filtered)
        if total == 0:
            return jsonify({
                "status": "fallback",
                "explanation": "No student records found matching the active filter criteria."
            }), 200
            
        count_success = sum(1 for r in filtered if r.get('success_score') is not None)
        sum_success = sum(float(r['success_score']) for r in filtered if r.get('success_score') is not None)
        
        count_acad = sum(1 for r in filtered if r.get('academic_score') is not None)
        sum_acad = sum(float(r['academic_score']) for r in filtered if r.get('academic_score') is not None)
        
        count_place = sum(1 for r in filtered if r.get('placement_score') is not None)
        sum_place = sum(float(r['placement_score']) for r in filtered if r.get('placement_score') is not None)
        
        acad_flags = sum(1 for r in filtered if r.get('academic_score') is not None and r['academic_score'] < 60)
        place_flags = sum(1 for r in filtered if r.get('placement_score') is not None and r['placement_score'] < 60)
        
        # Calculate actual completeness across key fields
        expected_keys = ['cgpa', 'backlog_count', 'overall_attendance_percentage', 'academic_score', 'placement_score']
        total_checks = total * len(expected_keys)
        populated_checks = 0
        for r in filtered:
            raw = r.get('raw_data', {}) or {}
            for k in expected_keys:
                if r.get(k) is not None or raw.get(k) is not None:
                    populated_checks += 1
        completeness = round(populated_checks / total_checks * 100) if total_checks else 0

        summary = {
            "totalStudents": total,
            "studentsAnalyzed": count_success,
            "academicSupportReviews": acad_flags,
            "placementSupportReviews": place_flags,
            "averageSuccessScore": round(sum_success / count_success, 1) if count_success else "N/A",
            "averageAcademicScore": round(sum_acad / count_acad, 1) if count_acad else "N/A",
            "averagePlacementScore": round(sum_place / count_place, 1) if count_place else "N/A",
            "department": department or "All Departments",
            "semester": semester or "All Semesters",
            "dataCompleteness": completeness
        }
        
        brief = AIBriefService.generate_report_brief(summary)
        return jsonify(brief), 200
    except Exception as e:
        try:
            from services.ai_service import AIBriefService
            fallback = AIBriefService._generate_fallback_report_brief(summary if 'summary' in locals() else {}, reason="Temporary system error")
            fallback['error'] = str(e)
            return jsonify(fallback), 200
        except Exception:
            return jsonify({"status": "error", "error": str(e)}), 500

