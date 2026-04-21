import React, { useState } from 'react';
import logo from '../assets/LogoS.svg';
import iconMenu from '../assets/Menu.svg';
import iconSettings from '../assets/Settings.svg';
import iconInbox from '../assets/Inbox.svg';
import iconEdit from '../assets/Edit.svg';
import iconSearch from '../assets/Search.svg';

interface ProfileProps {
  onBack: () => void;
  onOpenBookingStatus: () => void;
}

const ProfileSettings: React.FC<ProfileProps> = ({ onBack, onOpenBookingStatus }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const handleNewChat = () => {
    setIsSidebarOpen(false);
    onBack();
  };

  return (
    <div className="flex h-svh w-full bg-[#F0F4F8] text-[#1a1a1a] overflow-hidden">
      
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
            <input type="text" placeholder="Search" className="w-full bg-white rounded-full py-2.5 pl-11 pr-4 text-sm border-none shadow-sm outline-none" />
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
          <button onClick={() => setIsSidebarOpen(false)} className="flex items-center space-x-3 text-sm font-medium text-gray-600 hover:text-black transition-colors w-full active:scale-95">
            <img src={iconSettings} className="h-5 w-5 opacity-70" /><span>Settings & Profile</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative min-w-0">
        
        {/* Header*/}
        <header className="sticky top-0 z-50 bg-[#F0F4F8]">
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
            <button 
              onClick={onOpenBookingStatus} 
              className="bg-white px-5 py-2 rounded-full shadow-sm flex items-center space-x-2 hover:bg-gray-50 transition-all active:scale-95 font-bold uppercase tracking-widest text-[11px] text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-cyan-400"
            >
              Bookings
            </button>

          </div>
        </header>
        
        {/* Main */}
        <div className="flex-1 flex flex-col px-4 md:px-10 overflow-y-auto no-scrollbar">
          <div className="max-w-5xl mx-auto w-full">
            <div className="sticky -top-px z-40 bg-[#F0F4F8] pt-2 pb-6 mb-2 -mx-4 px-4 -mt-1 flex items-center justify-between">
              <div className="flex flex-col">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Profile & Settings</h1>
                <p className="text-sm text-slate-500 font-medium">Manage account and preferences</p>
              </div>
              <button onClick={onBack} className="p-1.5 bg-white shadow-sm border border-slate-100 hover:bg-slate-50 rounded-full transition-all active:scale-90 group">
                <span className="text-lg text-slate-400 group-hover:text-slate-600 transition-colors block leading-none px-1">✕</span>
              </button>
            </div>
            
            <div className="space-y-6 pb-20">
              {/* Hero Card */}
              <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-sm border border-slate-100/50 flex flex-col md:flex-row items-center gap-12">
                <div className="relative shrink-0">
                  <div className="w-36 h-36 md:w-48 md:h-48 bg-slate-50 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-6xl font-bold text-slate-200">
                    U
                  </div>
                  <button className="absolute bottom-2 right-2 p-3 bg-slate-900 text-white rounded-full shadow-lg active:scale-90 transition-all border-4 border-white">
                    <img src={iconEdit} className="w-5 h-5 invert" alt="edit" />
                  </button>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-4xl font-bold text-slate-900">Dr. Username</h2>
                  <p className="text-xl text-slate-500 font-medium mt-1">Senior Lecturer • Faculty of Computing</p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
                     {['Artificial Intelligence', 'Machine Learning', 'Logistics AI'].map(tag => (
                       <span key={tag} className="px-4 py-1.5 bg-slate-50 text-slate-400 text-[11px] font-bold rounded-full border border-slate-100 uppercase tracking-widest">{tag}</span>
                     ))}
                  </div>
                  <div className="mt-10 flex flex-wrap justify-center md:justify-start gap-4">
                    <button className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-[13px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-sm">Update CV</button>
                    <button className="px-12 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[13px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-sm">Sign Out</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Academic Identity */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100/50">
                  <h3 className="text-[15px] font-bold text-slate-300 uppercase tracking-widest mb-8">Faculty Identity</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[13px] font-bold text-slate-400 uppercase block mb-1 tracking-widest">Email Address</label>
                      <p className="text-base text-slate-800 font-base">username@utm.my</p>
                    </div>
                    <div>
                      <label className="text-[13px] font-bold text-slate-400 uppercase block mb-1 tracking-widest">Staff Identification</label>
                      <p className="text-base text-slate-800 font-base">UTM-FAC-2026-99</p>
                    </div>
                    <div>
                      <label className="text-[13px] font-bold text-slate-400 uppercase block mb-1 tracking-widest">Office Location</label>
                      <p className="text-base text-slate-800 font-base">Building N28, Room 402</p>
                    </div>
                  </div>
                </div>

                {/* System Preferences */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100/50 flex flex-col">
                  <h3 className="text-[15px] font-bold text-slate-300 uppercase tracking-widest mb-8">System Preferences</h3>
                  <div className="space-y-8 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-lg text-slate-700 font-bold">Dark Mode</span>
                      <div className="w-12 h-6 bg-slate-100 rounded-full p-1 cursor-pointer">
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm border border-slate-200"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg text-slate-700 font-bold">Smart Notifications</span>
                      <div className="w-12 h-6 bg-linear-to-r from-pink-500 to-cyan-400 rounded-full p-1 cursor-pointer flex justify-end shadow-sm">
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg text-slate-700 font-bold">Biometric Login</span>
                      <div className="w-12 h-6 bg-slate-100 rounded-full p-1 cursor-pointer">
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm border border-slate-200"></div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Disclaimer: DeepNaN is AI and can make mistakes. */}  
      </main>
    </div>
  );
};

export default ProfileSettings;