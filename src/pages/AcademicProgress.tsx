import { useMemo, useState } from 'react';
import { AlertTriangle, Users, TrendingUp, Award, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { useQuery } from '../hooks/useQuery';
import { api } from '../services/api';
import { useFilters } from '../context/FilterContext';
import StudentDetailModal from '../components/students/StudentDetailModal';

const COLORS = {
  navy: '#172B4D',
  orange: '#F47735',
  peach: '#FFB080',
  slate: '#8793A5'
};

export default function AcademicProgress() {
  const { department, semester } = useFilters();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedScoreRange, setSelectedScoreRange] = useState<string | null>(null);

  const { data: studentsData, loading } = useQuery(
    `students-academic-${department}-${semester}`,
    () => api.getStudents({ department, semester })
  );

  const students = studentsData?.data || [];

  // Metrics Calculations
  const metrics = useMemo(() => {
    if (!students.length) return { avgScore: 0, flaggedCount: 0, avgCGPA: 0, total: 0, backlogCount: 0 };
    
    let totalScore = 0;
    let scoreCount = 0;
    let flagged = 0;
    let totalCGPA = 0;
    let cgpaCount = 0;
    let hasBacklogs = 0;
    
    students.forEach((s: any) => {
      const score = s.academic_score;
      if (score !== undefined && score !== null) {
        totalScore += score;
        scoreCount++;
        if (score < 60) flagged++;
      }

      const cgpa = s.raw_data?.cgpa;
      if (cgpa !== undefined && cgpa !== null) {
        totalCGPA += cgpa;
        cgpaCount++;
      }

      const backlogs = s.raw_data?.backlog_count || 0;
      if (backlogs > 0) hasBacklogs++;
    });

    return {
      avgScore: scoreCount ? Math.round(totalScore / scoreCount) : 0,
      flaggedCount: flagged,
      avgCGPA: cgpaCount ? (totalCGPA / cgpaCount).toFixed(2) : 0,
      backlogCount: hasBacklogs,
      total: students.length
    };
  }, [students]);

  // Chart Data Calculations
  const chartData = useMemo(() => {
    const dist = [
      { name: '0-39', count: 0, range: [0, 39] },
      { name: '40-59', count: 0, range: [40, 59] },
      { name: '60-79', count: 0, range: [60, 79] },
      { name: '80-100', count: 0, range: [80, 100] }
    ];

    const backlogCounts: Record<string, number> = {
      '0': 0, '1': 0, '2': 0, '3+': 0
    };

    const cgpaVsCompletion: any[] = [];

    students.forEach((s: any) => {
      const score = s.academic_score || 0;
      if (score < 40) dist[0].count++;
      else if (score < 60) dist[1].count++;
      else if (score < 80) dist[2].count++;
      else dist[3].count++;

      const backlogs = s.raw_data?.backlog_count || 0;
      if (backlogs === 0) backlogCounts['0']++;
      else if (backlogs === 1) backlogCounts['1']++;
      else if (backlogs === 2) backlogCounts['2']++;
      else backlogCounts['3+']++;

      const cgpa = s.raw_data?.cgpa;
      const completion = s.raw_data?.assignment_completion_rate;
      if (cgpa !== undefined && completion !== undefined) {
        cgpaVsCompletion.push({ name: s.name, cgpa, completion });
      }
    });

    return {
      distribution: dist,
      backlogs: [
        { name: 'No Backlogs', value: backlogCounts['0'], color: COLORS.navy },
        { name: '1 Backlog', value: backlogCounts['1'], color: COLORS.peach },
        { name: '2 Backlogs', value: backlogCounts['2'], color: COLORS.orange },
        { name: '3+ Backlogs', value: backlogCounts['3+'], color: COLORS.slate }
      ],
      cgpaVsCompletion
    };
  }, [students]);

  // Table Data Filtering
  const tableStudents = useMemo(() => {
    let filtered = students;
    if (selectedScoreRange) {
      const rangeDef = chartData.distribution.find(d => d.name === selectedScoreRange);
      if (rangeDef) {
        filtered = filtered.filter((s: any) => {
          const score = s.academic_score || 0;
          return score >= rangeDef.range[0] && score <= rangeDef.range[1];
        });
      }
    }
    // Sort by lowest academic score first
    return filtered.sort((a: any, b: any) => (a.academic_score || 0) - (b.academic_score || 0));
  }, [students, selectedScoreRange, chartData.distribution]);

  if (loading) {
    return <div className="p-8 text-center text-text-muted">Loading academic data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="mb-6">
        <h2 className="text-[28px] font-semibold text-[#191919] tracking-tight">Academic Progress</h2>
        <p className="mt-1 text-[13px] text-text-muted">
          Analyze student performance, CGPA distribution, and academic risk factors.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Average Academic Score" value={`${metrics.avgScore}%`} icon={Award} color="text-[#191919]" bg="bg-surface" />
        <MetricCard title="Flagged (Score < 60)" value={metrics.flaggedCount} icon={AlertTriangle} color="text-[#F47735]" bg="bg-orange-50" />
        <MetricCard title="Average CGPA" value={metrics.avgCGPA} icon={TrendingUp} color="text-[#191919]" bg="bg-surface" />
        <MetricCard title="Total Students" value={metrics.total} icon={Users} color="text-text-muted" bg="bg-surface" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Metric Bar Chart */}
        <div className="bg-card border border-card-border rounded-[16px] p-5 lg:col-span-2 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[15px] font-semibold text-[#191919]">Academic Score Distribution</h3>
            {selectedScoreRange && (
              <button 
                onClick={() => setSelectedScoreRange(null)} 
                className="text-[12px] text-text-muted hover:text-text-main"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="h-[280px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6EA" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.slate }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.slate }} />
                <RechartsTooltip cursor={{ fill: '#F4F5F7' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E4E6EA' }} />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={50}
                  onClick={(data: any) => {
                    setSelectedScoreRange(data.name === selectedScoreRange ? null : (data.name as string));
                  }}
                  cursor="pointer"
                >
                  {chartData.distribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={selectedScoreRange ? (selectedScoreRange === entry.name ? COLORS.orange : COLORS.slate) : COLORS.orange} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-text-muted text-center">Click a bar to filter students</p>
        </div>

        {/* Backlogs Distribution Pie Chart */}
        <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col">
          <h3 className="text-[15px] font-semibold text-[#191919] mb-4">Backlogs Distribution</h3>
          <div className="h-[280px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.backlogs}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.backlogs.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E4E6EA' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {chartData.backlogs.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-[12px] text-text-muted">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                {s.name} ({s.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scatter & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h3 className="text-[15px] font-semibold text-[#191919] mb-4">CGPA vs Assignments</h3>
          <div className="h-[300px]">
            {chartData.cgpaVsCompletion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E6EA" />
                  <XAxis type="number" dataKey="completion" name="Completion Rate %" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.slate }} label={{ value: 'Assignment Completion %', position: 'bottom', fill: COLORS.slate, fontSize: 12, dy: 10 }} />
                  <YAxis type="number" dataKey="cgpa" name="CGPA" domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.slate }} label={{ value: 'CGPA', angle: -90, position: 'insideLeft', fill: COLORS.slate, fontSize: 12 }} />
                  <ZAxis type="number" range={[50, 50]} />
                  <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E4E6EA' }} />
                  <Scatter name="Students" data={chartData.cgpaVsCompletion} fill={COLORS.navy} opacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[13px] text-text-muted">
                Detailed CGPA or Assignment data unavailable.
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden">
          <div className="p-5 border-b border-card-border flex justify-between items-center">
            <h3 className="text-[15px] font-semibold text-[#191919]">
              {selectedScoreRange ? `Students in ${selectedScoreRange}` : 'Student Academic Overview'}
            </h3>
            <span className="text-[12px] text-text-muted">{tableStudents.length} students</span>
          </div>
          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface border-b border-card-border text-text-muted sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">CGPA</th>
                  <th className="px-4 py-3 font-medium text-center">Backlogs</th>
                </tr>
              </thead>
              <div className="contents divide-y divide-zinc-200">
                {tableStudents.map((student: any) => {
                  const isAtRisk = student.academic_score !== undefined && student.academic_score < 60;
                  return (
                    <tr key={student.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedStudent(student)} className="font-medium text-[#191919] hover:text-orange-primary text-left flex items-center gap-1.5">
                          {student.name}
                          {isAtRisk && <AlertCircle className="w-3.5 h-3.5 text-orange-primary" />}
                        </button>
                        <p className="text-[11px] text-text-muted">{student.id} &bull; Sem {student.raw_data?.semester || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${isAtRisk ? 'text-orange-primary' : 'text-[#191919]'}`}>
                          {student.academic_score !== undefined ? student.academic_score : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {student.raw_data?.cgpa !== undefined ? student.raw_data.cgpa.toFixed(2) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {student.raw_data?.backlog_count > 0 ? (
                          <span className="px-2 py-0.5 bg-orange-50 text-orange-primary rounded-[8px] text-[11px] font-medium border border-orange-100">
                            {student.raw_data.backlog_count}
                          </span>
                        ) : (
                          <span className="text-text-muted">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </div>
            </table>
            {tableStudents.length === 0 && (
              <div className="p-8 text-center text-text-muted text-[13px]">
                No students match the current filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-[10px] ${bg} ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className="text-[13px] font-medium text-text-muted mb-1">{title}</h3>
      <div className="flex items-end gap-2">
        <span className="text-[24px] font-semibold text-[#191919] leading-none">{value}</span>
      </div>
    </div>
  );
}
