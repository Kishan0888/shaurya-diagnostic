import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 md:ml-64 mt-14 md:mt-0 overflow-y-auto overflow-x-hidden">
        <div className="p-3 md:p-6 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}