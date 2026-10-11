import { useMemo } from 'react';
import { Briefcase, AlertTriangle, Users, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { useQuery } from '../hooks/useQuery';
import { api } from '../services/api';
import { useFilters } from '../context/FilterContext';
import StudentDetailModal from '../components/students/StudentDetailModal';
import { useState } from 'react';

const COLORS = {
  navy: '#172B4D',
  orange: '#F47735',
  peach: '#FFB080',
  slate: '#8793A5'
};

export default function PlacementPreparation() {
  const { department, semester } = useFilters();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const { data: studentsData, loading } = useQuery(
    `students-placement-${department}-${semester}`,
    () => api.getStudents({ department, semester })
  );

  const students = studentsData?.data || [];

  // Metrics Calculations
  const metrics = useMemo(() => {
    if (!students.length) return { avgScore: 0, flaggedCount: 0, placedCount: 0, total: 0 };
    
    let totalScore = 0;
    let flagged = 0;
    let placed = 0;
    
    students.forEach((s: any) => {
      const score = s.placement_score || 0;
      totalScore += score;
      if (score < 60) flagged++;
      if (s.placement_status === 'Placed') placed++;
    });

    return {
      avgScore: Math.round(totalScore / students.length),
      flaggedCount: flagged,
      placedCount: placed,
      total: students.length
    };
  }, [students]);

  // Chart Data Calculations
  const chartData = useMemo(() => {
    // 1. Score Distribution
    const dist = [
      { name: '0-40', count: 0 },
      { name: '41-60', count: 0 },
      { name: '61-80', count: 0 },
      { name: '81-100', count: 0 }
    ];

    // 2. Status Distribution
    const statusCounts: Record<string, number> = {
      'Placed': 0,
      'Interviewing': 0,
      'Not Ready': 0
    };

    // 3. Technical vs Soft Skills
    const skillsScatter = students.map((s: any) => ({
      name: s.name,
      technical: s.technical_skills || 0,
      soft: s.soft_skills || 0
    }));

    students.forEach((s: any) => {
      const score = s.placement_score || 0;
      if (score <= 40) dist[0].count++;
      else if (score <= 60) dist[1].count++;
      else if (score <= 80) dist[2].count++;
      else dist[3].count++;

      const status = s.placement_status || 'Not Ready';
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      } else {
        statusCounts['Not Ready']++;
      }
    });

    return {
      distribution: dist,
      status: [
        { name: 'Placed', value: statusCounts['Placed'], color: COLORS.navy },
        { name: 'Interviewing', value: statusCounts['Interviewing'], color: COLORS.peach },
        { name: 'Not Ready', value: statusCounts['Not Ready'], color: COLORS.slate }
      ],
      skills: skillsScatter
    };
  }, [students]);

  const flaggedStudents = useMemo(() => {
    return students.filter((s: any) => (s.placement_score || 0) < 60).sort((a: any, b: any) => (a.placement_score || 0) - (b.placement_score || 0));
  }, [students]);

  if (loading) {
    return <div className="p-8 text-center text-text-muted">Loading placement data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="mb-6">
        <h2 className="text-[28px] font-semibold text-[#191919] tracking-tight">Placement Preparation</h2>
        <p className="mt-1 text-[13px] text-text-muted">
          Analyze placement readiness, interview performance, and skill gaps.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Average Readiness" value={`${metrics.avgScore}%`} icon={TrendingUp} color="text-[#191919]" bg="bg-surface" />
        <MetricCard title="Flagged Students" value={metrics.flaggedCount} icon={AlertTriangle} color="text-orange-primary" bg="bg-orange-50" />
        <MetricCard title="Placed Students" value={metrics.placedCount} icon={Briefcase} color="text-[#191919]" bg="bg-surface" />
        <MetricCard title="Total Students" value={metrics.total} icon={Users} color="text-text-muted" bg="bg-surface" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Metric Bar Chart */}
        <div className="bg-card border border-card-border rounded-[16px] p-5 lg:col-span-2 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h3 className="text-[15px] font-semibold text-[#191919] mb-4">Placement Readiness Distribution</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6EA" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.slate }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.slate }} />
                <RechartsTooltip cursor={{ fill: '#F4F5F7' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E4E6EA' }} />
                <Bar dataKey="count" fill={COLORS.orange} radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col">
          <h3 className="text-[15px] font-semibold text-[#191919] mb-4">Current Status</h3>
          <div className="h-[280px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.status}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E4E6EA' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {chartData.status.map(s => (
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
          <h3 className="text-[15px] font-semibold text-[#191919] mb-4">Technical vs Soft Skills</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E6EA" />
                <XAxis type="number" dataKey="technical" name="Technical" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.slate }} label={{ value: 'Technical Skills', position: 'bottom', fill: COLORS.slate, fontSize: 12 }} />
                <YAxis type="number" dataKey="soft" name="Soft Skills" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.slate }} label={{ value: 'Soft Skills', angle: -90, position: 'insideLeft', fill: COLORS.slate, fontSize: 12 }} />
                <ZAxis type="number" range={[50, 50]} />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E4E6EA' }} />
                <Scatter name="Students" data={chartData.skills} fill={COLORS.navy} opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden">
          <div className="p-5 border-b border-card-border">
            <h3 className="text-[15px] font-semibold text-[#191919]">Flagged Students (Score &lt; 60)</h3>
          </div>
          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface border-b border-card-border text-text-muted sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <div className="contents divide-y divide-zinc-200">
                {flaggedStudents.map((student: any) => (
                  <tr key={student.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedStudent(student)} className="font-medium text-[#191919] hover:text-orange-primary text-left">
                        {student.name}
                      </button>
                      <p className="text-[11px] text-text-muted">{student.id} &bull; {student.department}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-orange-primary">{student.placement_score}</span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {student.placement_status || 'Not Ready'}
                    </td>
                  </tr>
                ))}
              </div>
            </table>
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
