import React, { useState, useEffect } from 'react';
import logo from '../assets/LogoS.svg';
import iconMenu from '../assets/Menu.svg';
import iconSettings from '../assets/Settings.svg';
import iconInbox from '../assets/Inbox.svg';
import iconEdit from '../assets/Edit.svg';
import iconSearch from '../assets/Search.svg';
import iconInfo from '../assets/Info.svg';

interface DirectoryProps {
  onBack: () => void;
  onDepartmentSelected: (deptName: string) => void; 
  onOpenBookingStatus: () => void;
  onOpenProfileSettings: () => void;
}

const DepartmentDirectory: React.FC<DirectoryProps> = ({ 
  onBack, 
  onDepartmentSelected, 
  onOpenBookingStatus, 
  onOpenProfileSettings 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showToast, setShowToast] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const handleNewChat = () => {
    setIsSidebarOpen(false);
    onBack();
  };

  const handleSelect = (name: string) => {
    onDepartmentSelected(name);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const departments = [
    "Admission Office", "Alumni Relations Unit", "Board of Directors", "Counseling Centre",
    "Career Centre", "Council of Professors", "Department of Bursary", 
    "Department of Digital Services (UTM Digital)", "Department of Registrar",
    "Department of Deputy Vice-Chancellor (Student Affairs)",
    "Department of Deputy Vice-Chancellor (Research and Innovation)",
    "Department of Deputy Vice-Chancellor (Academic and International)",
    "Innovation and Commercialisation Centre", "Islamic Centre", "Internal Audit Unit",
    "Office of Corporate Affairs", "Occupational Safety Health and Environmental Office (Oshe)",
    "Office of Asset and Development (PHB)", "Office of Legal Advisory", 
    "Office of Campus Sustainability", "Office of The Vice-Chancellor",
    "Office of Deputy Vice-Chancellor (Development)", "Penerbit UTM Press",
    "Quality and Risk Management Centre (QRIM)", "Research Management Centre (RMC)",
    "Student Recruitment and Admission Division", "Strategy Management Office (SMO)",
    "UTM Academic Leadership (UTMLead)", "UTM International", "UTM Sports Excellence",
    "Multimedia UTM", "Library Administration", "UTM Health Centre (PKU)", "Pusat Islam UTM"
  ];

  const filteredDepts = departments.filter(dept => 
    dept.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-svh w-full bg-[#F0F4F8] text-[#1a1a1a] overflow-hidden">
      
      {/* Mobile Snackbar Tip */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-100 transition-all duration-500 ease-in-out px-6 w-full max-w-xs md:hidden ${
        showToast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
      }`}>
        <div className="bg-slate-800 text-white py-3 px-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700">
          <img src={iconInfo} className="h-4 w-4 invert opacity-80" alt="info" />
          <p className="text-[12px] font-medium tracking-wide">Tap any card to tag it to your chat</p>
        </div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/5 z-70 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Navigation Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-80 w-72 bg-[#E9EEF6] border-r border-gray-100
        transition-transform duration-300 ease-in-out flex flex-col rounded-r-[2.5rem] md:rounded-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 ${isSidebarOpen ? 'md:flex' : 'md:hidden'}
      `}>
        <div className="p-6 space-y-6 flex-1 flex flex-col min-h-0">
          <div className="relative group">
            <button className="absolute left-4 top-3.5 h-4 w-4 z-10 hover:scale-110 transition-transform active:opacity-50">
              <img src={iconSearch} alt="Search" className="h-full w-full opacity-40 group-focus-within:opacity-80 transition-opacity" />
            </button>
            <input type="text" placeholder="Search" className="w-full bg-white rounded-full py-2.5 pl-11 pr-4 text-base border-none shadow-sm outline-none" />
          </div>
          <div className="space-y-2">
            <button onClick={handleNewChat} className="w-full flex items-center space-x-3 p-2 hover:bg-white/50 rounded-lg transition-all text-sm font-medium text-gray-700 active:scale-95">
              <img src={iconEdit} className="h-5 w-5 opacity-70" /><span>New chat</span>
            </button>
            <button onClick={onOpenBookingStatus} className="w-full flex items-center space-x-3 p-2 hover:bg-white/50 rounded-lg transition-all text-sm font-medium text-gray-700 active:scale-95">
              <img src={iconInbox} className="h-5 w-5 opacity-70" /><span>Booking history</span>
            </button>
          </div>
          <div className="pt-4 px-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Chats</div>
          <nav className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar text-sm text-gray-600">
            {['A 5 person room', 'Media interview event', 'AI project showcase room'].map((chat) => (
              <div key={chat} className="group flex items-center justify-between p-2 hover:bg-white/50 rounded-lg cursor-pointer transition-all active:scale-95">
                <span className="truncate">{chat}</span><span className="text-gray-400 opacity-60">⋮</span>
              </div>
            ))}
          </nav>
        </div>
        <div className="p-6 border-t border-gray-200/50">
          <button onClick={onOpenProfileSettings} className="flex items-center space-x-3 text-sm font-medium text-gray-600 hover:text-black transition-colors w-full active:scale-95">
            <img src={iconSettings} className="h-5 w-5 opacity-70" /><span>Settings & Profile</span>
          </button>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col relative min-w-0 h-full">
        
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#F0F4F8] shrink-0">
          <div className="flex items-center justify-between px-4 md:px-10 py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className={`p-2 hover:bg-gray-200/50 rounded-lg transition-all duration-300 active:scale-90 ${
                  isSidebarOpen
                    ? 'md:opacity-100 md:scale-100 opacity-0 scale-0 pointer-events-none md:pointer-events-auto'
                    : 'opacity-100 scale-100'
                }`}
              >
                <img src={iconMenu} alt="Menu" className="h-5 w-auto" />
              </button>
              <button onClick={onBack} className="hover:opacity-70 transition">
                <img src={logo} alt="DeepNaN" className="h-6 w-auto" />
              </button>
            </div>
            <button onClick={onOpenBookingStatus} className="bg-white px-5 py-2 rounded-full shadow-sm flex items-center space-x-2 hover:bg-gray-50 transition-all active:scale-95 font-bold uppercase tracking-widest text-[11px] text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-cyan-400">
              Bookings
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar touch-pan-y px-4 md:px-10">
          <div className="sticky -top-px z-40 bg-[#F0F4F8] pt-2 pb-4 -mx-4 px-4 -mt-1">
            <div className="flex items-center justify-between w-full mb-5 gap-4">
              <div className="flex flex-col">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Department Directory</h1>
                <p className="text-sm text-slate-500 font-medium">Contact and Office Information</p>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                <div className="group relative flex items-center justify-end">
                    <button 
                      onClick={() => setShowToast(true)}
                      className="flex items-center gap-2.5 bg-white border border-slate-200 h-9 px-3 rounded-full shadow-xs transition-all duration-500 ease-out max-w-10.5 md:group-hover:max-w-75 overflow-hidden whitespace-nowrap active:scale-95"
                    >
                        <img src={iconInfo} alt="Info" className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 hidden md:inline">
                            Tap card to tag to chat
                        </span>
                    </button>
                </div>

                <button onClick={onBack} className="p-1.5 bg-white shadow-sm border border-slate-100 hover:bg-slate-50 rounded-full transition-all active:scale-90 group shrink-0 h-9 w-9 flex items-center justify-center">
                  <span className="text-lg text-slate-700 group-hover:text-slate-600 transition-colors block leading-none">✕</span>
                </button>
              </div>
            </div>

            <div className="relative w-full max-w-sm group">
              <button className="absolute left-4 top-3.5 h-4 w-4 z-10">
                <img src={iconSearch} alt="Search" className="h-full w-full opacity-30 group-focus-within:opacity-60 transition-opacity" />
              </button>
              <input 
                type="text" 
                placeholder="Filter departments..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-full py-2.5 pl-11 pr-4 text-base border-none outline-none shadow-sm focus:ring-1 focus:ring-slate-100"
              />
            </div>
          </div>

          <div className="space-y-4 pb-24 mt-2">
            {filteredDepts.map((dept, index) => (
              <div 
                key={index} 
                onClick={() => handleSelect(dept)} 
                className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100/50 hover:shadow-md transition-all group active:scale-[0.99] cursor-pointer"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-[17px] md:text-[18px] group-hover:text-blue-600 transition-colors leading-tight">{dept}</h3>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Office Open</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-10 text-[13px] text-slate-600 font-medium">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">Contact</span>
                      <span>+607-553 3333</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">Email</span>
                      <span className="italic">office@utm.my</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">Hours</span>
                      <span className="whitespace-nowrap">8:00 AM - 5:00 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredDepts.length === 0 && (
              <div className="text-center py-24">
                <p className="text-slate-400 font-medium">No departments found matching "{searchQuery}"</p>
                <button onClick={() => setSearchQuery("")} className="text-blue-500 text-sm font-bold mt-2 hover:underline">Clear Search</button>
              </div>
            )}
          </div>
          {/* Disclaimer: DeepNaN is AI and can make mistakes. */}  
        </div>
      </main>
    </div>
  );
};

export default DepartmentDirectory;