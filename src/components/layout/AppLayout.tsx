import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-surface overflow-hidden font-sans text-text-main">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden bg-surface">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
