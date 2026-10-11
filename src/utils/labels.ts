export const FIELD_LABELS: Record<string, string> = {
  student_id: 'Student ID',
  cgpa: 'CGPA',
  backlog_count: 'Number of Backlogs',
  overall_attendance: 'Attendance Percentage',
  attendanceRate: 'Average Attendance',
  assignment_completion: 'Assignments Completed',
  assignmentCompletion: 'Assignment Completion',
  lms_login_freq: 'Online Learning Logins',
  lmsEngagement: 'Online Learning Activity',
  engagement_score: 'Engagement Score',
  aptitude_score: 'Aptitude Assessment Score',
  coding_score: 'Coding Assessment Score',
  mock_interview_score: 'Mock Interview Score',
  technical_skills: 'Technical Skills Score',
  soft_skills: 'Soft Skills Score',
  success_score: 'Student Success Score',
  semester: 'Academic Semester',
  strongAcadWeakPlacement: 'Strong Academics, Weak Placement',
  strongPlacementWeakAcad: 'Strong Placement, Weak Academics',
  lowEngagementDecentAcad: 'Low Engagement, Decent Academics',
  totalStudents: 'Total Students',
  averageAttendance: 'Average Attendance',
  lowAttendanceCount: 'Low Attendance Count',
  averageAcademicScore: 'Average Academic Score',
  atRiskCount: 'At-Risk Students Count',
  averagePlacementScore: 'Average Placement Score'
};

export function getLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
