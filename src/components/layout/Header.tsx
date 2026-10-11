import { Bell, Settings as SettingsIcon, Upload, ChevronDown } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useFilters } from '../../context/FilterContext';
import GlobalSearch from './GlobalSearch';

export default function Header() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  const { department, setDepartment, semester, setSemester } = useFilters();

  return (
    <header className="h-20 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-10 bg-surface/80 backdrop-blur-md">
      <div className="flex items-center space-x-6">
        {/* Breadcrumbs */}
        <nav className="text-sm font-medium text-text-muted hidden sm:block">
          <ol className="flex items-center space-x-2">
            <li>
              <Link to="/" className="hover:text-text-main transition-colors">StudentArc</Link>
            </li>
            {pathnames.length > 0 && (
              <li className="flex items-center space-x-2">
                <span className="text-card-border">/</span>
                <span className="text-text-main capitalize font-medium">{pathnames[pathnames.length - 1].replace('-', ' ')}</span>
              </li>
            )}
          </ol>
        </nav>
      </div>

      <div className="flex items-center justify-end space-x-3 lg:space-x-4 flex-1">
        
        {/* Search Pill */}
        <GlobalSearch />

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <select 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
              className="appearance-none block w-44 pl-4 pr-10 py-2 text-sm border border-card-border focus:outline-none focus:ring-1 focus:ring-text-main focus:border-text-main rounded-full bg-card shadow-sm text-text-main cursor-pointer hover:bg-surface transition-colors">
              <option value="">All Departments</option>
              <option value="Computer Science Dept">Computer Science</option>
              <option value="Business Dept">Business</option>
              <option value="Mechanical Dept">Mechanical</option>
              <option value="Civil Dept">Civil</option>
              <option value="Electronics Dept">Electronics</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
          
          <div className="relative">
            <select 
              value={semester} 
              onChange={(e) => setSemester(e.target.value)}
              className="appearance-none block w-36 pl-4 pr-10 py-2 text-sm border border-card-border focus:outline-none focus:ring-1 focus:ring-text-main focus:border-text-main rounded-full bg-card shadow-sm text-text-main cursor-pointer hover:bg-surface transition-colors">
              <option value="">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
              <option value="7">Semester 7</option>
              <option value="8">Semester 8</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* Import Data Pill */}
        <Link
          to="/data-hub"
          className="hidden md:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-text-main shadow-sm hover:opacity-90 transition-opacity"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import Data
        </Link>

        {/* Actions Pill Container */}
        <div className="flex items-center space-x-1 px-1.5 py-1.5 bg-card border border-card-border rounded-full shadow-sm ml-1 lg:ml-2">
          <button className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-full transition-colors">
            <span className="sr-only">View notifications</span>
            <Bell className="h-4 w-4" />
          </button>
          <button className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-full transition-colors">
            <SettingsIcon className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-card-border mx-1"></div>
          <button className="flex items-center justify-center h-7 w-7 rounded-full bg-surface border border-card-border ml-1 hover:opacity-80 transition-opacity">
            <span className="text-[11px] font-semibold text-text-main">AD</span>
          </button>
        </div>
      </div>
    </header>
  );
}
