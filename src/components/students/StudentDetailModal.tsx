import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { getLabel } from '../../utils/labels';
import { api } from '../../services/api';
import { useQuery } from '../../hooks/useQuery';
import { Sparkles, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function StudentAIBrief({ studentId }: { studentId: string }) {
  const { data, loading, error } = useQuery(`ai-brief-${studentId}`, async () => {
    const res = await api.getStudentBrief(studentId);
    return res.data;
  });

  if (loading) {
    return (
      <section>
        <h3 className="text-[16px] font-semibold text-text-main mb-4 border-b border-card-border pb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-text-muted animate-pulse" />
          AI Insight Brief
        </h3>
        <div className="p-4 bg-surface rounded-[12px] border border-card-border text-[13px] text-text-muted flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin"></div>
          Generating personalized brief...
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section>
        <h3 className="text-[16px] font-semibold text-text-main mb-4 border-b border-card-border pb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-text-muted" />
          AI Insight Brief
        </h3>
        <div className="p-4 bg-red-50 rounded-[12px] border border-red-200 text-[13px] text-red-800">
          Failed to generate brief. Please try again later.
        </div>
      </section>
    );
  }

  const isFallback = data.status === 'fallback';

  return (
    <section>
      <div className="flex justify-between items-center mb-4 border-b border-card-border pb-2">
        <h3 className="text-[16px] font-semibold text-text-main flex items-center gap-2">
          {isFallback ? <Bot className="w-4 h-4 text-text-muted" /> : <Sparkles className="w-4 h-4 text-indigo-500" />}
          {isFallback ? 'Rule-Based Insight Brief' : 'AI-Generated Insight Brief'}
        </h3>
        {isFallback && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface border border-card-border text-text-muted uppercase tracking-wider">
            Fallback Mode
          </span>
        )}
      </div>
      
      {data.error && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-[12px] text-[12px] text-amber-800">
          <strong>Notice:</strong> {data.error}
        </div>
      )}

      <div className="p-5 bg-surface rounded-[12px] border border-card-border text-[13.5px] leading-relaxed text-text-main">
        <ReactMarkdown
          components={{
            h1: ({node, ...props}) => <h1 className="text-[16px] font-semibold mt-4 mb-2 first:mt-0" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-[15px] font-semibold mt-4 mb-2 first:mt-0" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-[14.5px] font-semibold mt-3 mb-2 first:mt-0" {...props} />,
            h4: ({node, ...props}) => <h4 className="text-[14px] font-semibold mt-3 mb-1 first:mt-0" {...props} />,
            p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
            li: ({node, ...props}) => <li className="pl-1" {...props} />,
            strong: ({node, ...props}) => <strong className="font-semibold text-text-main" {...props} />,
            hr: ({node, ...props}) => <hr className="my-4 border-card-border" {...props} />
          }}
        >
          {data.explanation}
        </ReactMarkdown>
      </div>
    </section>
  );
}

