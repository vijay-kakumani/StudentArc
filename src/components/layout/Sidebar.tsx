import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  CalendarCheck, 
  GraduationCap, 
  AlertTriangle, 
  Briefcase, 
  PieChart, 
  Activity, 
  FileText, 
  Info
} from 'lucide-react';
import { cn } from '../../utils/cn';

const mainNavItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Import & Manage Data', path: '/data-hub', icon: Database },
  { name: 'Student Directory', path: '/students', icon: Users },
  { name: 'Attendance Overview', path: '/attendance', icon: CalendarCheck },
  { name: 'Academic Progress', path: '/academic', icon: GraduationCap },
  { name: 'Students Needing Support', path: '/at-risk', icon: AlertTriangle },
  { name: 'Placement Preparation', path: '/placement', icon: Briefcase },
  { name: 'Student Groups', path: '/segments', icon: PieChart },
  { name: 'Support Plans', path: '/interventions', icon: Activity },
  { name: 'Reports & Insights', path: '/reports', icon: FileText },
  { name: 'How Scores Are Calculated', path: '/methodology', icon: Info },
];

export default function Sidebar() {
  const [isCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = !isCollapsed || isHovered;

  return (
    <div 
      className="h-[100dvh] flex-shrink-0 relative z-30 w-[64px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <aside 
        className={cn(
          "absolute left-0 flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-40 px-3",
          isExpanded 
            ? "top-0 bottom-0 h-[100dvh] w-[264px] bg-card shadow-2xl py-6 border-r border-card-border" 
            : "top-6 bottom-6 h-[calc(100dvh-48px)] w-[64px] bg-transparent py-0 border-transparent"
        )}
      >
        <div className={cn("flex items-center flex-shrink-0 whitespace-nowrap transition-all duration-300 overflow-hidden px-0 justify-start pb-4 mb-3 border-b", isExpanded ? "border-card-border" : "border-transparent")}>
          <Link 
            to="/" 
            className="flex items-center group w-full"
            title={!isExpanded ? "StudentArc" : undefined}
          >
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border bg-card border-[#E4E6EA] group-hover:bg-surface transition-colors">
              <img src="/logo.png" alt="StudentArc Logo" className="w-[28px] h-[28px] object-contain" />
            </div>
            <h1 className={cn("font-semibold tracking-tight transition-all duration-300 overflow-hidden text-[#191919]", isExpanded ? "opacity-100 max-w-[200px] text-[15px] ml-3" : "opacity-0 max-w-0 ml-0")}>
              StudentArc
            </h1>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-0">
          <ul className="flex flex-col space-y-1.5 items-start w-full pb-2">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name} className="w-full">
                  <NavLink
                    to={item.path}
                    title={!isExpanded ? item.name : undefined}
                    className="flex items-center group w-full whitespace-nowrap"
                  >
                    {({ isActive }) => (
                      <>
                        <div className={cn(
                          "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border transition-colors",
                          isActive 
                            ? "bg-[#172B4D] text-white border-[#172B4D]" 
                            : "bg-white text-[#8793A5] border-[#E4E6EA] group-hover:bg-[#F4F5F7] group-hover:text-[#172B4D]"
                        )}>
                          <Icon strokeWidth={1.75} className={cn("w-[18px] h-[18px]", isActive ? "text-white" : "text-current")} />
                        </div>
                        <span className={cn(
                          "transition-all duration-300 overflow-hidden text-[14px] font-medium", 
                          isExpanded ? "opacity-100 max-w-[200px] ml-3" : "opacity-0 max-w-0 ml-0",
                          isActive ? "text-[#191919]" : "text-[#8793A5] group-hover:text-[#191919]"
                        )}>
                          {item.name}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
