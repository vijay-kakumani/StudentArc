import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import DataHub from './pages/DataHub';
import Students from './pages/Students';
import StudentProfile from './pages/StudentProfile';
import PlaceholderPage from './pages/PlaceholderPage';
import AcademicProgress from './pages/AcademicProgress';
import PlacementPreparation from './pages/PlacementPreparation';
import StudentGroups from './pages/StudentGroups';
import SupportPlans from './pages/SupportPlans';
import Methodology from './pages/Methodology';
import Reports from './pages/Reports';

import { FilterProvider } from './context/FilterContext';

function App() {
  return (
    <FilterProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="data-hub" element={<DataHub />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<StudentProfile />} />
          <Route path="attendance" element={<PlaceholderPage title="Attendance Overview" endpoint="attendance/summary" />} />
          <Route path="academic" element={<AcademicProgress />} />
          <Route path="at-risk" element={<PlaceholderPage title="Students Needing Support" endpoint="at-risk-students" />} />
          <Route path="placement" element={<PlacementPreparation />} />
          <Route path="segments" element={<StudentGroups />} />
          <Route path="interventions" element={<SupportPlans />} />
          <Route path="reports" element={<Reports />} />
          <Route path="methodology" element={<Methodology />} />
          <Route path="settings" element={<PlaceholderPage title="Settings" />} />
        </Route>
      </Routes>
    </Router>
    </FilterProvider>
  );
}

export default App;
