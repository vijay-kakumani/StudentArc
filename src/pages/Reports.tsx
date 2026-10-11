import { useState, useMemo } from 'react';
import { 
  Download, Printer, RefreshCw, AlertTriangle, Users, 
  CheckCircle2, AlertCircle, Sparkles, Filter, 
  BarChart3, BookOpen, Briefcase, 
  ShieldCheck, X, Search, ExternalLink
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { useQuery, invalidateAllQueries } from '../hooks/useQuery';
import { api } from '../services/api';
import { useFilters } from '../context/FilterContext';
import KPICard from '../components/dashboard/KPICard';
import StudentDetailModal from '../components/students/StudentDetailModal';
import { Link } from 'react-router-dom';

const BRAND = {
  navy: '#172B4D',
  orange: '#F47735',
  peach: '#FFB080',
  slate: '#8793A5',
  surface: '#F4F5F7',
  card: '#FFFFFF',
  border: '#E4E6EA',
  text: '#191919'
};

type ReportCategory = 'success' | 'academic' | 'placement' | 'segments' | 'quality';

export default function Reports() {
  const { department, semester, search: globalSearch } = useFilters();

  const [activeTab, setActiveTab] = useState<ReportCategory>('success');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'flagged' | 'good' | 'high'>('all');
  const [activeChartFilter, setActiveChartFilter] = useState<{ type: string; value: string; label: string } | null>(null);
  const [refreshCount, setRefreshCount] = useState<number>(0);
  
  // Student modal
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // 1. Fetch comprehensive reports summary from backend
  const queryKey = `reports-summary-${department}-${semester}-${refreshCount}`;
  const { data, loading, error } = useQuery(
    queryKey,
    () => api.getReport('reports/summary', { department, semester })
  );

  // 2. Fetch AI Insights Brief
  const insightsQueryKey = `reports-insights-${department}-${semester}-${refreshCount}`;
  const { data: insightsData } = useQuery(
    insightsQueryKey,
    () => api.getReportInsights({ department, semester })
  );

  // 3. Fetch import history for data quality tab
  const { data: importHistoryData } = useQuery(
    `reports-import-history-${refreshCount}`,
    () => api.getImportHistory()
  );

  const rawStudents = useMemo(() => {
    return data?.students || [];
  }, [data?.students]);

  // Combined search term
  const effectiveSearch = localSearch.trim() || globalSearch.trim();

  // Filter students based on search, riskFilter, and activeChartFilter
  const filteredStudents = useMemo(() => {
    let list = rawStudents;

    // Search filter
    if (effectiveSearch) {
      const q = effectiveSearch.toLowerCase();
      list = list.filter((s: any) => 
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.id && s.id.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q))
      );
    }

    // Risk Filter
    if (riskFilter === 'flagged') {
      list = list.filter((s: any) => s.is_academic_risk || s.is_placement_risk);
    } else if (riskFilter === 'good') {
      list = list.filter((s: any) => !s.is_academic_risk && !s.is_placement_risk);
    } else if (riskFilter === 'high') {
      list = list.filter((s: any) => s.success_score && s.success_score >= 80);
    }

    // Interactive chart filter
    if (activeChartFilter) {
      const { type, value } = activeChartFilter;
      if (type === 'success_range') {
        const [min, max] = value.split('-').map(Number);
        list = list.filter((s: any) => {
          const sc = s.success_score ?? 0;
          return sc >= min && sc <= max;
        });
      } else if (type === 'academic_range') {
        const [min, max] = value.split('-').map(Number);
        list = list.filter((s: any) => {
          const sc = s.academic_score ?? 0;
          return sc >= min && sc <= max;
        });
      } else if (type === 'placement_range') {
        const [min, max] = value.split('-').map(Number);
        list = list.filter((s: any) => {
          const sc = s.placement_score ?? 0;
          return sc >= min && sc <= max;
        });
      } else if (type === 'risk_quadrant') {
        if (value === 'both') list = list.filter((s: any) => s.is_academic_risk && s.is_placement_risk);
        else if (value === 'acad_only') list = list.filter((s: any) => s.is_academic_risk && !s.is_placement_risk);
        else if (value === 'place_only') list = list.filter((s: any) => !s.is_academic_risk && s.is_placement_risk);
        else if (value === 'on_track') list = list.filter((s: any) => !s.is_academic_risk && !s.is_placement_risk);
      } else if (type === 'department') {
        list = list.filter((s: any) => s.department === value);
      } else if (type === 'segment') {
        if (value === 'lowEngagement') {
          list = list.filter((s: any) => (s.engagement_score ?? 100) < 50 && (s.academic_score ?? 0) >= 60);
        } else if (value === 'strongAcadWeakPlace') {
          list = list.filter((s: any) => (s.academic_score ?? 0) > 75 && (s.placement_score ?? 100) < 60);
        } else if (value === 'strongPlaceWeakAcad') {
          list = list.filter((s: any) => (s.placement_score ?? 0) > 75 && (s.academic_score ?? 100) < 60);
        } else if (value === 'bothRisk') {
          list = list.filter((s: any) => s.is_academic_risk && s.is_placement_risk);
        } else if (value === 'highAchievers') {
          list = list.filter((s: any) => s.success_score && s.success_score >= 85);
        }
      }
    }

    return list;
  }, [rawStudents, effectiveSearch, riskFilter, activeChartFilter]);

  // Paginated students
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  // Clear chart-to-table filter
  const handleClearChartFilter = () => {
    setActiveChartFilter(null);
    setCurrentPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setLocalSearch('');
    setRiskFilter('all');
    setActiveChartFilter(null);
    setCurrentPage(1);
  };

  // Refresh handler
  const handleRefresh = () => {
    invalidateAllQueries();
    setRefreshCount(c => c + 1);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredStudents.length) {
      alert('No students to export under current filters.');
      return;
    }

    const headers = [
      'Student ID', 'Student Name', 'Department', 'Semester',
      'Success Score', 'Academic Score', 'Placement Score', 'Engagement Score',
      'Attendance %', 'CGPA', 'Active Backlogs', 'Academic Risk', 'Placement Risk'
    ];

    const metadata = [
      `# StudentArc Institutional Analytics Report`,
      `# Report Category: ${activeTab.toUpperCase()}`,
      `# Filter Department: ${department || 'All Departments'}`,
      `# Filter Semester: ${semester || 'All Semesters'}`,
      `# Generated: ${new Date().toLocaleString()}`,
      `# Total Filtered Records: ${filteredStudents.length}`,
      ''
    ];

    const rows = filteredStudents.map((s: any) => [
      `"${s.id || 'N/A'}"`,
      `"${(s.name || 'N/A').replace(/"/g, '""')}"`,
      `"${s.department || 'N/A'}"`,
      `"${s.semester || 'N/A'}"`,
      s.success_score ?? 'N/A',
      s.academic_score ?? 'N/A',
      s.placement_score ?? 'N/A',
      s.engagement_score ?? 'N/A',
      s.attendance_rate ?? 'N/A',
      s.cgpa ?? 'N/A',
      s.backlog_count ?? 0,
      s.is_academic_risk ? 'YES (<60)' : 'NO',
      s.is_placement_risk ? 'YES (<60)' : 'NO'
    ]);

    const csvContent = '\uFEFF' + metadata.join('\n') + '\n' + headers.join(',') + '\n' + rows.map((r: any) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `StudentArc_${activeTab}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print layout trigger
  const handlePrint = () => {
    window.print();
  };

  // Summary Metrics from data
  const metrics = data?.metrics || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Print-Only Header */}
      <div className="hidden print:block mb-8 border-b border-gray-300 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">StudentArc — Reports & Insights Center</h1>
            <p className="text-sm text-gray-600 mt-1">Executive Academic & Placement Intelligence Audit</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Generated: {new Date().toLocaleString()}</div>
            <div>Department: {department || 'All'} | Semester: {semester || 'All'}</div>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-card-border pb-5 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-semibold text-text-main tracking-tight leading-none">
              Reports & Insights
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-medium bg-surface border border-card-border text-text-muted rounded">
              Audits & Analytics
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-muted">
            Institutional reporting center for student success distributions, academic progress, placement readiness, and data coverage audits.
          </p>
        </div>

        {/* Global Report Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-main bg-card hover:bg-surface border border-card-border rounded-lg transition-colors shadow-sm"
            title="Refresh latest calculation results"
          >
            <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
            Refresh
          </button>
          
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-text-main bg-card hover:bg-surface border border-card-border rounded-lg transition-colors shadow-sm"
            title="Print or Save Report as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-text-muted" />
            Print / PDF
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-[#172B4D] hover:bg-[#12223d] rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && !data && (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-card border border-card-border rounded-[16px] h-24" />
            ))}
          </div>
          <div className="bg-card border border-card-border rounded-[16px] h-72" />
        </div>
      )}

      {error && !data && (
        <div className="bg-red-50 text-red-700 p-5 rounded-[12px] border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div className="text-[13px]">
            <p className="font-semibold">Unable to load reports analytics.</p>
            <p className="mt-1 text-red-600">{error.message || 'Check backend connection.'}</p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Dynamic Summary Metrics (Top Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
            <KPICard
              title="Total Enrolled Students"
              value={metrics.totalStudents ?? 0}
              icon={Users}
              caption="Enrolled in active cohort"
            />
            <KPICard
              title="Students Analyzed"
              value={metrics.studentsAnalyzed ?? 0}
              icon={CheckCircle2}
              caption="Calculated indicator profiles"
            />
            <KPICard
              title="Academic Support Required"
              value={metrics.academicSupportReviews ?? 0}
              icon={AlertTriangle}
              caption="Academic score < 60.0"
            />
            <KPICard
              title="Placement Support Required"
              value={metrics.placementSupportReviews ?? 0}
              icon={Briefcase}
              caption="Placement readiness < 60.0"
            />
            <KPICard
              title="Avg Success Score"
              value={metrics.averageSuccessScore ? `${metrics.averageSuccessScore}/100` : 'N/A'}
              icon={BarChart3}
              caption="Deterministic weighted score"
            />
            <KPICard
              title="Avg Academic Score"
              value={metrics.averageAcademicScore ? `${metrics.averageAcademicScore}/100` : 'N/A'}
              icon={BookOpen}
              caption="CGPA & arrears weighted"
            />
            <KPICard
              title="Avg Placement Score"
              value={metrics.averagePlacementScore ? `${metrics.averagePlacementScore}/100` : 'N/A'}
              icon={Briefcase}
              caption="Coding, aptitude & mock interview"
            />
            <KPICard
              title="Data Completeness"
              value={metrics.dataCompleteness !== undefined ? `${metrics.dataCompleteness}%` : 'N/A'}
              icon={ShieldCheck}
              caption="Indicator coverage across records"
            />
          </div>

          {/* AI Executive Insights Banner */}
          {insightsData && (
            <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between border-b border-card-border pb-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-[#172B4D]/5 flex items-center justify-center text-[#172B4D]">
                    <Sparkles className="w-4 h-4 text-[#F47735]" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-text-main">
                      {insightsData.status === 'ai_generated' ? 'AI Executive Cohort Insight' : 'Deterministic Institutional Insight Brief'}
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Synthesized from real student aggregates • {department || 'All Departments'} • {semester ? `Semester ${semester}` : 'All Semesters'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface border border-card-border text-text-muted uppercase tracking-wider">
                  {insightsData.status === 'ai_generated' ? 'Verified LLM Brief' : 'Rule-Based Engine'}
                </span>
              </div>
              <div className="text-[13px] text-text-main leading-relaxed space-y-2 whitespace-pre-line prose prose-sm max-w-none text-[#191919]">
                {insightsData.explanation}
              </div>
            </div>
          )}

          {/* Interactive Report Navigation Tabs */}
          <div className="no-print border border-card-border bg-card rounded-[16px] p-1.5 flex gap-1 overflow-x-auto shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <button
              onClick={() => { setActiveTab('success'); setActiveChartFilter(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'success' 
                  ? 'bg-[#172B4D] text-white shadow-sm' 
                  : 'text-text-muted hover:text-text-main hover:bg-surface'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Student Success Report
            </button>

            <button
              onClick={() => { setActiveTab('academic'); setActiveChartFilter(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'academic' 
                  ? 'bg-[#172B4D] text-white shadow-sm' 
                  : 'text-text-muted hover:text-text-main hover:bg-surface'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Academic Performance Report
            </button>

            <button
              onClick={() => { setActiveTab('placement'); setActiveChartFilter(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'placement' 
                  ? 'bg-[#172B4D] text-white shadow-sm' 
                  : 'text-text-muted hover:text-text-main hover:bg-surface'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Placement Readiness Report
            </button>

            <button
              onClick={() => { setActiveTab('segments'); setActiveChartFilter(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'segments' 
                  ? 'bg-[#172B4D] text-white shadow-sm' 
                  : 'text-text-muted hover:text-text-main hover:bg-surface'
              }`}
            >
              <Users className="w-4 h-4" />
              Student Segments Report
            </button>

            <button
              onClick={() => { setActiveTab('quality'); setActiveChartFilter(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'quality' 
                  ? 'bg-[#172B4D] text-white shadow-sm' 
                  : 'text-text-muted hover:text-text-main hover:bg-surface'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Data Quality & Audit Report
            </button>
          </div>

          {/* ACTIVE TAB CONTENT */}

          {/* TAB 1: STUDENT SUCCESS REPORT */}
          {activeTab === 'success' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Score Distribution Chart */}
                <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[14px] font-semibold text-text-main">Success Score Distribution</h3>
                      <p className="text-[12px] text-text-muted">Click any score band to filter the student table</p>
                    </div>
                    <span className="text-[11px] text-text-muted bg-surface px-2 py-0.5 rounded border border-card-border">
                      Bracket Range (0-100)
                    </span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.distributions?.success || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E4E6EA" />
                        <XAxis dataKey="range" tick={{ fontSize: 11, fill: BRAND.slate }} />
                        <YAxis tick={{ fontSize: 11, fill: BRAND.slate }} />
                        <RechartsTooltip 
                          formatter={(val: any) => [`${val} students`, 'Count']}
                          contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4E6EA', borderRadius: '8px', fontSize: '12px' }}
                        />
                        <Bar 
                          dataKey="count" 
                          cursor="pointer"
                          onClick={(entry: any) => {
                            if (entry && entry.range) {
                              setActiveChartFilter({ type: 'success_range', value: entry.range, label: `Success Score ${entry.range}` });
                              setCurrentPage(1);
                            }
                          }}
                        >
                          {(data.distributions?.success || []).map((entry: any, index: number) => {
                            const isSelected = activeChartFilter?.type === 'success_range' && activeChartFilter?.value === entry.range;
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={isSelected ? BRAND.orange : (index < 2 ? BRAND.orange : BRAND.navy)} 
                                opacity={isSelected ? 1 : 0.85}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Risk Quadrant Breakdown */}
                <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[14px] font-semibold text-text-main">Risk Vulnerability Matrix</h3>
                      <p className="text-[12px] text-text-muted">Academic risk vs Placement risk classification</p>
                    </div>
                    <span className="text-[11px] text-text-muted bg-surface px-2 py-0.5 rounded border border-card-border">
                      Threshold &lt; 60.0
                    </span>
                  </div>
                  <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-6">
                    <div className="w-full sm:w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.distributions?.risk_quadrant || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="count"
                            cursor="pointer"
                            onClick={(entry: any) => {
                              let qType = 'both';
                              if (entry.name === 'Academic Risk Only') qType = 'acad_only';
                              if (entry.name === 'Placement Risk Only') qType = 'place_only';
                              if (entry.name === 'Good Standing') qType = 'on_track';
                              setActiveChartFilter({ type: 'risk_quadrant', value: qType, label: entry.name });
                              setCurrentPage(1);
                            }}
                          >
                            {(data.distributions?.risk_quadrant || []).map((entry: any, idx: number) => (
                              <Cell key={`slice-${idx}`} fill={entry.color || BRAND.navy} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(val: any) => [`${val} students`, 'Count']}
                            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4E6EA', borderRadius: '8px', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full sm:w-1/2 flex flex-col justify-center space-y-2.5">
                      {(data.distributions?.risk_quadrant || []).map((item: any, i: number) => (
                        <div 
                          key={i} 
                          onClick={() => {
                            let qType = 'both';
                            if (item.name === 'Academic Risk Only') qType = 'acad_only';
                            if (item.name === 'Placement Risk Only') qType = 'place_only';
                            if (item.name === 'Good Standing') qType = 'on_track';
                            setActiveChartFilter({ type: 'risk_quadrant', value: qType, label: item.name });
                            setCurrentPage(1);
                          }}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                            activeChartFilter?.label === item.name ? 'bg-surface border border-card-border' : 'hover:bg-surface/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[12px] font-medium text-text-main">{item.name}</span>
                          </div>
                          <span className="text-[12px] font-semibold text-text-main">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Comparisons */}
              <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-text-main">Department Cross-Comparison</h3>
                    <p className="text-[12px] text-text-muted">Average Student Success, Academic, and Placement scores by branch</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.departments || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4E6EA" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: BRAND.slate }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: BRAND.slate }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4E6EA', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="avg_success" name="Success Score" fill={BRAND.navy} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avg_academic" name="Academic Score" fill={BRAND.orange} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avg_placement" name="Placement Score" fill={BRAND.slate} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACADEMIC PERFORMANCE REPORT */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Academic Score Distribution */}
                <div className="lg:col-span-2 bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[14px] font-semibold text-text-main">Academic Score Range Distribution</h3>
                      <p className="text-[12px] text-text-muted">Computed from normalized CGPA (70%) and Backlogs (30%)</p>
                    </div>
                    <span className="text-[11px] text-text-muted bg-surface px-2 py-0.5 rounded border border-card-border">
                      Threshold &lt; 60.0
                    </span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.distributions?.academic || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E4E6EA" />
                        <XAxis dataKey="range" tick={{ fontSize: 11, fill: BRAND.slate }} />
                        <YAxis tick={{ fontSize: 11, fill: BRAND.slate }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4E6EA', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar 
                          dataKey="count" 
                          cursor="pointer"
                          onClick={(entry: any) => {
                            if (entry && entry.range) {
                              setActiveChartFilter({ type: 'academic_range', value: entry.range, label: `Academic Score ${entry.range}` });
                              setCurrentPage(1);
                            }
                          }}
                        >
                          {(data.distributions?.academic || []).map((_item: any, index: number) => (
                            <Cell 
                              key={`acad-cell-${index}`} 
                              fill={index < 2 ? BRAND.orange : BRAND.navy} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Academic Policy & Threshold Card */}
                <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div>
                    <h3 className="text-[14px] font-semibold text-text-main mb-2">Academic Risk Thresholds</h3>
                    <p className="text-[12px] text-text-muted mb-4 leading-relaxed">
                      Deterministic institutional guidelines used across StudentArc advising workflows:
                    </p>
                    <div className="space-y-3">
                      <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                        <div className="text-[11px] font-semibold text-[#F47735] uppercase tracking-wider">At-Risk Benchmark</div>
                        <div className="text-[13px] font-medium text-text-main mt-0.5">Academic Score &lt; 60.0</div>
                        <div className="text-[11px] text-text-muted mt-1">Triggers mandatory academic advisory notification.</div>
                      </div>
                      <div className="p-3 bg-surface rounded-[12px] border border-card-border">
                        <div className="text-[11px] font-semibold text-text-main uppercase tracking-wider">Arrears Impact</div>
                        <div className="text-[13px] font-medium text-text-main mt-0.5">-25 pts per active backlog</div>
                        <div className="text-[11px] text-text-muted mt-1">Deducted directly from the academic component.</div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-card-border mt-4">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-text-muted">Cohort Average CGPA:</span>
                      <span className="font-semibold text-text-main">{metrics.averageCGPA ? `${metrics.averageCGPA} / 10.0` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-[12px] mt-1.5">
                      <span className="text-text-muted">Students Needing Support:</span>
                      <span className="font-semibold text-[#F47735]">{metrics.academicSupportReviews ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Semester Trends */}
              <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-text-main">Semester Progression Overview</h3>
                    <p className="text-[12px] text-text-muted">Comparative academic performance trajectory across terms</p>
                  </div>
                </div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.semesters || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4E6EA" />
                      <XAxis dataKey="semester" tick={{ fontSize: 11, fill: BRAND.slate }} label={{ value: 'Semester', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: BRAND.slate }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4E6EA', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="avg_academic" name="Avg Academic Score" fill={BRAND.orange} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avg_success" name="Avg Success Score" fill={BRAND.navy} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLACEMENT READINESS REPORT */}
          {activeTab === 'placement' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Placement Score Distribution */}
                <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[14px] font-semibold text-text-main">Placement Readiness Distribution</h3>
                      <p className="text-[12px] text-text-muted">Based on Coding (30%), Aptitude (25%), Mock Interviews (25%) &amp; Skills (20%)</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.distributions?.placement || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E4E6EA" />
                        <XAxis dataKey="range" tick={{ fontSize: 11, fill: BRAND.slate }} />
                        <YAxis tick={{ fontSize: 11, fill: BRAND.slate }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4E6EA', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar 
                          dataKey="count" 
                          cursor="pointer"
                          onClick={(entry: any) => {
                            if (entry && entry.range) {
                              setActiveChartFilter({ type: 'placement_range', value: entry.range, label: `Placement Score ${entry.range}` });
                              setCurrentPage(1);
                            }
                          }}
                        >
                          {(data.distributions?.placement || []).map((_item: any, index: number) => (
                            <Cell key={`place-cell-${index}`} fill={index < 2 ? BRAND.orange : BRAND.navy} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Core Competency Profile */}
                <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[14px] font-semibold text-text-main">Placement Competency Audit</h3>
                      <p className="text-[12px] text-text-muted">Average cohort competency ratings across placement evaluation criteria</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.competencies || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E4E6EA" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: BRAND.slate }} />
                        <YAxis type="category" dataKey="skill" tick={{ fontSize: 11, fill: BRAND.slate }} width={110} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4E6EA', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="score" name="Average Score" fill={BRAND.navy} radius={[0, 4, 4, 0]}>
                          {(data.competencies || []).map((c: any, idx: number) => (
                            <Cell key={`comp-${idx}`} fill={c.score < 60 ? BRAND.orange : BRAND.navy} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Placement Action Playbook Card */}
              <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <h3 className="text-[14px] font-semibold text-text-main mb-3">Evidence-Based Placement Action Playbook</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-surface rounded-[12px] border border-card-border">
                    <h4 className="text-[13px] font-semibold text-[#172B4D] mb-1">Coding Competency Gaps</h4>
                    <p className="text-[12px] text-text-muted leading-relaxed">
                      Students scoring below 60.0 in Coding should be routed to intensive DSA lab practice and guided code reviews before recruiter rounds.
                    </p>
                  </div>
                  <div className="p-4 bg-surface rounded-[12px] border border-card-border">
                    <h4 className="text-[13px] font-semibold text-[#F47735] mb-1">Mock Interview Deficits</h4>
                    <p className="text-[12px] text-text-muted leading-relaxed">
                      Technical interview simulations and HR feedback sessions should be scheduled for candidates with scores below 60.0.
                    </p>
                  </div>
                  <div className="p-4 bg-surface rounded-[12px] border border-card-border">
                    <h4 className="text-[13px] font-semibold text-[#172B4D] mb-1">High Readiness Candidates</h4>
                    <p className="text-[12px] text-text-muted leading-relaxed">
                      Students with Placement Readiness &gt; 80.0 are recommended for early tier-1 corporate partner drives and internship placements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STUDENT SEGMENTS REPORT */}
          {activeTab === 'segments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Cohort Card 1 */}
                <div 
                  onClick={() => {
                    setActiveChartFilter({ type: 'segment', value: 'lowEngagement', label: 'Low Engagement, Decent Academics' });
                    setCurrentPage(1);
                  }}
                  className={`bg-card border p-5 rounded-[16px] cursor-pointer transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
                    activeChartFilter?.value === 'lowEngagement' ? 'border-[#F47735] ring-2 ring-[#F47735]/20' : 'border-card-border hover:border-text-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-[#F47735] uppercase tracking-wider">Cohort 1</span>
                    <span className="text-[12px] font-semibold text-text-main bg-surface px-2 py-0.5 rounded border border-card-border">
                      {rawStudents.filter((s: any) => (s.engagement_score ?? 100) < 50 && (s.academic_score ?? 0) >= 60).length} students
                    </span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-text-main mb-1">Low Engagement, Decent Academics</h4>
                  <p className="text-[12px] text-text-muted">
                    Engagement &lt; 50.0 but Academic &gt; 60.0. Capable learners who exhibit attendance or LMS activity slippage.
                  </p>
                </div>

                {/* Cohort Card 2 */}
                <div 
                  onClick={() => {
                    setActiveChartFilter({ type: 'segment', value: 'strongAcadWeakPlace', label: 'Strong Academics, Weak Placement' });
                    setCurrentPage(1);
                  }}
                  className={`bg-card border p-5 rounded-[16px] cursor-pointer transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
                    activeChartFilter?.value === 'strongAcadWeakPlace' ? 'border-[#172B4D] ring-2 ring-[#172B4D]/20' : 'border-card-border hover:border-text-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-[#172B4D] uppercase tracking-wider">Cohort 2</span>
                    <span className="text-[12px] font-semibold text-text-main bg-surface px-2 py-0.5 rounded border border-card-border">
                      {rawStudents.filter((s: any) => (s.academic_score ?? 0) > 75 && (s.placement_score ?? 100) < 60).length} students
                    </span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-text-main mb-1">Strong Academics, Weak Placement</h4>
                  <p className="text-[12px] text-text-muted">
                    Academic &gt; 75.0 but Placement &lt; 60.0. High GPA students needing aptitude and mock interview prep.
                  </p>
                </div>

                {/* Cohort Card 3 */}
                <div 
                  onClick={() => {
                    setActiveChartFilter({ type: 'segment', value: 'strongPlaceWeakAcad', label: 'Strong Placement, Weak Academics' });
                    setCurrentPage(1);
                  }}
                  className={`bg-card border p-5 rounded-[16px] cursor-pointer transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
                    activeChartFilter?.value === 'strongPlaceWeakAcad' ? 'border-[#172B4D] ring-2 ring-[#172B4D]/20' : 'border-card-border hover:border-text-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-[#172B4D] uppercase tracking-wider">Cohort 3</span>
                    <span className="text-[12px] font-semibold text-text-main bg-surface px-2 py-0.5 rounded border border-card-border">
                      {rawStudents.filter((s: any) => (s.placement_score ?? 0) > 75 && (s.academic_score ?? 100) < 60).length} students
                    </span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-text-main mb-1">Strong Placement, Weak Academics</h4>
                  <p className="text-[12px] text-text-muted">
                    Placement &gt; 75.0 but Academic &lt; 60.0. High practical coding aptitude but facing coursework backlog risks.
                  </p>
                </div>

                {/* Cohort Card 4 */}
                <div 
                  onClick={() => {
                    setActiveChartFilter({ type: 'segment', value: 'bothRisk', label: 'Comprehensive Support Required' });
                    setCurrentPage(1);
                  }}
                  className={`bg-card border p-5 rounded-[16px] cursor-pointer transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
                    activeChartFilter?.value === 'bothRisk' ? 'border-[#F47735] ring-2 ring-[#F47735]/20' : 'border-card-border hover:border-text-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-[#F47735] uppercase tracking-wider">Cohort 4</span>
                    <span className="text-[12px] font-semibold text-text-main bg-surface px-2 py-0.5 rounded border border-card-border">
                      {rawStudents.filter((s: any) => s.is_academic_risk && s.is_placement_risk).length} students
                    </span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-text-main mb-1">Comprehensive Support Needed</h4>
                  <p className="text-[12px] text-text-muted">
                    Both Academic &lt; 60.0 and Placement &lt; 60.0. Priority cohort requiring multidimensional faculty intervention.
                  </p>
                </div>

                {/* Cohort Card 5 */}
                <div 
                  onClick={() => {
                    setActiveChartFilter({ type: 'segment', value: 'highAchievers', label: 'High Achievers' });
                    setCurrentPage(1);
                  }}
                  className={`bg-card border p-5 rounded-[16px] cursor-pointer transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
                    activeChartFilter?.value === 'highAchievers' ? 'border-[#172B4D] ring-2 ring-[#172B4D]/20' : 'border-card-border hover:border-text-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-[#172B4D] uppercase tracking-wider">Cohort 5</span>
                    <span className="text-[12px] font-semibold text-text-main bg-surface px-2 py-0.5 rounded border border-card-border">
                      {rawStudents.filter((s: any) => s.success_score && s.success_score >= 85).length} students
                    </span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-text-main mb-1">High Achievers</h4>
                  <p className="text-[12px] text-text-muted">
                    Overall Student Success Score &ge; 85.0. Exemplary student leaders eligible for peer mentoring roles.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DATA QUALITY REPORT */}
          {activeTab === 'quality' && (
            <div className="space-y-6">
              {/* Indicator Completeness Table */}
              <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-text-main">Indicator Population &amp; Coverage Audit</h3>
                    <p className="text-[12px] text-text-muted">
                      Completeness across 11 core data attributes required by the StudentArc ScoringEngine
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-[#172B4D] bg-surface px-3 py-1 rounded border border-card-border">
                    Overall Completeness: {data.data_quality?.overall_completeness}%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-surface border-y border-card-border text-text-muted">
                      <tr>
                        <th className="py-2.5 px-3 font-medium">Indicator Field</th>
                        <th className="py-2.5 px-3 font-medium">Category</th>
                        <th className="py-2.5 px-3 font-medium">Populated Count</th>
                        <th className="py-2.5 px-3 font-medium">Missing Count</th>
                        <th className="py-2.5 px-3 font-medium">Coverage Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {(data.data_quality?.indicators || []).map((ind: any, idx: number) => (
                        <tr key={idx} className="hover:bg-surface/40">
                          <td className="py-2.5 px-3 font-medium text-text-main">{ind.label} <code className="text-[11px] text-text-muted ml-1">({ind.field})</code></td>
                          <td className="py-2.5 px-3 text-text-muted">{ind.category}</td>
                          <td className="py-2.5 px-3 font-medium text-[#172B4D]">{ind.populated}</td>
                          <td className="py-2.5 px-3 font-medium text-text-muted">{ind.missing}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-surface rounded-full h-2 overflow-hidden border border-card-border">
                                <div 
                                   className={`h-full rounded-full ${ind.coverage >= 80 ? 'bg-[#172B4D]' : ind.coverage >= 50 ? 'bg-[#F47735]' : 'bg-red-500'}`} 
                                  style={{ width: `${ind.coverage}%` }} 
                                />
                              </div>
                              <span className="text-[11px] font-medium text-text-main">{ind.coverage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Import History Audit */}
              {importHistoryData && importHistoryData.history && (
                <div className="bg-card border border-card-border rounded-[16px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <h3 className="text-[14px] font-semibold text-text-main mb-1">Recent Data Import Pipeline Audits</h3>
                  <p className="text-[12px] text-text-muted mb-4">Historical record of imported files, execution timings, and row updates</p>
                  
                  {importHistoryData.history.length === 0 ? (
                    <div className="text-[12px] text-text-muted p-4 bg-surface rounded-[12px] border border-card-border text-center">
                      No automated import batches recorded yet. Canonical database contains seeded evaluation records.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead className="bg-surface border-y border-card-border text-text-muted">
                          <tr>
                            <th className="py-2.5 px-3 font-medium">Timestamp</th>
                            <th className="py-2.5 px-3 font-medium">Filename</th>
                            <th className="py-2.5 px-3 font-medium">Mode</th>
                            <th className="py-2.5 px-3 font-medium">Inserted</th>
                            <th className="py-2.5 px-3 font-medium">Updated</th>
                            <th className="py-2.5 px-3 font-medium">Execution Time</th>
                            <th className="py-2.5 px-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-card-border">
                          {importHistoryData.history.map((h: any, i: number) => (
                            <tr key={i} className="hover:bg-surface/40">
                              <td className="py-2.5 px-3 text-text-muted">{new Date(h.timestamp).toLocaleString()}</td>
                              <td className="py-2.5 px-3 font-medium text-text-main">{h.filename}</td>
                              <td className="py-2.5 px-3 capitalize">{h.mode}</td>
                              <td className="py-2.5 px-3 font-medium text-[#172B4D]">{h.rows_inserted}</td>
                              <td className="py-2.5 px-3 font-medium text-text-muted">{h.rows_updated}</td>
                              <td className="py-2.5 px-3">{h.execution_time_ms} ms</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${h.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                  {h.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STUDENT-LEVEL REPORT TABLE */}
          <div className="bg-card border border-card-border rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
            {/* Table Controls Header */}
            <div className="p-4 sm:p-5 border-b border-card-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
              <div>
                <h3 className="text-[15px] font-semibold text-text-main">
                  Detailed Cohort Student Roster
                </h3>
                <p className="text-[12px] text-text-muted mt-0.5">
                  Showing {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'} matching current report criteria
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search name, ID, dept..."
                    value={localSearch}
                    onChange={(e) => { setLocalSearch(e.target.value); setCurrentPage(1); }}
                    className="pl-8 pr-3 py-1.5 text-[12px] bg-surface border border-card-border rounded-lg focus:outline-none focus:border-[#172B4D] w-48 sm:w-56"
                  />
                  {localSearch && (
                    <button
                      onClick={() => setLocalSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Risk Filter Select */}
                <select
                  value={riskFilter}
                  onChange={(e: any) => { setRiskFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-1.5 text-[12px] bg-surface border border-card-border rounded-lg focus:outline-none focus:border-[#172B4D] text-text-main"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="flagged">Flagged for Support (&lt;60)</option>
                  <option value="good">On Track / Good Standing (&ge;60)</option>
                  <option value="high">High Achievers (&ge;80)</option>
                </select>

                {(effectiveSearch || riskFilter !== 'all' || activeChartFilter) && (
                  <button
                    onClick={handleResetFilters}
                    className="px-2.5 py-1.5 text-[12px] text-text-muted hover:text-text-main hover:bg-surface border border-card-border rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Active Chart Filter Banner */}
            {activeChartFilter && (
              <div className="px-5 py-2.5 bg-surface border-b border-card-border flex items-center justify-between text-[12px] no-print">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-[#F47735]" />
                  <span className="text-text-muted">Filtered by interactive chart selection:</span>
                  <span className="font-semibold text-text-main bg-card px-2 py-0.5 rounded border border-card-border">
                    {activeChartFilter.label}
                  </span>
                  <span className="text-text-muted">({filteredStudents.length} matching)</span>
                </div>
                <button
                  onClick={handleClearChartFilter}
                  className="text-text-muted hover:text-text-main flex items-center gap-1 font-medium"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Filter
                </button>
              </div>
            )}

            {/* Table Roster */}
            {filteredStudents.length === 0 ? (
              <div className="p-10 text-center text-text-muted">
                <AlertCircle className="w-8 h-8 mx-auto text-text-muted/60 mb-2" />
                <p className="text-[14px] font-medium text-text-main">No students match current reporting criteria</p>
                <p className="text-[12px] mt-1">Try adjusting or resetting your active search and chart filters.</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-3 px-3 py-1.5 text-[12px] font-medium text-white bg-[#172B4D] rounded-lg inline-block"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-surface border-b border-card-border text-text-muted">
                    <tr>
                      <th className="py-3 px-4 font-medium">Student ID</th>
                      <th className="py-3 px-4 font-medium">Name</th>
                      <th className="py-3 px-4 font-medium">Dept &amp; Sem</th>
                      <th className="py-3 px-4 font-medium text-right">Success Score</th>
                      <th className="py-3 px-4 font-medium text-right">Academic</th>
                      <th className="py-3 px-4 font-medium text-right">Placement</th>
                      
                      {/* Contextual Columns based on Tab */}
                      {activeTab === 'academic' && (
                        <>
                          <th className="py-3 px-4 font-medium text-right">CGPA</th>
                          <th className="py-3 px-4 font-medium text-right">Backlogs</th>
                        </>
                      )}

                      {activeTab === 'placement' && (
                        <>
                          <th className="py-3 px-4 font-medium text-right">Coding</th>
                          <th className="py-3 px-4 font-medium text-right">Aptitude</th>
                          <th className="py-3 px-4 font-medium text-right">Mock Interview</th>
                        </>
                      )}

                      {activeTab === 'success' && (
                        <th className="py-3 px-4 font-medium text-right">Attendance</th>
                      )}

                      <th className="py-3 px-4 font-medium text-center">Status Flags</th>
                      <th className="py-3 px-4 font-medium text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {paginatedStudents.map((student: any) => {
                      const isAcadRisk = student.is_academic_risk;
                      const isPlaceRisk = student.is_placement_risk;

                      return (
                        <tr 
                          key={student.id} 
                          className="hover:bg-surface/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <td className="py-3 px-4 font-mono font-medium text-text-main">{student.id}</td>
                          <td className="py-3 px-4 font-medium text-text-main">{student.name}</td>
                          <td className="py-3 px-4 text-text-muted">
                            {student.department} {student.semester ? `• Sem ${student.semester}` : ''}
                          </td>
                          
                          <td className="py-3 px-4 text-right font-semibold">
                            <span className={student.success_score !== null && student.success_score < 60 ? 'text-[#F47735]' : 'text-text-main'}>
                              {student.success_score ?? 'N/A'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-medium">
                            <span className={isAcadRisk ? 'text-[#F47735] font-semibold' : 'text-text-main'}>
                              {student.academic_score ?? 'N/A'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-medium">
                            <span className={isPlaceRisk ? 'text-[#F47735] font-semibold' : 'text-text-main'}>
                              {student.placement_score ?? 'N/A'}
                            </span>
                          </td>

                          {/* Contextual Values */}
                          {activeTab === 'academic' && (
                            <>
                              <td className="py-3 px-4 text-right font-medium text-text-main">{student.cgpa ?? 'N/A'}</td>
                              <td className="py-3 px-4 text-right">
                                {student.backlog_count > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    {student.backlog_count}
                                  </span>
                                ) : (
                                  <span className="text-text-muted">0</span>
                                )}
                              </td>
                            </>
                          )}

                          {activeTab === 'placement' && (
                            <>
                              <td className="py-3 px-4 text-right text-text-main">{student.coding_score ?? 'N/A'}</td>
                              <td className="py-3 px-4 text-right text-text-main">{student.aptitude_score ?? 'N/A'}</td>
                              <td className="py-3 px-4 text-right text-text-main">{student.mock_interview_score ?? 'N/A'}</td>
                            </>
                          )}

                          {activeTab === 'success' && (
                            <td className="py-3 px-4 text-right text-text-main">
                              {student.attendance_rate !== null && student.attendance_rate !== undefined ? `${student.attendance_rate}%` : 'N/A'}
                            </td>
                          )}

                          {/* Flags */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {isAcadRisk && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded">
                                  Acad Risk
                                </span>
                              )}
                              {isPlaceRisk && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded">
                                  Placement Risk
                                </span>
                              )}
                              {!isAcadRisk && !isPlaceRisk && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                                  Good Standing
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right no-print" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedStudent(student)}
                                className="px-2.5 py-1 text-[11px] font-medium text-text-main bg-surface hover:bg-card border border-card-border rounded transition-colors"
                              >
                                View
                              </button>
                              <Link
                                to={`/students/${student.id}`}
                                className="p-1 text-text-muted hover:text-text-main rounded transition-colors"
                                title="Open full student profile"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredStudents.length > pageSize && (
              <div className="p-4 border-t border-card-border flex items-center justify-between text-[12px] no-print">
                <span className="text-text-muted">
                  Page {currentPage} of {totalPages} ({filteredStudents.length} total students)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 rounded border border-card-border bg-card text-text-main hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-text-main font-medium">{currentPage}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 rounded border border-card-border bg-card text-text-main hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
