import { useState, useEffect } from 'react';
import { Search, Download, Users, ChevronLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { useQuery } from '../hooks/useQuery';
import StudentDetailModal from '../components/students/StudentDetailModal';
import LoadingState from '../components/common/LoadingState';
import { cn } from '../utils/cn';

function StudentProfilePanel({ id, onBack }: { id: string, onBack: () => void }) {
  const { data: student, loading, error } = useQuery(`student-${id}`, async () => {
    const res = await api.getStudent(id);
    return res.data;
  });

  if (loading) return <LoadingState message="Loading student profile..." />;
  if (error || !student) return <div className="flex-1 flex items-center justify-center text-red-500">Failed to load student details</div>;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div className="md:hidden absolute top-4 right-4 z-10">
        <button onClick={onBack} className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-surface border border-card-border rounded-full shadow-sm text-text-main hover:bg-card">
          <ChevronLeft className="w-3 h-3 mr-1" /> Back to list
        </button>
      </div>
      <StudentDetailModal student={student} fullPage={true} />
    </div>
  );
}

export default function Students() {
  const { department, semester, search, setSearch, scoreBand, setScoreBand, supportFlag, setSupportFlag } = useFilters();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Use state but sync with URL, or just use URL as source of truth.
  // Actually, using URL as source of truth is better.
  const selectedId = searchParams.get('studentId') || null;
  const setSelectedId = (id: string | null) => {
    if (id) {
      searchParams.set('studentId', id);
    } else {
      searchParams.delete('studentId');
    }
    setSearchParams(searchParams, { replace: true });
  };

  const [showMobileProfile, setShowMobileProfile] = useState(!!selectedId);

  // Sync mobile view when selectedId changes from URL (e.g. from Global Search)
  useEffect(() => {
    if (selectedId) {
      setShowMobileProfile(true);
    }
  }, [selectedId]);

  const queryKey = `students-${department}-${semester}`;
  
  const { data, loading, error } = useQuery(
    queryKey,
    () => api.getStudents({ department, semester })
  );

  const students = Array.isArray(data) ? data : (data?.data || []);

  const filteredStudents = students.filter((s: any) => {
    let match = true;
    if (search) {
      const q = search.toLowerCase();
      if (!s.name?.toLowerCase().includes(q) && !s.id?.toLowerCase().includes(q) && !s.department?.toLowerCase().includes(q)) match = false;
    }
    if (scoreBand && match) {
       const score = s.success_score;
       if (score === undefined || score === null) match = false;
       else if (scoreBand === "0-49" && score >= 50) match = false;
       else if (scoreBand === "50-59" && (score < 50 || score >= 60)) match = false;
       else if (scoreBand === "60-69" && (score < 60 || score >= 70)) match = false;
       else if (scoreBand === "70-79" && (score < 70 || score >= 80)) match = false;
       else if (scoreBand === "80-89" && (score < 80 || score >= 90)) match = false;
       else if (scoreBand === "90-100" && score < 90) match = false;
    }
    if (supportFlag && match) {
       if (supportFlag === "Academic") {
          if (!s.academic_score || s.academic_score >= 60) match = false;
       } else if (supportFlag === "Placement") {
          if (!s.placement_score || s.placement_score >= 60) match = false;
       } else if (supportFlag === "Attendance") {
          if (!s.attendance_rate || s.attendance_rate >= 75) match = false; 
       }
    }
    return match;
  });

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-110px)] flex flex-col space-y-3 pb-2 -mt-4">
      <div className="flex justify-between items-end flex-shrink-0">
        <div>
          <h2 className="text-[28px] font-semibold text-text-main tracking-tight">Student Directory</h2>
          <p className="mt-1 text-[13px] text-text-muted">
            Search and manage student profiles and analytics.
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-card-border text-[13px] font-medium rounded-lg text-text-main bg-card hover:bg-surface transition-colors">
          <Download className="h-4 w-4 mr-2 text-text-muted" />
          Export
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Left Panel: List */}
        <div className={cn("flex-col w-full md:w-[380px] lg:w-[420px] bg-card rounded-[16px] border border-card-border shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden h-full flex-shrink-0", showMobileProfile ? "hidden md:flex" : "flex")}>
          <div className="p-4 border-b border-card-border space-y-3 flex-shrink-0">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-text-muted" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-card-border rounded-lg text-[13px] bg-surface placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-text-main focus:border-text-main transition-all"
                placeholder="Search by name, ID, or dept..."
              />
            </div>
            
            {(scoreBand || supportFlag) && (
              <div className="flex items-center flex-wrap gap-2 text-[11px]">
                <span className="text-text-muted font-medium">Filters:</span>
                {scoreBand && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-card-border bg-card text-text-main">
                    {scoreBand}
                    <button onClick={() => setScoreBand('')} className="ml-1 hover:text-text-main">&times;</button>
                  </span>
                )}
                {supportFlag && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-card-border bg-card text-text-main">
                    {supportFlag}
                    <button onClick={() => setSupportFlag('')} className="ml-1 hover:text-text-main">&times;</button>
                  </span>
                )}
              </div>
            )}
            
            {error && students.length > 0 && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-[10px] text-[11px] text-amber-800">
                Offline: Showing cached data.
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && students.length === 0 ? (
              <LoadingState message="Loading students..." />
            ) : error && students.length === 0 ? (
              <div className="p-8 text-center text-red-500 text-[13px]">{error.message}</div>
            ) : students.length === 0 && !loading && !error ? (
              <div className="text-center py-16 px-6">
                <Users className="mx-auto h-8 w-8 text-text-muted mb-3" />
                <h3 className="text-[14px] font-semibold text-text-main">No data imported</h3>
                <Link to="/data-hub" className="mt-4 inline-flex px-3 py-1.5 border border-transparent text-[12px] font-medium rounded-lg text-white bg-text-main hover:opacity-90">
                  Import Data
                </Link>
              </div>
            ) : filteredStudents.length === 0 ? (
               <div className="p-8 text-center text-[13px] text-text-muted">No students match.</div>
            ) : (
              <ul className="divide-y divide-card-border">
                {filteredStudents.map((student: any) => {
                  const score = student.success_score;
                  let risk = 'Low Risk';
                  let riskColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (!score) {
                    risk = 'Unknown';
                    riskColor = 'bg-surface text-text-main border-card-border';
                  } else if (score < 60) {
                    risk = 'High Risk';
                    riskColor = 'bg-red-50 text-red-700 border-red-200';
                  } else if (score < 75) {
                    risk = 'Medium Risk';
                    riskColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  }
                  
                  const isSelected = selectedId === student.id;
                  
                  return (
                    <li 
                      key={student.id} 
                      onClick={() => { setSelectedId(student.id); setShowMobileProfile(true); }}
                      className={cn("p-4 cursor-pointer hover:bg-surface transition-colors focus-within:bg-surface outline-none", isSelected ? "bg-surface border-l-4 border-l-text-main" : "border-l-4 border-l-transparent")}
                      tabIndex={0}
                      onKeyDown={(e) => { if(e.key==='Enter') { setSelectedId(student.id); setShowMobileProfile(true); } }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[14px] font-medium text-text-main truncate pr-2">{student.name}</p>
                        <span className={cn("flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", riskColor)}>
                          {score ? Math.round(score) : '-'} &bull; {risk}
                        </span>
                      </div>
                      <p className="text-[12px] text-text-muted">{student.id} &bull; {student.department}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right Panel: Profile */}
        <div className={cn("flex-1 h-full bg-card rounded-[16px] border border-card-border shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden", !showMobileProfile ? "hidden md:flex" : "flex")}>
          {selectedId ? (
            <StudentProfilePanel id={selectedId} onBack={() => setShowMobileProfile(false)} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-8 text-center bg-surface/30">
              <Users className="w-12 h-12 mb-4 text-card-border" />
              <p className="text-[15px] font-medium text-text-main mb-1">No Student Selected</p>
              <p className="text-[13px]">Select a student from the list to view their detailed profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
