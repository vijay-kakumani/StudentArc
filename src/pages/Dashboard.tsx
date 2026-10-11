import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  GraduationCap, 
  Briefcase, 
  Database,
  Upload,
  Info,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LabelList, LineChart, Line
} from 'recharts';
import KPICard from '../components/dashboard/KPICard';
import { api } from '../services/api';

import { useFilters } from '../context/FilterContext';
import { useQuery } from '../hooks/useQuery';

const ChartCard = ({ title, children, description }: { title: string, children: React.ReactNode, description?: string }) => (
  <div className="bg-card border border-card-border rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col h-[400px] min-w-0">
    <h3 className="text-[15px] font-semibold text-text-main mb-1 shrink-0">{title}</h3>
    {description && <p className="text-[13px] text-text-muted mb-4 shrink-0 line-clamp-2">{description}</p>}
    <div className="flex-1 w-full min-w-0 min-h-0 relative">
      {children}
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { department, semester, setDepartment, setScoreBand, setSupportFlag } = useFilters();
  
  const handleScoreBandClick = (data: any) => {
    if (data && data.name) {
      setScoreBand(data.name);
      navigate('/students');
    }
  };

  const handleDeptDimensionClick = (data: any, dataKey: string) => {
    if (data && data.name) {
      setDepartment(data.name);
      if (dataKey === 'academic') setSupportFlag('Academic');
      else if (dataKey === 'placement') setSupportFlag('Placement');
      navigate('/students');
    }
  };

  const handleHealthClick = (data: any) => {
    if (data && data.name) {
      if (data.name === 'Attendance') {
         setSupportFlag('Attendance');
         navigate('/students');
      }
    }
  };

  const queryKey = `dashboard-${department}-${semester}`;
  
  const { data: dashboardData, loading, error } = useQuery(
    queryKey,
    () => api.getDashboardSummary({ department, semester })
  );

  const hasData = dashboardData?.has_data ?? false;
  const metrics = dashboardData?.metrics ?? null;
  const charts = dashboardData?.charts ?? null;
  const priorityQueue = dashboardData?.priority_queue ?? [];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="text-[28px] font-semibold text-text-main tracking-tight">Student Success Dashboard</h2>
          <p className="mt-1 text-[13px] text-text-muted max-w-2xl">
            Understand student performance, identify support needs, and plan meaningful interventions.
          </p>
        </div>
        {!hasData && !loading && (
          <Link
            to="/data-hub"
            className="hidden md:inline-flex items-center px-4 py-2 border border-transparent text-[13px] font-medium rounded-lg shadow-sm text-white bg-text-main hover:opacity-90 transition-opacity"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import College Data
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard 
          title="Students Analyzed" 
          value={loading ? "..." : (metrics?.totalStudentsAnalyzed ?? "Not available")} 
          icon={Users} 
          caption={loading ? "Loading..." : "Number of student records successfully processed."} 
        />
        <KPICard 
          title="Average Student Success Score" 
          value={loading ? "..." : (metrics?.averageSuccessScore ?? "Not available")} 
          icon={TrendingUp} 
          caption={loading ? "Loading..." : (!metrics?.averageSuccessScore ? "Some required indicators are missing." : "Average calculated score for students with sufficient data.")} 
          tooltip="A unified 0-100 score tracking academic progress and learning engagement."
        />
        <KPICard 
          title="Students Needing Academic Support" 
          value={loading ? "..." : (metrics?.academicSupportReviews ?? "Not available")} 
          icon={GraduationCap} 
          caption={loading ? "Loading..." : "Students whose academic indicators meet the configured review rules."} 
          tooltip="Flagged when Academic Progress drops below 60."
        />
        <KPICard 
          title="Students Needing Placement Support" 
          value={loading ? "..." : (metrics?.placementSupportReviews ?? "Not available")} 
          icon={Briefcase} 
          caption={loading ? "Loading..." : "Students whose available placement indicators meet the configured review rules."} 
          tooltip="Flagged when Placement Preparation drops below 60."
        />
        <KPICard 
          title="Data Completeness" 
          value={loading ? "..." : (metrics?.dataCompleteness ? `${metrics.dataCompleteness}%` : "Not available")} 
          icon={Database} 
          caption={loading ? "Loading..." : "How much of the required information is available for analysis."} 
        />
      </div>

      {error && !hasData && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 shadow-sm mb-6">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-[14px] font-semibold text-red-900">Failed to load dashboard</h4>
            <p className="text-[13px] text-red-700 mt-0.5">Check that the backend is running and the connection is configured correctly. ({error.message})</p>
          </div>
        </div>
      )}

      {error && hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 shadow-sm mb-6 text-[12px] text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p>Unable to refresh latest data in the background. Showing previously cached values.</p>
        </div>
      )}

      {!hasData && !loading && !error ? (
        <div className="bg-card border border-card-border rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-text-muted mt-0.5" />
          <div className="flex-1">
            <h4 className="text-[14px] font-semibold text-text-main">No student data imported yet</h4>
            <p className="text-[13px] text-text-muted mt-0.5">
              Please navigate to the Data Hub to upload your college CSV or XLSX file. The dashboard will populate automatically once records are processed.
            </p>
          </div>
          <Link
            to="/data-hub"
            className="md:hidden inline-flex items-center px-3 py-1.5 border border-transparent text-[13px] font-medium rounded-lg text-white bg-text-main hover:opacity-90 transition-opacity"
          >
            Import Data
          </Link>
        </div>
      ) : hasData && charts ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Attendance and Learning Activity" description="Compare average attendance, assignment completion, and online learning activity.">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.health} layout="vertical" margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E6EA" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8793A5', fontSize: 12}} width={100} />
                  <Tooltip cursor={{fill: '#F4F5F7'}} contentStyle={{backgroundColor: '#fff', border: '1px solid #E4E6EA', borderRadius: '8px'}} formatter={(value: any) => [`${value}`, 'Score']} wrapperStyle={{ zIndex: 50 }} />
                  <Bar dataKey="value" fill="#F47735" radius={[0, 4, 4, 0]} barSize={28} onClick={handleHealthClick} cursor="pointer">
                    <LabelList dataKey="value" position="right" fill="#8793A5" fontSize={12} fontWeight={500} formatter={(val: any) => val} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Average Success Score by Semester Cohort" description="Compare average calculated scores across different semester groups.">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.semester} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6EA" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8793A5', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8793A5', fontSize: 12}} domain={[0, 100]} />
                  <Tooltip cursor={{stroke: '#E4E6EA', strokeWidth: 1, strokeDasharray: '3 3'}} contentStyle={{backgroundColor: '#fff', border: '1px solid #E4E6EA', borderRadius: '8px'}} formatter={(value: any) => [`${value}`, 'Average Score']} wrapperStyle={{ zIndex: 50 }} />
                  <Line type="monotone" dataKey="score" name="Average Score" stroke="#F47735" strokeWidth={3} dot={{ r: 4, fill: '#172B4D', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#172B4D', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="How Student Scores Are Distributed" description="See how many students fall into each documented Student Success Score range.">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap={1}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6EA" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8793A5', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8793A5', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#F4F5F7'}} contentStyle={{backgroundColor: '#fff', border: '1px solid #E4E6EA', borderRadius: '8px'}} formatter={(value: any) => [`${value} Students`, 'Count']} wrapperStyle={{ zIndex: 50 }} />
                  <Bar dataKey="count" name="Students" fill="#172B4D" radius={[2, 2, 0, 0]} onClick={handleScoreBandClick} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Student Feedback Distribution" description="Distribution of students among mutually exclusive feedback star ratings.">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.feedback} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="count" nameKey="rating">
                    {charts.feedback.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#F47735', '#FFB080', '#172B4D', '#8793A5', '#E1E2E5'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value} Students`, name]} contentStyle={{backgroundColor: '#fff', border: '1px solid #E4E6EA', borderRadius: '8px'}} wrapperStyle={{ zIndex: 50 }} />
                  <Legend iconType="circle" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '12px', color: '#8793A5', paddingTop: '20px'}} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Academic vs Placement Readiness" description="Compare academic performance with placement preparation to identify different support needs.">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.departments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6EA" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8793A5', fontSize: 11}} dy={10} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8793A5', fontSize: 12}} domain={[0, 100]} />
                  <Tooltip cursor={{fill: '#F4F5F7'}} contentStyle={{backgroundColor: '#fff', border: '1px solid #E4E6EA', borderRadius: '8px'}} wrapperStyle={{ zIndex: 50 }} />
                  <Legend iconType="circle" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '12px', color: '#8793A5', paddingTop: '20px'}} />
                  <Bar name="Academic" dataKey="academic" fill="#F47735" radius={[4, 4, 0, 0]} maxBarSize={20} onClick={(data) => handleDeptDimensionClick(data, 'academic')} cursor="pointer" />
                  <Bar name="Placement" dataKey="placement" fill="#172B4D" radius={[4, 4, 0, 0]} maxBarSize={20} onClick={(data) => handleDeptDimensionClick(data, 'placement')} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="bg-card border border-card-border rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-[400px] min-w-0 overflow-hidden">
              <div className="p-5 border-b border-card-border shrink-0">
                <h3 className="text-[15px] font-semibold text-text-main mb-1">Students to Review First</h3>
                <p className="text-[13px] text-text-muted">Students whose available indicators suggest that faculty review may be useful.</p>
              </div>
              <div className="flex-1 overflow-auto bg-surface/50">
                {priorityQueue.length === 0 ? (
                  <div className="p-6 text-center text-text-muted text-[13px]">No students require priority review.</div>
                ) : (
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-surface border-b border-card-border text-text-muted sticky top-0">
                      <tr>
                        <th className="font-medium px-4 py-2">Student</th>
                        <th className="font-medium px-4 py-2">Reason</th>
                        <th className="font-medium px-4 py-2">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border bg-card">
                      {priorityQueue.map((student: any, i: number) => {
                        let scoreLabel = 'Score';
                        if (student.reason === 'Academic Risk') scoreLabel = 'Academic Score';
                        else if (student.reason === 'Placement Risk') scoreLabel = 'Placement Score';
                        
                        return (
                          <tr key={i} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => navigate(`/students/${student.id}`)}>
                            <td className="px-4 py-2.5 font-medium text-text-main">{student.name}</td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-card-border text-text-main bg-surface">
                                <AlertCircle className="w-3 h-3" />
                                {student.reason}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-text-main font-medium">
                               <div className="flex flex-col">
                                 <span>{student.score}</span>
                                 <span className="text-[10px] text-text-muted">{scoreLabel}</span>
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
