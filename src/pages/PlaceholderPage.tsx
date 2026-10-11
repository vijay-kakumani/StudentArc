import { useState, useMemo } from 'react';
import { api } from '../services/api';
import { LayoutDashboard, AlertCircle, Users } from 'lucide-react';
import KPICard from '../components/dashboard/KPICard';

import { useFilters } from '../context/FilterContext';

import { getLabel } from '../utils/labels';

import { useQuery } from '../hooks/useQuery';

export default function PlaceholderPage({ title, endpoint }: { title: string, endpoint?: string }) {
  const { department, semester, search } = useFilters();
  
  const [minAtt, setMinAtt] = useState<number>(0);
  const [maxAtt, setMaxAtt] = useState<number>(100);
  
  const queryKey = endpoint ? `report-${endpoint}-${department}-${semester}` : null;
  
  const { data, loading, error } = useQuery(
    queryKey, 
    () => api.getReport(endpoint as string, { department, semester })
  );

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    let list = data.students;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s: any) => 
        s.name?.toLowerCase().includes(q) || 
        s.id?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data?.students, search]);

  const filteredFlaggedStudents = useMemo(() => {
    if (!data?.flagged_students) return [];
    let list = data.flagged_students;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s: any) => 
        s.name?.toLowerCase().includes(q) || 
        s.id?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    }
    if (title === "Attendance Overview") {
      list = list.filter((s: any) => {
        const att = s.attendance_rate;
        if (att == null) return false;
        return att >= minAtt && att <= maxAtt;
      });
    }
    return list;
  }, [data?.flagged_students, search, title, minAtt, maxAtt]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="mb-6">
        <h2 className="text-[28px] font-semibold text-text-main tracking-tight">{title}</h2>
        <p className="mt-1 text-[13px] text-text-muted">
          Detailed metrics and insights for {title.toLowerCase()}.
        </p>
      </div>

      {error && data?.has_data && (
        <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-3 flex items-start gap-2 shadow-sm mb-6 text-[12px] text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p>Unable to refresh latest data in the background. Showing previously cached values.</p>
        </div>
      )}

      {loading && !data ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
             <div className="bg-card border border-card-border rounded-[16px] h-24"></div>
             <div className="bg-card border border-card-border rounded-[16px] h-24"></div>
          </div>
          <div className="bg-card border border-card-border rounded-[16px] h-64"></div>
        </div>
      ) : error && !data ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-[12px] flex items-start gap-3 border border-red-100 mb-6">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div className="text-[13px]">
            <strong>Check that the backend is running and the connection is configured correctly.</strong> ({error.message})
          </div>
        </div>
      ) : data?.has_data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.metrics && Object.entries(data.metrics).map(([key, val]: any) => (
              <KPICard 
                key={key}
                title={getLabel(key)}
                value={val}
                icon={LayoutDashboard}
                caption="Computed from database"
              />
            ))}
          </div>
          
          {filteredStudents.length > 0 && (
            <div className="bg-card border border-card-border rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden">
               <div className="p-5 border-b border-card-border">
                 <h3 className="text-[15px] font-semibold text-text-main mb-1">Related Students</h3>
               </div>
               <div className="overflow-auto bg-card max-h-[400px]">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-surface border-b border-card-border text-text-muted sticky top-0">
                      <tr>
                        <th className="font-medium px-4 py-2">ID</th>
                        <th className="font-medium px-4 py-2">Name</th>
                        <th className="font-medium px-4 py-2">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {filteredStudents.map((student: any, i: number) => (
                        <tr key={i} className="hover:bg-surface transition-colors">
                          <td className="px-4 py-2.5 font-medium text-text-main">{student.id}</td>
                          <td className="px-4 py-2.5">{student.name}</td>
                          <td className="px-4 py-2.5 font-medium text-text-muted">
                             {student.academic_score || student.placement_score || student.success_score || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {title === "Attendance Overview" && (
            <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-[15px] font-semibold text-text-main">Attendance Filters</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => {setMinAtt(0); setMaxAtt(100);}} className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border ${minAtt === 0 && maxAtt === 100 ? 'bg-[#172B4D] text-white border-[#172B4D]' : 'bg-card border-card-border text-text-muted hover:text-text-main'}`}>All (0-100%)</button>
                  <button onClick={() => {setMinAtt(0); setMaxAtt(49);}} className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border ${minAtt === 0 && maxAtt === 49 ? 'bg-[#172B4D] text-white border-[#172B4D]' : 'bg-card border-card-border text-text-muted hover:text-text-main'}`}>Critical (&lt;50%)</button>
                  <button onClick={() => {setMinAtt(50); setMaxAtt(74);}} className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border ${minAtt === 50 && maxAtt === 74 ? 'bg-[#172B4D] text-white border-[#172B4D]' : 'bg-card border-card-border text-text-muted hover:text-text-main'}`}>Low (50-74%)</button>
                  <button onClick={() => {setMinAtt(75); setMaxAtt(100);}} className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border ${minAtt === 75 && maxAtt === 100 ? 'bg-[#172B4D] text-white border-[#172B4D]' : 'bg-card border-card-border text-text-muted hover:text-text-main'}`}>Good (75-100%)</button>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-[12px] text-text-muted font-medium">Min:</label>
                    <input 
                      type="number" 
                      min="0" max="100" 
                      value={minAtt} 
                      onChange={(e) => setMinAtt(Math.min(Number(e.target.value), maxAtt))}
                      className="w-16 px-2 py-1 bg-surface border border-card-border rounded-md text-[13px] text-text-main focus:outline-none focus:border-[#172B4D] focus:ring-1 focus:ring-[#172B4D]"
                    />
                  </div>
                  
                  <div className="flex-1 relative h-1.5 bg-[#E4E6EA] rounded-full flex items-center">
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={minAtt} 
                      onChange={(e) => setMinAtt(Math.min(Number(e.target.value), maxAtt))}
                      className="absolute w-full h-1.5 opacity-0 cursor-pointer pointer-events-auto"
                      style={{ zIndex: 5 }}
                    />
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={maxAtt} 
                      onChange={(e) => setMaxAtt(Math.max(Number(e.target.value), minAtt))}
                      className="absolute w-full h-1.5 opacity-0 cursor-pointer pointer-events-auto"
                      style={{ zIndex: 6 }}
                    />
                    {/* Active Track */}
                    <div 
                      className="absolute h-1.5 bg-[#172B4D] rounded-full pointer-events-none" 
                      style={{ left: `${minAtt}%`, right: `${100 - maxAtt}%`, zIndex: 1 }} 
                    />
                    {/* Min Thumb */}
                    <div
                      className="absolute w-4 h-4 bg-[#172B4D] border-2 border-white rounded-full pointer-events-none shadow-sm"
                      style={{ left: `calc(${minAtt}% - 8px)`, zIndex: 2 }}
                    />
                    {/* Max Thumb */}
                    <div
                      className="absolute w-4 h-4 bg-[#172B4D] border-2 border-white rounded-full pointer-events-none shadow-sm"
                      style={{ left: `calc(${maxAtt}% - 8px)`, zIndex: 3 }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[12px] text-text-muted font-medium">Max:</label>
                    <input 
                      type="number" 
                      min="0" max="100" 
                      value={maxAtt} 
                      onChange={(e) => setMaxAtt(Math.max(Number(e.target.value), minAtt))}
                      className="w-16 px-2 py-1 bg-surface border border-card-border rounded-md text-[13px] text-text-main focus:outline-none focus:border-[#172B4D] focus:ring-1 focus:ring-[#172B4D]"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={() => {setMinAtt(0); setMaxAtt(100);}}
                  className="text-[13px] text-text-muted hover:text-text-main transition-colors px-2 py-1"
                >
                  Clear Filters
                </button>
              </div>
              <div className="mt-3 text-[12px] text-text-muted flex justify-between">
                <span>Selected Range: {minAtt}% - {maxAtt}%</span>
                <span>{filteredFlaggedStudents.length} students found</span>
              </div>
            </div>
          )}

          {filteredFlaggedStudents.length > 0 && (
            <div className="bg-card border border-card-border rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden">
               <div className="p-5 border-b border-card-border">
                 <h3 className="text-[15px] font-semibold text-text-main mb-1">Flagged Students</h3>
               </div>
               <div className="overflow-auto bg-card max-h-[400px]">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-surface border-b border-card-border text-text-muted sticky top-0">
                      <tr>
                        <th className="font-medium px-4 py-2">ID</th>
                        <th className="font-medium px-4 py-2">Name</th>
                        <th className="font-medium px-4 py-2">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {filteredFlaggedStudents.map((student: any, i: number) => (
                        <tr key={i} className="hover:bg-surface transition-colors">
                          <td className="px-4 py-2.5 font-medium text-text-main">{student.id}</td>
                          <td className="px-4 py-2.5">{student.name}</td>
                          <td className="px-4 py-2.5 font-medium text-text-muted">
                             {student.attendance_rate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 px-6 bg-card border border-card-border rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="mx-auto h-12 w-12 text-text-muted flex justify-center items-center bg-surface rounded-full mb-4">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="text-[15px] font-semibold text-text-main">No {title.toLowerCase()} data found</h3>
          <p className="mt-1.5 text-[13px] text-text-muted max-w-sm mx-auto">
            Insufficient data or no students match the current filters.
          </p>
        </div>
      )}
    </div>
  );
}
