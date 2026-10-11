from supabase_client import get_supabase
from services.scoring import ScoringEngine

class DataService:
    @staticmethod
    def get_all_records(table_name):
        client = get_supabase()
        page_size = 1000
        offset = 0
        all_records = []
        
        while True:
            res = client.table(table_name).select('*').range(offset, offset + page_size - 1).execute()
            data = res.data
            if not data:
                break
            all_records.extend(data)
            if len(data) < page_size:
                break
            offset += page_size
            
        return all_records

    @staticmethod
    def get_joined_students():
        # Fetch raw tables
        students_raw = DataService.get_all_records('raw_students_csv')
        indicators_raw = DataService.get_all_records('raw_indicators_csv')
        
        # Group indicators by student_id
        student_indicators = {}
        for ind in indicators_raw:
            sid = ind.get('student_id')
            if not sid: continue
            
            if sid not in student_indicators:
                student_indicators[sid] = {}
                
            name = ind.get('indicator_name')
            if name:
                # Handle duplicates by taking the first one or latest one
                # Here we just keep the first one encountered for simplicity if exact dupe
                if name not in student_indicators[sid]:
                    student_indicators[sid][name] = ind
                else:
                    # Resolve conflicts if needed (e.g. keep latest date)
                    # Assuming we just keep the existing one for now unless we want to sort by date
                    existing_date = student_indicators[sid][name].get('date', '')
                    new_date = ind.get('date', '')
                    if new_date > existing_date:
                        student_indicators[sid][name] = ind
        
        joined_students = []
        
        for student in students_raw:
            sid = student.get('student_id')
            
            # Start with a clean record mapped from raw_students_csv
            # We want to ignore legacy fields
            clean_record = {
                k: v for k, v in student.items()
                if not k.lower().startswith('legacy_')
            }
            
            # Map indicators into the clean record
            # We must map "indicator_name" to the keys expected by the scoring engine
            # indicator names observed: "CGPA", "Backlogs", "Overall Attendance", "LMS Login Frequency", "Assignment Completion"
            # In ScoringEngine we expect: cgpa, backlog_count, overall_attendance_percentage, assignment_completion_rate, etc.
            
            name_mapping = {
                "CGPA": "cgpa",
                "Current Semester GPA": "current_semester_gpa",
                "Backlogs": "backlog_count",
                "Failed Subjects": "failed_subject_count",
                "Overall Attendance": "overall_attendance_percentage",
                "LMS Login Frequency": "lms_login_count",
                "LMS Activity Score": "lms_activity_score",
                "Assignment Completion": "assignment_completion_rate",
                "Class Participation": "class_participation_score",
                "Engagement Score": "engagement_score",
                "Aptitude Score": "aptitude_score",
                "Coding Score": "coding_score",
                "Technical Interview Score": "technical_interview_score",
                "Mock Interview Score": "mock_interview_score",
                "Communication Score": "communication_score",
                "Technical Skills": "technical_skills",
                "Soft Skills": "soft_skills",
                "Student Feedback": "student_feedback",
                "Faculty Feedback": "faculty_feedback"
            }
            
            inds = student_indicators.get(sid, {})
            
            for ind_name, ind_data in inds.items():
                mapped_key = name_mapping.get(ind_name)
                if mapped_key:
                    # Prefer indicator value over student table value if there is a conflict
                    clean_record[mapped_key] = ind_data.get('value')
                    
            # Calculate scores
            scores = ScoringEngine.calculate_success_score(clean_record)
            
            joined_students.append({
                "id": sid,
                "name": clean_record.get('student_name', 'Unknown'),
                "department": clean_record.get('department', 'Unknown'),
                "semester": str(clean_record.get('semester', '')),
                "success_score": scores.get('success_score'),
                "academic_score": scores.get('academic_score'),
                "placement_score": scores.get('placement_score'),
                "engagement_score": scores.get('engagement_score'),
                "attendance_rate": clean_record.get('overall_attendance_percentage'),
                "raw_data": clean_record,
                "scores": scores
            })
            
        return joined_students
