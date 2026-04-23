import React, { useState, useRef, useEffect } from 'react';
import logo from '../assets/LogoS.svg';
import iconMenu from '../assets/Menu.svg';
import iconSettings from '../assets/Settings.svg';
import iconInbox from '../assets/Inbox.svg';
import iconEdit from '../assets/Edit.svg';
import iconSearch from '../assets/Search.svg';

interface MainChatProps {
  displayedSpace: string | null;
  onSetDisplayedSpace: (space: string | null) => void;
  displayedEquipment: string | null;
  onSetDisplayedEquipment: (equipment: string | null) => void;
  onOpenBrowseSpaces: () => void;
  onOpenBookingStatus: () => void;
  onOpenEquipmentCatalog: () => void;
  onOpenDepartmentDirectory: () => void; 
  onOpenProfileSettings: () => void;
}

const MainChat: React.FC<MainChatProps> = ({ 
  displayedSpace,
  onSetDisplayedSpace,
  displayedEquipment,
  onSetDisplayedEquipment,
  onOpenBrowseSpaces, 
  onOpenBookingStatus, 
  onOpenEquipmentCatalog, 
  onOpenDepartmentDirectory, 
  onOpenProfileSettings 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [requirement, setRequirement] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '0px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
      if (scrollHeight > 160) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [requirement]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRequirement(e.target.value);
  };

  const handleNewChat = () => {
    setRequirement('');
    onSetDisplayedSpace(null);
    onSetDisplayedEquipment(null);
    setIsSidebarOpen(false);
  };

  const handleClearSpace = () => onSetDisplayedSpace(null);
  const handleClearEquipment = () => onSetDisplayedEquipment(null);
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

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
            <input type="text" placeholder="Search" className="w-full bg-white rounded-full py-2.5 pl-11 pr-4 text-base border-none shadow-sm outline-none]" />
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
        <header className="sticky top-0 z-50 bg-[#F0F4F8]">
          <div className="flex items-center justify-between px-4 md:px-10 py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className={`p-2 hover:bg-gray-200/50 rounded-lg transition-all duration-300 active:scale-90 ${
                  isSidebarOpen ? 'md:opacity-100 md:scale-100 opacity-0 scale-0 pointer-events-none md:pointer-events-auto' : 'opacity-100 scale-100'
                }`}
              >
                <img src={iconMenu} alt="Menu" className="h-5 w-auto" />
              </button>
              <div className="flex items-center">
                <img src={logo} alt="DeepNaN" className="h-6 w-auto" />
              </div>
            </div>
            
            <div className="flex items-center">
               <button onClick={onOpenBookingStatus} className="bg-white px-5 py-2 rounded-full shadow-sm flex items-center space-x-2 hover:bg-gray-50 transition-all active:scale-95 font-bold uppercase tracking-widest text-[11px] text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-cyan-400">
                  Bookings
               </button>
            </div>
          </div>
        </header>

        {/* Main*/}
        <div className="flex-1 flex flex-col items-start md:items-center px-5 md:px-10 justify-between pb-1 md:pb-10 overflow-hidden relative">
          <div className="w-full flex flex-col items-start md:items-center mt-8 md:mt-16">
            <div className="w-full text-left md:text-center">
              <h2 className="text-2xl md:text-4xl text-slate-900 font-light">Hey username</h2>
              <h1 className="text-4xl md:text-5xl font-bold mt-1 text-slate-900 leading-tight">Planning an event?</h1>
              <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">We'll sort out the perfect space & equipment.</p>
            </div>

            {/* 3 Colourful Buttons */}
            <div className="flex flex-col md:flex-row justify-start md:justify-center items-start md:items-center gap-4 md:gap-3 mt-10 w-full">
              <button onClick={onOpenBrowseSpaces} className="px-10 py-3 bg-[#D4F7F2] hover:bg-[#bcf0e9] rounded-[20px] md:rounded-full text-[14px] md:text-[17px] font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap">Browse Spaces</button>
              <button onClick={onOpenEquipmentCatalog} className="px-10 py-3 bg-[#D6EAFB] hover:bg-[#c1e0f9] rounded-[20px] md:rounded-full text-[14px] md:text-[17px] font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap">Equipment Catalog</button>
              <button onClick={onOpenDepartmentDirectory} className="px-10 py-3 bg-[#D7DCFF] hover:bg-[#c2c9ff] rounded-[20px] md:rounded-full text-[14px] md:text-[17px] font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap">Department Directory</button>
            </div>
          </div>

          {/* Chat area */}
          <div className="w-full max-w-2xl px-1 pb-1 md:pb-0">
            
            {/* Suggestion buttons */}
            {requirement === '' && (
              <div className="flex flex-row justify-start md:justify-center gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
                {['Book room', 'Book equipment', 'Find the contact','Operating time','View history'].map(label => (
                  <button 
                    key={label} 
                    onClick={() => setRequirement(label)} 
                    className="text-[13px] border border-slate-300 px-5 py-2 rounded-2xl bg-white/50 hover:bg-white text-center transition-all whitespace-nowrap active:scale-95 font-medium text-slate-600 shadow-xs"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-white rounded-[28px] md:rounded-4xl px-6 py-2.5 md:py-3.5 border border-white focus-within:border-slate-200 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center relative overflow-hidden">
              <div className="flex flex-col w-full py-2">
                
                {(displayedSpace || displayedEquipment) && (
                  <div className="flex flex-wrap gap-2 items-center mb-1.5">
                    {displayedSpace && (
                      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-xs font-medium text-slate-700">
                        <span>space: <span className="font-semibold">{displayedSpace}</span></span>
                        <button onClick={handleClearSpace} className="hover:text-slate-900 transition-colors">✕</button>
                      </div>
                    )}
                    {displayedEquipment && (
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 text-xs font-medium text-blue-700">
                        <span>equipment: <span className="font-semibold">{displayedEquipment}</span></span>
                        <button onClick={handleClearEquipment} className="hover:text-blue-900 transition-colors">✕</button>
                      </div>
                    )}
                  </div>
                )}


                {/* Input row */}
                <div className="flex items-center gap-2 w-full">
                  <textarea 
                    ref={textareaRef}
                    value={requirement}
                    onChange={handleInputChange}
                    placeholder="Type in your requirement" 
                    rows={1}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] outline-none text-slate-700 resize-none placeholder-slate-300 font-normal leading-normal h-auto no-scrollbar max-h-40 overflow-y-hidden py-1" 
                  />
                  <div className="flex items-center shrink-0">
                    <button className="transition-all duration-200 active:scale-90 group p-1 flex items-center justify-center">
                      <span className="text-2xl text-slate-300 rotate-[-15deg] block group-hover:text-blue-500 group-active:text-blue-600 transition-colors leading-none">➤</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Disclaimer: DeepNaN is AI and can make mistakes. */}  
          </div>
        </div>
        
      </main>
    </div>
  );
};

export default MainChat;