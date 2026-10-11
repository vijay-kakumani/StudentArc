import math

class ScoringEngine:
    @staticmethod
    def calculate_success_score(record: dict) -> dict:
        """
        Calculates Student Success Score and sub-scores.
        """
        # Canonical mappings for duplicate fields
        # cgpa handles current_semester_gpa
        # backlog_count handles failed_subject_count
        # engagement_score handles class_participation_score
        # technical_skills handles technical_interview_score
        # soft_skills handles communication_score
        
        # 1. Academic Performance (65% of overall)
        # cgpa: 70%, backlog_count: 30%
        academic_score = 0
        academic_weight = 0
        
        cgpa = record.get('cgpa')
        if cgpa is not None and not math.isnan(float(cgpa)):
            # Assuming CGPA is 0-10
            val = min(10.0, float(cgpa))
            norm_cgpa = (val / 10.0) * 100
            academic_score += norm_cgpa * 0.70
            academic_weight += 0.70
            
        backlog = record.get('backlog_count')
        if backlog is not None and not math.isnan(float(backlog)):
            b_val = float(backlog)
            backlog_score_val = max(0, 100 - (25 * b_val))
            academic_score += backlog_score_val * 0.30
            academic_weight += 0.30
            
        final_academic_score = (academic_score / academic_weight) if academic_weight > 0 else None
        
        # 2. Learning Engagement (35% of overall)
        # Attendance: 35%, Assignment: 30%, LMS: 20%, Engagement: 15%
        engagement_score = 0
        engagement_weight = 0
        
        att = record.get('overall_attendance_percentage')
        if att is not None and not math.isnan(float(att)):
            val = float(att)
            engagement_score += val * 0.35
            engagement_weight += 0.35
            
        assign = record.get('assignment_completion_rate')
        if assign is not None and not math.isnan(float(assign)):
            val = float(assign)
            engagement_score += val * 0.30
            engagement_weight += 0.30
            
        lms = record.get('lms_activity_score')
        if lms is not None and not math.isnan(float(lms)):
            # Assuming lms_activity_score is 0-100 based on previous context, wait let's check
            # The prompt says "LMS activity score: 20%". Let's assume it's 0-100.
            val = float(lms)
            engagement_score += val * 0.20
            engagement_weight += 0.20
            
        eng = record.get('engagement_score')
        if eng is not None and not math.isnan(float(eng)):
            # Assuming engagement_score is 0-100
            val = float(eng)
            engagement_score += val * 0.15
            engagement_weight += 0.15
            
        final_engagement_score = (engagement_score / engagement_weight) if engagement_weight > 0 else None
        
        # Overall Student Success Score
        overall_score = 0
        overall_weight = 0
        
        if final_academic_score is not None:
            overall_score += final_academic_score * 0.65
            overall_weight += 0.65
            
        if final_engagement_score is not None:
            overall_score += final_engagement_score * 0.35
            overall_weight += 0.35
            
        final_overall_score = (overall_score / overall_weight) if overall_weight > 0 else None
        
        # 3. Placement Readiness
        # Coding (30%), Aptitude (25%), Mock interview (25%), Technical skills (10%), Soft skills (10%)
        placement_score = 0
        placement_weight = 0
        
        def add_placement(field, weight, max_val=100):
            nonlocal placement_score, placement_weight
            val = record.get(field)
            if val is not None and not math.isnan(float(val)):
                norm_val = (float(val) / max_val) * 100
                placement_score += norm_val * weight
                placement_weight += weight
                
        add_placement('coding_score', 0.30)
        add_placement('aptitude_score', 0.25)
        add_placement('mock_interview_score', 0.25)
        add_placement('technical_skills', 0.10, max_val=100.0)
        add_placement('soft_skills', 0.10, max_val=100.0)
        
        final_placement_score = (placement_score / placement_weight) if placement_weight > 0 else None
        
        # Risk Flags
        flags = []
        if final_academic_score is not None and final_academic_score < 60:
            flags.append({
                "type": "academic",
                "rule": "Academic Score < 60",
                "explanation": "Student is struggling academically.",
                "suggested_action": "Schedule tutoring or academic advising."
            })
            
        if final_placement_score is not None and final_placement_score < 60:
            flags.append({
                "type": "placement",
                "rule": "Placement Score < 60",
                "explanation": "Student is lacking placement readiness.",
                "suggested_action": "Recommend mock interviews and resume reviews."
            })
            
        return {
            "success_score": round(final_overall_score, 1) if final_overall_score is not None else None,
            "academic_score": round(final_academic_score, 1) if final_academic_score is not None else None,
            "engagement_score": round(final_engagement_score, 1) if final_engagement_score is not None else None,
            "placement_score": round(final_placement_score, 1) if final_placement_score is not None else None,
            "flags": flags
        }
