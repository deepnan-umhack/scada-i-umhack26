import React, { useState } from 'react';
import logo from '../assets/LogoS.svg';
import iconMenu from '../assets/Menu.svg';
import iconSettings from '../assets/Settings.svg';
import iconInbox from '../assets/Inbox.svg';
import iconEdit from '../assets/Edit.svg';
import iconSearch from '../assets/Search.svg';
import DTSA from '../assets/DTSA.png';
import DS from '../assets/DS.png'; 
import DJ from '../assets/DJ.png'; 
import DAH from '../assets/DAH.png'; 
import BI1 from '../assets/BI1.png';
import BI2 from '../assets/BI2.png';
import BI3 from '../assets/BI3.png';
import BB from '../assets/BB.png'; 
import SR from '../assets/SR.png';
import LRU from '../assets/LRU.png';
import LRP from '../assets/LRP.png';

interface BrowseSpacesProps {
  onBack: () => void;
  onSpaceSelected: (spaceName: string) => void;
  onOpenBookingStatus: () => void;
  onOpenProfileSettings: () => void;
}

const BrowseSpaces: React.FC<BrowseSpacesProps> = ({ onBack, onSpaceSelected, onOpenBookingStatus, onOpenProfileSettings }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const handleNewChat = () => {
    setIsSidebarOpen(false);
    onBack();
  };

  const handleSpaceClick = (spaceName: string) => {
    onSpaceSelected(spaceName);
  };

  const spaces = [
    { id: 1, name: "Dewan Tan Sri Ainuddin", img: DTSA },
    { id: 2, name: "Dewan Seminar", img: DS },
    { id: 3, name: "Dewan Jumaah", img: DJ },
    { id: 4, name: "Dewan Azman Hashim", img: DAH },
    { id: 5, name: "Bilik Ilmuan 1", img: BI1 },
    { id: 6, name: "Bilik Ilmuan 2", img: BI2 },
    { id: 7, name: "Bilik Ilmuan 3", img: BI3 },
    { id: 8, name: "Bilik Bankuet", img: BB },
    { id: 9, name: "Syndicate Room", img: SR },
    { id: 10, name: "Lecture Room (UG)", img: LRU },
    { id: 11, name: "Lecture Room (PG)", img: LRP },
  ];

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

            <button 
              onClick={onOpenBookingStatus} 
              className="bg-white px-5 py-2 rounded-full shadow-sm flex items-center space-x-2 hover:bg-gray-50 transition-all active:scale-95 font-bold uppercase tracking-widest text-[11px] text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-cyan-400"
            >
              Bookings
            </button>
          </div>
        </header>

        {/* Main */}
        <div className="flex-1 overflow-y-auto no-scrollbar touch-pan-y px-4 md:px-10">
          <div className="sticky -top-px z-40 bg-[#F0F4F8] pt-2 pb-6 mb-2 -mx-4 px-4 -mt-1 flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Spaces List</h1>
              <p className="text-sm text-slate-500 font-medium">Explore campus spaces</p>
            </div>
            <button onClick={onBack} className="p-1.5 bg-white shadow-sm border border-slate-100 hover:bg-slate-50 rounded-full transition-all active:scale-90 group">
              <span className="text-lg text-slate-400 group-hover:text-slate-600 transition-colors block leading-none px-1">✕</span>
            </button>
          </div>
            
          <div className="pb-24">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12 w-full">
              {spaces.map((space) => (
                <div key={space.id} onClick={() => handleSpaceClick(space.name)} className="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform">
                  <div className="relative w-full aspect-4/3 overflow-hidden rounded-3xl md:rounded-4xl shadow-sm border border-slate-200/50 bg-slate-100">
                    <img src={space.img} alt={space.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <div className="mt-3 md:mt-4 px-1">
                    <span className="text-[13px] md:text-[15px] font-medium text-center text-slate-800 leading-snug block group-hover:text-blue-600 transition-colors">
                      {space.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Disclaimer: DeepNaN is AI and can make mistakes. */}  
      </main>
    </div>
  );
};

export default BrowseSpaces;