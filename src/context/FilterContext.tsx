import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface FilterContextType {
  department: string;
  setDepartment: (dept: string) => void;
  semester: string;
  setSemester: (sem: string) => void;
  search: string;
  setSearch: (query: string) => void;
  scoreBand: string;
  setScoreBand: (band: string) => void;
  supportFlag: string;
  setSupportFlag: (flag: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [search, setSearch] = useState('');
  const [scoreBand, setScoreBand] = useState('');
  const [supportFlag, setSupportFlag] = useState('');

  return (
    <FilterContext.Provider value={{ 
      department, setDepartment, 
      semester, setSemester, 
      search, setSearch,
      scoreBand, setScoreBand,
      supportFlag, setSupportFlag
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
