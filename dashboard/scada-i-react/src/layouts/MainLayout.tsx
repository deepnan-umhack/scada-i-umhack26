import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Server, ShieldAlert } from 'lucide-react';
import uniLogo from '../assets/uni-logo.png';

const MainLayout = () => {

  // Sleek, Apple-like active states for desktop
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm ${
      isActive 
        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50 font-medium' 
        : 'text-gray-500 hover:bg-gray-100/60 hover:text-gray-900 font-medium'
    }`;

  // Subtle active states for mobile
  const mobileLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `p-2.5 rounded-xl transition-all ${
      isActive 
        ? 'bg-gray-200/60 text-gray-900' 
        : 'text-gray-500 hover:bg-gray-100/60'
    }`;

  const location = useLocation();
  const isDeviceManager = location.pathname === '/device-manager';
  const isAlerts = location.pathname === '/alerts';
  const isFullBleed = isDeviceManager || isAlerts;

  return (
    <div className="h-[100dvh] flex bg-[#f5f5f7] font-sans text-gray-900 selection:bg-gray-200">
      
      {/* macOS Style Sidebar (Frosted Glass) */}
      <aside className="w-64 bg-white/60 backdrop-blur-xl border-r border-gray-200/60 hidden md:flex flex-col z-10 flex-shrink-0">
        <div className="p-6 pt-8 flex items-center">
          <img src={uniLogo} alt="University Logo" className="h-18 w-auto object-contain origin-left" />
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <NavLink to="/dashboard" className={navLinkClasses}>
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </NavLink>
          
          <NavLink to="/" className={navLinkClasses}>
            <Server size={18} />
            <span>Device Manager</span>
          </NavLink>
          
          <NavLink to="/" className={navLinkClasses}>
            <ShieldAlert size={18} />
            <span>System Alerts</span>
          </NavLink>
        </nav>
        
        {/* Minimalist User Profile Area */}
        <div className="p-4 m-4 rounded-xl bg-white/50 border border-gray-200/50 flex items-center space-x-3 cursor-pointer hover:bg-white transition-colors shadow-sm">
           <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex-shrink-0 overflow-hidden">
             <div className="w-full h-full bg-gradient-to-tr from-blue-300 to-indigo-100"></div>
           </div>
           <div className="flex-col flex">
             <span className="text-sm font-medium text-gray-900 leading-tight">Admin Access</span>
             <span className="text-xs text-gray-500">IT Infrastructure</span>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 h-full min-w-0 flex flex-col ${isFullBleed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        
        {/* Transparent Mobile Header */}
        <header
          className="md:hidden border-b border-gray-200/100 p-4 flex justify-between items-center sticky top-0 z-20 flex-shrink-0"
          style={{
            backgroundColor: 'rgba(245, 245, 247, 0.6)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <div className="flex items-center">
            <img src={uniLogo} alt="University Logo" className="h-7 w-auto object-contain origin-left" />
          </div>
          <div className="flex space-x-1">
            <NavLink to="/dashboard" className={mobileLinkClasses}><LayoutDashboard size={20}/></NavLink>
            <NavLink to="/device-manager" className={mobileLinkClasses}><Server size={20}/></NavLink>
            <NavLink to="/alerts" className={mobileLinkClasses}><ShieldAlert size={20}/></NavLink>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className={isFullBleed ? "w-full flex-1 flex flex-col min-h-0 relative" : "p-4 sm:p-6 md:p-8 lg:px-10 lg:py-8"}>
          <div className="w-full h-full flex flex-col min-h-0">
            <div className="w-full flex-1 flex flex-col min-h-0">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;