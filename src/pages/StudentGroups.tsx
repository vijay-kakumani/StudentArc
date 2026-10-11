import { useState, useMemo } from 'react';
import { api } from '../services/api';
import { Users, BookOpen, Briefcase, Activity, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { useQuery } from '../hooks/useQuery';

export default function StudentGroups() {
  const { department, semester, search } = useFilters();
  
  // segment key -> currently selected segment
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const queryKey = `report-student-segments-${department}-${semester}`;
  
  const { data, loading, error } = useQuery(
    queryKey, 
    () => api.getReport('student-segments', { department, semester })
  );

  // Clear student selection when segment changes
  const handleSegmentClick = (segmentKey: string) => {
    setSelectedSegment(segmentKey);
    setSelectedStudent(null);
  };

  // Filter students based on global search
  const filteredStudentsList = useMemo(() => {
    if (!selectedSegment || !data?.segments || !data.segments[selectedSegment]) return [];
    
    let list = data.segments[selectedSegment];
    
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s: any) => 
        s.name?.toLowerCase().includes(q) || 
        s.id?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    }
    
    return list;
  }, [data, selectedSegment, search]);

  const cards = [
    {
      id: 'lowEngagementDecentAcad',
      title: 'Low Engagement, Decent Academics',
      value: data?.metrics?.lowEngagementDecentAcad ?? 0,
      icon: Activity,
      desc: 'Engagement < 50, Academic > 60',
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    {
      id: 'strongAcadWeakPlacement',
      title: 'Strong Academics, Weak Placement',
      value: data?.metrics?.strongAcadWeakPlacement ?? 0,
      icon: BookOpen,
      desc: 'Academic > 75, Placement < 60',
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      id: 'strongPlacementWeakAcad',
      title: 'Strong Placement, Weak Academics',
      value: data?.metrics?.strongPlacementWeakAcad ?? 0,
      icon: Briefcase,
      desc: 'Placement > 75, Academic < 60',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50'
    },
    {
      id: 'totalStudents',
      title: 'Total Students',
      value: data?.metrics?.totalStudents ?? 0,
      icon: Users,
      desc: 'All enrolled students',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="mb-6">
        <h2 className="text-[28px] font-semibold text-text-main tracking-tight">Student Groups</h2>
        <p className="mt-1 text-[13px] text-text-muted">
          Analyze segmented student cohorts and explore targeted interventions.
        </p>
      </div>

      {loading && !data ? (
        <div className="animate-pulse grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-card border border-card-border rounded-[16px] h-28"></div>)}
        </div>
      ) : error && !data ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-[12px] flex items-start gap-3 border border-red-100 mb-6">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div className="text-[13px]">
            <strong>Unable to load segment data.</strong> ({error.message})
          </div>
        </div>
      ) : data?.has_data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(card => {
              const Icon = card.icon;
              const isSelected = selectedSegment === card.id;
              
              return (
                <div 
                  key={card.id}
                  onClick={() => handleSegmentClick(card.id)}
                  className={`bg-card border rounded-[16px] p-5 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' 
                      : 'border-card-border hover:border-zinc-300 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-[10px] ${card.bg} ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-[13px] font-medium text-text-muted mb-1">{card.title}</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-[24px] font-semibold text-text-main leading-none">{card.value}</span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-2">{card.desc}</p>
                </div>
              );
            })}
          </div>

          {selectedSegment && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
              {/* Left Panel: Student List */}
              <div className="bg-card border border-card-border rounded-[16px] flex flex-col h-full overflow-hidden col-span-1 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="p-4 border-b border-card-border bg-surface">
                  <h3 className="text-[14px] font-semibold text-text-main">
                    {cards.find(c => c.id === selectedSegment)?.title}
                  </h3>
                  <p className="text-[12px] text-text-muted mt-1">
                    {filteredStudentsList.length} students found
                  </p>
                </div>
                <div className="overflow-y-auto flex-1">
                  {filteredStudentsList.length === 0 ? (
                    <div className="p-6 text-center text-text-muted text-[13px]">
                      No students match this segment and filter criteria.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200">
                      {filteredStudentsList.map((student: any) => (
                        <div 
                          key={student.id}
                          onClick={() => setSelectedStudent(student)}
                          className={`p-4 cursor-pointer transition-colors flex items-center justify-between ${
                            selectedStudent?.id === student.id ? 'bg-indigo-50' : 'hover:bg-surface'
                          }`}
                        >
                          <div>
                            <p className="text-[14px] font-semibold text-text-main">{student.name}</p>
                            <p className="text-[12px] text-text-muted">{student.id} &bull; {student.department}</p>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${selectedStudent?.id === student.id ? 'text-indigo-500' : 'text-zinc-300'}`} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Student Details */}
              <div className="bg-card border border-card-border rounded-[16px] flex flex-col h-full overflow-hidden col-span-2 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                {!selectedStudent ? (
                  <div className="flex flex-col items-center justify-center h-full text-text-muted p-8 text-center bg-zinc-50/50">
                    <Users className="w-12 h-12 mb-4 text-zinc-300" />
                    <h3 className="text-[15px] font-medium text-text-main mb-2">No Student Selected</h3>
                    <p className="text-[13px] max-w-sm">Select a student from the list to view their detailed metrics, segment evidence, and recommended interventions.</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto h-full flex flex-col">
                    <div className="p-6 border-b border-card-border bg-surface">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-[20px] font-semibold text-text-main">{selectedStudent.name}</h2>
                          <p className="text-[13px] text-text-muted mt-1">
                            {selectedStudent.id} &bull; {selectedStudent.department} &bull; Sem {selectedStudent.semester}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">Success Score</p>
                          <p className="text-[24px] font-bold text-indigo-600">{Math.round(selectedStudent.success_score ?? 0)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-8">
                      {/* Segment Evidence */}
                      {selectedSegment !== 'totalStudents' && (
                        <section className="bg-indigo-50 border border-indigo-100 rounded-[12px] p-5">
                          <h3 className="text-[14px] font-semibold text-indigo-900 flex items-center gap-2 mb-3">
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                            Segment Evidence
                          </h3>
                          <div className="text-[13px] text-indigo-800 space-y-2">
                            {selectedSegment === 'strongAcadWeakPlacement' && (
                              <>
                                <p><strong>Rule:</strong> Academic Score &gt; 75 and Placement Score &lt; 60</p>
                                <p><strong>Actual:</strong> Academic Score is {Math.round(selectedStudent.academic_score ?? 0)}, Placement Score is {Math.round(selectedStudent.placement_score ?? 0)}</p>
                                <div className="mt-3 pt-3 border-t border-indigo-200/50">
                                  <p className="font-semibold mb-1 text-[12px] uppercase tracking-wide">Recommended Interventions</p>
                                  <ul className="list-disc pl-4 space-y-1">
                                    <li>Schedule mandatory mock interview sessions.</li>
                                    <li>Provide access to aptitude and technical skill workshops.</li>
                                    <li>Pair with a peer mentor who has strong placement readiness.</li>
                                  </ul>
                                </div>
                              </>
                            )}
                            {selectedSegment === 'strongPlacementWeakAcad' && (
                              <>
                                <p><strong>Rule:</strong> Placement Score &gt; 75 and Academic Score &lt; 60</p>
                                <p><strong>Actual:</strong> Placement Score is {Math.round(selectedStudent.placement_score ?? 0)}, Academic Score is {Math.round(selectedStudent.academic_score ?? 0)}</p>
                                <div className="mt-3 pt-3 border-t border-indigo-200/50">
                                  <p className="font-semibold mb-1 text-[12px] uppercase tracking-wide">Recommended Interventions</p>
                                  <ul className="list-disc pl-4 space-y-1">
                                    <li>Mandatory academic tutoring for current semester subjects.</li>
                                    <li>Review backlog history and create a clearance plan.</li>
                                    <li>Temporarily restrict placement drive participation until academics improve.</li>
                                  </ul>
                                </div>
                              </>
                            )}
                            {selectedSegment === 'lowEngagementDecentAcad' && (
                              <>
                                <p><strong>Rule:</strong> Engagement Score &lt; 50 and Academic Score &gt; 60</p>
                                <p><strong>Actual:</strong> Engagement Score is {Math.round(selectedStudent.engagement_score ?? 0)}, Academic Score is {Math.round(selectedStudent.academic_score ?? 0)}</p>
                                <div className="mt-3 pt-3 border-t border-indigo-200/50">
                                  <p className="font-semibold mb-1 text-[12px] uppercase tracking-wide">Recommended Interventions</p>
                                  <ul className="list-disc pl-4 space-y-1">
                                    <li>Counseling session to understand lack of campus involvement.</li>
                                    <li>Encourage joining at least one technical or cultural club.</li>
                                    <li>Investigate if the student is facing remote learning or attendance issues.</li>
                                  </ul>
                                </div>
                              </>
                            )}
                          </div>
                        </section>
                      )}

                      {/* Detailed Data grids */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section>
                          <h3 className="text-[14px] font-semibold text-text-main mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-text-muted" />
                            Academic Performance
                          </h3>
                          <dl className="space-y-2 text-[13px] bg-surface p-4 rounded-[12px] border border-card-border">
                            <div className="flex justify-between py-1 border-b border-card-border last:border-0">
                              <dt className="text-text-muted">Academic Score</dt>
                              <dd className="font-medium text-text-main">{selectedStudent.academic_score ? Math.round(selectedStudent.academic_score) : 'N/A'}</dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-card-border last:border-0">
                              <dt className="text-text-muted">CGPA</dt>
                              <dd className="font-medium text-text-main">{selectedStudent.cgpa || 'N/A'}</dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-card-border last:border-0">
                              <dt className="text-text-muted">Backlogs</dt>
                              <dd className="font-medium text-text-main">{selectedStudent.backlog_count ?? 'N/A'}</dd>
                            </div>
                          </dl>
                        </section>
                        
                        <section>
                          <h3 className="text-[14px] font-semibold text-text-main mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-text-muted" />
                            Engagement & Activity
                          </h3>
                          <dl className="space-y-2 text-[13px] bg-surface p-4 rounded-[12px] border border-card-border">
                            <div className="flex justify-between py-1 border-b border-card-border last:border-0">
                              <dt className="text-text-muted">Engagement Score</dt>
                              <dd className="font-medium text-text-main">{selectedStudent.engagement_score ? Math.round(selectedStudent.engagement_score) : 'N/A'}</dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-card-border last:border-0">
                              <dt className="text-text-muted">Attendance Rate</dt>
                              <dd className="font-medium text-text-main">{selectedStudent.attendance_rate ? `${selectedStudent.attendance_rate}%` : 'N/A'}</dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-card-border last:border-0">
                              <dt className="text-text-muted">Assignment Completion</dt>
                              <dd className="font-medium text-text-main">{selectedStudent.raw_data?.assignment_completion_rate ? `${selectedStudent.raw_data.assignment_completion_rate}%` : 'N/A'}</dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-card-border last:border-0">
                              <dt className="text-text-muted">LMS Activity</dt>
                              <dd className="font-medium text-text-main">{selectedStudent.raw_data?.lms_activity_score ?? 'N/A'}</dd>
                            </div>
                          </dl>
                        </section>

                        <section className="md:col-span-2">
                          <h3 className="text-[14px] font-semibold text-text-main mb-3 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-text-muted" />
                            Placement Preparation
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                              <p className="text-[11px] text-text-muted uppercase">Overall Readiness</p>
                              <p className="text-[18px] font-medium text-text-main mt-1">{selectedStudent.placement_score ? Math.round(selectedStudent.placement_score) : 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                              <p className="text-[11px] text-text-muted uppercase">Aptitude Score</p>
                              <p className="text-[16px] font-medium text-text-main mt-1">{selectedStudent.raw_data?.aptitude_score ?? 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                              <p className="text-[11px] text-text-muted uppercase">Coding Score</p>
                              <p className="text-[16px] font-medium text-text-main mt-1">{selectedStudent.raw_data?.coding_score ?? 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                              <p className="text-[11px] text-text-muted uppercase">Mock Interview</p>
                              <p className="text-[16px] font-medium text-text-main mt-1">{selectedStudent.raw_data?.mock_interview_score ?? 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                              <p className="text-[11px] text-text-muted uppercase">Technical Skills</p>
                              <p className="text-[16px] font-medium text-text-main mt-1">{selectedStudent.raw_data?.technical_skills ?? 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                              <p className="text-[11px] text-text-muted uppercase">Soft Skills</p>
                              <p className="text-[16px] font-medium text-text-main mt-1">{selectedStudent.raw_data?.soft_skills ?? 'N/A'}</p>
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
