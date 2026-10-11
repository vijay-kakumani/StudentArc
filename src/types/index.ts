export interface StudentRecord {
  id: string;
  name: string;
  studentId: string;
  department: string;
  semester: string;
  attendanceRate: number;
  assignmentCompletion: number;
  successScore: number;
  riskStatus: 'High' | 'Medium' | 'Low' | 'None';
  satisfactionScore?: number;
}

export interface DashboardMetrics {
  totalStudentsAnalyzed: number;
  averageSuccessScore: number;
  academicSupportReviews: number;
  placementSupportReviews: number;
  dataCompleteness: number;
  attendanceCoverage: number;
  assignmentCompletionRate: number;
}
