import { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { Users, ClipboardList, CheckCircle2, Clock, Plus, X } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { useQuery } from '../hooks/useQuery';
import StudentDetailModal from '../components/students/StudentDetailModal';

export default function SupportPlans() {
  const { department, semester, search } = useFilters();
  
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [riskFilter, setRiskFilter] = useState<'all' | 'academic' | 'placement' | 'both'>('all');
  
  // Fetch students (for risk calculations)
  const { data: studentsData, loading: loadingStudents } = useQuery(
    `students-${department}-${semester}`, 
    () => api.getStudents({ department, semester })
  );
  
  // Fetch interventions
  const [interventions, setInterventions] = useState<any[]>([]);
  const [loadingInterventions, setLoadingInterventions] = useState(true);

  const fetchInterventions = async () => {
    try {
      setLoadingInterventions(true);
      const json = await api.getInterventions();
      setInterventions(json.data || []);
    } catch (e) {
      console.error('Failed to load interventions:', e);
    } finally {
      setLoadingInterventions(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, []);

  const students = useMemo(() => {
    if (Array.isArray(studentsData)) return studentsData;
    return studentsData?.data || [];
  }, [studentsData]);
  
  // Filter students based on risk and global search
  const filteredStudents = useMemo(() => {
    let list = students.filter((s: any) => (s.academic_score && s.academic_score < 60) || (s.placement_score && s.placement_score < 60));
    
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s: any) => 
        s.name?.toLowerCase().includes(q) || 
        s.id?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    }
    
    if (riskFilter === 'academic') {
      list = list.filter((s: any) => (s.academic_score && s.academic_score < 60));
    } else if (riskFilter === 'placement') {
      list = list.filter((s: any) => (s.placement_score && s.placement_score < 60));
    } else if (riskFilter === 'both') {
      list = list.filter((s: any) => (s.academic_score && s.academic_score < 60) && (s.placement_score && s.placement_score < 60));
    }
    
    return list;
  }, [students, search, riskFilter]);

  // Derived metrics
  const studentsRequiringSupport = filteredStudents.length;
  const activePlans = interventions.filter(i => i.status === 'In Progress').length;
  const pendingPlans = interventions.filter(i => i.status === 'Planned').length;
  const completedPlans = interventions.filter(i => i.status === 'Completed').length;

  const cards = [
    { title: 'Requires Support', value: studentsRequiringSupport, icon: Users, color: 'text-red-500', bg: 'bg-red-50' },
    { title: 'Active Plans', value: activePlans, icon: ClipboardList, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Pending Interventions', value: pendingPlans, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { title: 'Completed', value: completedPlans, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  const getRiskReason = (student: any) => {
    const reasons = [];
    if (student.academic_score && student.academic_score < 60) reasons.push('Low Academic Score');
    if (student.backlog_count > 0) reasons.push(`${student.backlog_count} Backlogs`);
    if (student.attendance_rate && student.attendance_rate < 75) reasons.push('Low Attendance');
    if (student.placement_score && student.placement_score < 60) reasons.push('Low Placement Readiness');
    if (reasons.length === 0 && student.raw_data?.risk_factors) return student.raw_data.risk_factors;
    return reasons.join(', ') || 'System identified risk';
  };

  const getRecommendedAction = (student: any) => {
    const isAcademicRisk = student.academic_score && student.academic_score < 60;
    const isPlacementRisk = student.placement_score && student.placement_score < 60;
    if (isAcademicRisk && isPlacementRisk) return "Coordinated overall support plan.";
    if (student.attendance_rate && student.attendance_rate < 75) return "Attendance counseling and monitoring target.";
    if (isAcademicRisk) return "Mandatory academic tutoring and advising.";
    if (isPlacementRisk) return "Mock interviews and resume review sessions.";
    return "Schedule a check-in meeting.";
  };

  const handleCreatePlan = (student: any) => {
    setSelectedStudent(student);
    setIsPlanModalOpen(true);
  };
  
  const handleViewProfile = (student: any) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="mb-6">
        <h2 className="text-[28px] font-semibold text-text-main tracking-tight">Support Plans</h2>
        <p className="mt-1 text-[13px] text-text-muted">
          Manage interventions and track support for at-risk students.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-[10px] ${card.bg} ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-[13px] font-medium text-text-muted mb-1">{card.title}</h3>
              <div className="flex items-end gap-2">
                <span className="text-[24px] font-semibold text-text-main leading-none">{card.value}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Risk Filter */}
      <div className="flex items-center gap-2">
        <button onClick={() => setRiskFilter('all')} className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${riskFilter === 'all' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-surface border-card-border text-text-muted hover:text-text-main'}`}>All Risk Areas</button>
        <button onClick={() => setRiskFilter('academic')} className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${riskFilter === 'academic' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-surface border-card-border text-text-muted hover:text-text-main'}`}>Academic Risk</button>
        <button onClick={() => setRiskFilter('placement')} className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${riskFilter === 'placement' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-surface border-card-border text-text-muted hover:text-text-main'}`}>Placement Risk</button>
        <button onClick={() => setRiskFilter('both')} className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${riskFilter === 'both' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-surface border-card-border text-text-muted hover:text-text-main'}`}>Multiple Risks</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Students Needing Support */}
        <div className="bg-card border border-card-border rounded-[16px] flex flex-col lg:col-span-2 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="p-5 border-b border-card-border">
            <h3 className="text-[15px] font-semibold text-text-main">Students Requiring Support</h3>
          </div>
          <div className="overflow-x-auto">
            {loadingStudents ? (
               <div className="p-8 text-center text-text-muted">Loading students...</div>
            ) : filteredStudents.length === 0 ? (
               <div className="p-8 text-center text-text-muted flex flex-col items-center">
                 <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                 <p className="text-[14px] font-medium">No students match this criteria.</p>
                 <p className="text-[13px] mt-1 max-w-sm">Either no students require support in this filter, or they do not match your global search constraints.</p>
               </div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="bg-surface border-b border-card-border text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Risk Factors</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredStudents.map((student: any) => (
                    <tr key={student.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-main cursor-pointer hover:text-indigo-600 hover:underline" onClick={() => handleViewProfile(student)}>{student.name}</p>
                        <p className="text-[11px] text-text-muted">{student.id} &bull; {student.department}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          (student.success_score || 0) < 50 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {Math.round(student.success_score || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-text-main">{getRiskReason(student)}</p>
                        <div className="flex gap-1 mt-1">
                          {student.academic_risk_level === 'High' && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 rounded">Acad</span>}
                          {student.placement_risk_level === 'High' && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded">Place</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleCreatePlan(student)}
                          className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Plan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Existing Interventions */}
        <div className="bg-card border border-card-border rounded-[16px] flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="p-5 border-b border-card-border">
            <h3 className="text-[15px] font-semibold text-text-main">Intervention Registry</h3>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {loadingInterventions ? (
               <div className="p-8 text-center text-text-muted">Loading plans...</div>
            ) : interventions.length === 0 ? (
               <div className="p-8 text-center text-text-muted">
                 No support plans created yet.
               </div>
            ) : (
              <div className="divide-y divide-zinc-200">
                {interventions.map((plan: any, i: number) => (
                  <div key={i} className="p-4 hover:bg-surface transition-colors cursor-pointer" onClick={() => {
                    setSelectedStudent({ id: plan.student_id, name: plan.student_name }); 
                    setIsPlanModalOpen(true);
                  }}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-text-main text-[13px]">{plan.student_name || plan.student_id}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        plan.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        plan.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-text-muted mb-2 font-medium">{plan.reason}</p>
                    <p className="text-[12px] text-text-main line-clamp-2">{plan.recommended_action}</p>
                    {plan.due_date && <p className="text-[11px] text-text-muted mt-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Due {plan.due_date}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isPlanModalOpen && selectedStudent && (
        <PlanModal 
          student={selectedStudent} 
          onClose={() => setIsPlanModalOpen(false)} 
          onSave={() => {
            setIsPlanModalOpen(false);
            fetchInterventions();
          }}
          recommendedAction={getRecommendedAction(selectedStudent)}
          reason={getRiskReason(selectedStudent)}
          existingPlan={interventions.find(i => i.student_id === selectedStudent.id && i.status !== 'Completed')}
        />
      )}
      
      {isDetailModalOpen && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
    </div>
  );
}

function PlanModal({ student, onClose, onSave, recommendedAction, reason, existingPlan }: any) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: existingPlan?.id || '',
    student_id: student.id,
    student_name: student.name,
    reason: existingPlan?.reason || reason,
    recommended_action: existingPlan?.recommended_action || recommendedAction,
    advisor: existingPlan?.advisor || '',
    due_date: existingPlan?.due_date || '',
    status: existingPlan?.status || 'Planned',
    notes: existingPlan?.notes || ''
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.createIntervention(formData);
      onSave();
    } catch (err: any) {
      console.error('Failed to save intervention:', err);
      setErrorMsg(err.message || 'Error saving intervention.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-[16px] border border-card-border shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-card-border flex justify-between items-center bg-surface">
          <h2 className="text-[18px] font-semibold text-text-main">Support Plan: {student.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-full text-text-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-700">
              {errorMsg}
            </div>
          )}
          <form id="planForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-text-muted mb-1">Identified Risk / Reason</label>
              <input type="text" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required className="w-full px-3 py-2 bg-surface border border-card-border rounded-md text-[13px] text-text-main focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-muted mb-1 flex justify-between">
                <span>Recommended Action</span>
                <span className="text-indigo-500 font-normal">Rule-based suggestion</span>
              </label>
              <textarea value={formData.recommended_action} onChange={e => setFormData({...formData, recommended_action: e.target.value})} required rows={3} className="w-full px-3 py-2 bg-surface border border-card-border rounded-md text-[13px] text-text-main focus:outline-none focus:ring-1 focus:ring-indigo-500"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-text-muted mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-surface border border-card-border rounded-md text-[13px] text-text-main focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-text-muted mb-1">Target Due Date</label>
                <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="w-full px-3 py-2 bg-surface border border-card-border rounded-md text-[13px] text-text-main focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-muted mb-1">Assigned Faculty / Advisor</label>
              <input type="text" value={formData.advisor} onChange={e => setFormData({...formData, advisor: e.target.value})} placeholder="e.g. Dr. Smith" className="w-full px-3 py-2 bg-surface border border-card-border rounded-md text-[13px] text-text-main focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-muted mb-1">Observations & Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} placeholder="Add any follow-up observations here..." className="w-full px-3 py-2 bg-surface border border-card-border rounded-md text-[13px] text-text-main focus:outline-none focus:ring-1 focus:ring-indigo-500"></textarea>
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t border-card-border bg-surface flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-text-main bg-white border border-card-border rounded-md hover:bg-zinc-50 transition-colors">Cancel</button>
          <button type="submit" form="planForm" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2">
            {saving ? 'Saving...' : 'Save Support Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