export default function StudentDetailModal({ student, onClose, fullPage = false }: { student: any, onClose?: () => void, fullPage?: boolean }) {
  if (!student) return null;

  const score = student.success_score;
  const academic = student.academic_score;
  const placement = student.placement_score;

  const getRiskDetails = () => {
    const flags = [];
    if (academic && academic < 60) {
      flags.push({
        type: 'Academic Support Flag',
        rule: 'Academic Progress < 60',
        value: academic,
        explanation: 'Student is struggling academically compared to cohort baseline.',
        missing: student.cgpa ? '' : 'CGPA is missing, which reduces confidence in this flag.'
      });
    }
    if (placement && placement < 60) {
      flags.push({
        type: 'Placement Support Flag',
        rule: 'Placement Preparation < 60',
        value: placement,
        explanation: 'Student is lacking placement readiness indicators.',
        missing: student.aptitude_score ? '' : 'Aptitude score is missing, which affects the placement score confidence.'
      });
    }
    return flags;
  };

  const flags = getRiskDetails();

  const Content = (
    <div className={fullPage ? "flex flex-col h-full w-full bg-transparent" : "bg-card rounded-[16px] border border-card-border shadow-xl w-full max-w-4xl mx-auto flex flex-col max-h-[90vh] overflow-hidden"}>
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-card-border">
        <div>
          <h2 className="text-[24px] font-semibold text-text-main">{student.name}</h2>
          <p className="text-[14px] text-text-muted mt-1">ID: {student.id} &bull; {student.department} &bull; {getLabel('semester')} {student.semester}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main transition-colors rounded-full hover:bg-app-bg">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto space-y-8 flex-1">
          
          {/* Section: Overview */}
          <section>
            <h3 className="text-[16px] font-semibold text-text-main mb-4 border-b border-card-border pb-2">Student Overview</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-surface rounded-[12px] border border-card-border shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <p className="text-[12px] text-text-muted mb-1">{getLabel('success_score')}</p>
                <p className="text-[24px] font-semibold text-text-main">{score ? Math.round(score) : 'Not available'}</p>
              </div>
              <div className="p-4 bg-surface rounded-[12px] border border-card-border shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <p className="text-[12px] text-text-muted mb-1">Academic Progress</p>
                <p className="text-[24px] font-semibold text-text-main">{academic ? Math.round(academic) : 'Not available'}</p>
              </div>
              <div className="p-4 bg-surface rounded-[12px] border border-card-border shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <p className="text-[12px] text-text-muted mb-1">Placement Preparation</p>
                <p className="text-[24px] font-semibold text-text-main">{placement ? Math.round(placement) : 'Not available'}</p>
              </div>
            </div>
          </section>

          {/* Section: Why Flagged */}
          {flags.length > 0 && (
            <section>
              <h3 className="text-[16px] font-semibold text-text-main mb-4 border-b border-card-border pb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Why This Student Was Flagged
              </h3>
              <div className="space-y-4">
                {flags.map((flag, i) => (
                  <div key={i} className="p-4 rounded-[12px] border border-red-200 bg-red-50">
                    <h4 className="font-semibold text-[14px] text-red-900">{flag.type}</h4>
                    <p className="text-[13px] text-red-800 mt-1"><strong>Rule:</strong> {flag.rule}</p>
                    <p className="text-[13px] text-red-800 mt-1"><strong>Current Value:</strong> {Math.round(flag.value)}</p>
                    <p className="text-[13px] text-red-800 mt-1"><strong>Explanation:</strong> {flag.explanation}</p>
                    {flag.missing && (
                      <p className="text-[12px] text-amber-700 mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" /> {flag.missing}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: AI Insight Brief */}
          <StudentAIBrief studentId={student.id} />

          {/* Detailed Data grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <h3 className="text-[16px] font-semibold text-text-main mb-4 border-b border-card-border pb-2">Academic Performance</h3>
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between py-1 border-b border-card-border">
                  <dt className="text-text-muted">{getLabel('cgpa')}</dt>
                  <dd className="font-medium text-text-main">{student.cgpa || 'Not available'}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-card-border">
                  <dt className="text-text-muted">{getLabel('backlog_count')}</dt>
                  <dd className="font-medium text-text-main">{student.backlog_count ?? 'Not available'}</dd>
                </div>
              </dl>
            </section>
            
            <section>
              <h3 className="text-[16px] font-semibold text-text-main mb-4 border-b border-card-border pb-2">Attendance and Learning Activity</h3>
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between py-1 border-b border-card-border">
                  <dt className="text-text-muted">{getLabel('attendanceRate')}</dt>
                  <dd className="font-medium text-text-main">{student.attendance_rate ? `${student.attendance_rate}%` : 'Not available'}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-card-border">
                  <dt className="text-text-muted">{getLabel('assignment_completion')}</dt>
                  <dd className="font-medium text-text-main">{student.raw_data?.assignment_completion_rate ? `${student.raw_data.assignment_completion_rate}%` : 'Not available'}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-card-border">
                  <dt className="text-text-muted">{getLabel('lmsEngagement')}</dt>
                  <dd className="font-medium text-text-main">{student.raw_data?.lms_activity_score ?? 'Not available'}</dd>
                </div>
              </dl>
            </section>

            <section className="md:col-span-2">
              <h3 className="text-[16px] font-semibold text-text-main mb-4 border-b border-card-border pb-2">Placement Preparation</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                  <p className="text-[11px] text-text-muted uppercase">{getLabel('aptitude_score')}</p>
                  <p className="text-[16px] font-medium text-text-main mt-1">{student.raw_data?.aptitude_score ?? 'Not available'}</p>
                </div>
                <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                  <p className="text-[11px] text-text-muted uppercase">{getLabel('coding_score')}</p>
                  <p className="text-[16px] font-medium text-text-main mt-1">{student.raw_data?.coding_score ?? 'Not available'}</p>
                </div>
                <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                  <p className="text-[11px] text-text-muted uppercase">{getLabel('mock_interview_score')}</p>
                  <p className="text-[16px] font-medium text-text-main mt-1">{student.raw_data?.mock_interview_score ?? 'Not available'}</p>
                </div>
                <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                  <p className="text-[11px] text-text-muted uppercase">{getLabel('technical_skills')}</p>
                  <p className="text-[16px] font-medium text-text-main mt-1">{student.raw_data?.technical_skills ?? 'Not available'}</p>
                </div>
              </div>
            </section>
          </div>
          
          {/* Section: Data Quality and Readiness */}
          <section>
            <h3 className="text-[16px] font-semibold text-text-main mb-4 border-b border-card-border pb-2">Data Quality and Missing Information</h3>
            <div className="text-[13px] space-y-3">
              <div className="bg-surface p-4 rounded-[12px] border border-card-border">
                {(!student.cgpa || !student.attendance_rate || !student.raw_data?.aptitude_score) ? (
                  <div className="flex gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>Some required primary indicators are missing. Review available fields carefully.</p>
                  </div>
                ) : (
                  <div className="flex gap-2 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>All primary fields are available for this student.</p>
                  </div>
                )}
              </div>
              <div className="bg-amber-50 p-4 rounded-[12px] border border-amber-200">
                <div className="flex gap-2 text-amber-800">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">System Data Limitations</p>
                    <ul className="list-disc pl-4 space-y-1 text-[12px]">
                      <li><strong>Extracurriculars:</strong> Individual events, clubs, hackathons, and certifications are currently missing from the source data. This is represented only by a generic aggregate <em>Engagement Score</em>. A lack of specific activities does not imply zero participation.</li>
                      <li><strong>Placement Participation:</strong> Specific placement drives and participation logs are absent from the dataset.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Support Plan History */}
          <section>
            <h3 className="text-[16px] font-semibold text-text-main mb-4 border-b border-card-border pb-2">Support Plan History</h3>
            <div className="text-[13px] text-text-muted text-center py-8 bg-surface rounded-[12px] border border-card-border">
              No previous support plans documented for this student.
            </div>
          </section>
        </div>
      </div>
  );

  if (fullPage) {
    return Content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/40 backdrop-blur-sm p-4 overflow-y-auto">
      {Content}
    </div>
  );
}
