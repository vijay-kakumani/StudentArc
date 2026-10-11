import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, BookOpen, Layout, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useFilters } from '../../context/FilterContext';

type SearchResult = {
  type: 'student' | 'page' | 'department' | 'subject';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
};

const PAGES = [
  { id: 'dashboard', title: 'Dashboard', url: '/' },
  { id: 'students', title: 'Student Directory', url: '/students' },
  { id: 'attendance', title: 'Attendance Overview', url: '/attendance' },
  { id: 'academic', title: 'Academic Progress', url: '/academic' },
  { id: 'support', title: 'Students Needing Support', url: '/at-risk' },
  { id: 'placement', title: 'Placement Preparation', url: '/placement' },
  { id: 'groups', title: 'Student Groups', url: '/segments' },
  { id: 'interventions', title: 'Support Plans', url: '/interventions' },
  { id: 'reports', title: 'Reports & Insights', url: '/reports' },
  { id: 'methodology', title: 'How Scores Are Calculated', url: '/methodology' },
];

const DEPARTMENTS = [
  'Computer Science Dept',
  'Business Dept',
  'Mechanical Dept',
  'Civil Dept',
  'Electronics Dept'
];

// Add subjects mapping (this could also be fetched from API, but standardizing some here based on prompt)
const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Data Structures', 'Algorithms', 'Database Systems'
];

export default function GlobalSearch() {
  const { search, setSearch, setDepartment } = useFilters();
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<{ [key: string]: SearchResult[] }>({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [flatResults, setFlatResults] = useState<SearchResult[]>([]);

  // We fetch students from API. We could also just fetch the students list once.
  // Using a short debounce
  useEffect(() => {
    let isActive = true;

    if (!search || search.trim() === '') {
      setResults({});
      setFlatResults([]);
      setIsOpen(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const q = search.toLowerCase().trim();
        
        // 1. Pages
        const matchingPages = PAGES.filter(p => p.title.toLowerCase().includes(q))
          .map(p => ({ type: 'page' as const, id: p.id, title: p.title, url: p.url }));
          
        // 2. Departments
        const matchingDepts = DEPARTMENTS.filter(d => d.toLowerCase().includes(q))
          .map(d => ({ type: 'department' as const, id: d, title: d, url: '/students' }));

        // 3. Subjects
        const matchingSubjects = SUBJECTS.filter(s => s.toLowerCase().includes(q))
          .map(s => ({ type: 'subject' as const, id: s, title: s, url: '/academic' }));
        
        // 4. Students
        const res = await api.getStudents({});
        if (!isActive) return;

        const students = res.data || [];
        
        const matchingStudents = students.filter((s: any) => 
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.id && String(s.id).toLowerCase().includes(q))
        ).slice(0, 5).map((s: any) => ({
          type: 'student' as const,
          id: String(s.id),
          title: s.name || 'Unknown',
          subtitle: `${s.id} • ${s.department || 'No Dept'}`,
          url: `/students?studentId=${s.id}`
        }));

        const newResults = {
          'Students': matchingStudents,
          'Pages': matchingPages,
          'Departments': matchingDepts,
          'Subjects': matchingSubjects
        };

        const newFlat = [
          ...matchingStudents,
          ...matchingPages,
          ...matchingDepts,
          ...matchingSubjects
        ];

        setResults(newResults);
        setFlatResults(newFlat);
        setSelectedIndex(0);
        setIsOpen(true);
      } catch (err) {
        if (isActive) console.error(err);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 200);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [search]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || flatResults.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (item: SearchResult) => {
    if (item.type === 'department') {
      setDepartment(item.title);
    }
    navigate(item.url);
    setIsOpen(false);
    // Do not clear search here if we want the directory to stay filtered by it? 
    // Wait! The prompt: "Returning to Student Directory... should preserve unselected state unless... explicit... "
    // Let's clear the search so the dropdown closes and the text field resets, OR leave it? 
    // "Student Directory's own search must continue to filter the list live."
    // If we click a student, we probably don't want the search bar to still say "John" if we navigated specifically to John. But actually, "John" is fine.
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'student': return <Users className="w-4 h-4 text-text-muted" />;
      case 'page': return <Layout className="w-4 h-4 text-text-muted" />;
      case 'department': return <Building2 className="w-4 h-4 text-text-muted" />;
      case 'subject': return <BookOpen className="w-4 h-4 text-text-muted" />;
      default: return <Search className="w-4 h-4 text-text-muted" />;
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-64 hidden lg:block">
      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-text-muted" />
      </span>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen && e.target.value.trim() !== '') setIsOpen(true);
        }}
        onFocus={() => {
          if (search.trim() !== '') setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="block w-full pl-10 pr-4 py-2 border border-card-border rounded-full text-sm bg-card shadow-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-text-main focus:border-text-main transition-all text-text-main"
        placeholder="Search students, subjects..."
      />

      {isOpen && search.trim() !== '' && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-card-border rounded-[14px] shadow-lg overflow-hidden z-50 max-h-[400px] flex flex-col">
          {loading && flatResults.length === 0 ? (
            <div className="p-4 text-sm text-text-muted text-center flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin"></div>
              Searching...
            </div>
          ) : flatResults.length === 0 ? (
            <div className="p-4 text-sm text-text-muted text-center">
              No results found for "{search}"
            </div>
          ) : (
            <div className="overflow-y-auto py-2">
              {Object.entries(results).map(([groupName, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={groupName}>
                    <div className="px-4 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider bg-surface/50">
                      {groupName}
                    </div>
                    {items.map((item) => {
                      const index = flatResults.indexOf(item);
                      const isSelected = index === selectedIndex;
                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          onMouseDown={(e) => {
                            e.preventDefault(); // prevent blur
                            handleSelect(item);
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 ${isSelected ? 'bg-surface' : 'hover:bg-surface/50'}`}
                        >
                          {getIcon(item.type)}
                          <div>
                            <div className="text-sm font-medium text-text-main">{item.title}</div>
                            {item.subtitle && <div className="text-[12px] text-text-muted">{item.subtitle}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
