import React, { useState } from 'react';
import logo from '../assets/LogoS.svg';
import iconMenu from '../assets/Menu.svg';
import iconSettings from '../assets/Settings.svg';
import iconInbox from '../assets/Inbox.svg';
import iconEdit from '../assets/Edit.svg';
import iconSearch from '../assets/Search.svg';

interface BookingStatusProps {
  onBack: () => void;
  onOpenProfileSettings: () => void;
}

interface BookingItem {
  title: string;
  date: string;
  time: string;
  room: string;
  equipment: string;
  dept: string;
  promptdatetime: string;
  prompt: string;
}

const BookingStatus: React.FC<BookingStatusProps> = ({ onBack, onOpenProfileSettings }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const handleNewChat = () => {
    setIsSidebarOpen(false);
    onBack();
  };

  const columns: {
    id: string;
    title: string;
    headerColor: string;
    bgColor: string;
    accent: string;
    items: BookingItem[];
  }[] = [
    {
      id: "progress",
      title: "In Progress",
      headerColor: "text-amber-700",
      bgColor: "bg-amber-100/70",
      accent: "bg-amber-500",
      items: [
        {
          title: "AI Project Showcase",
          date: "23/4/2026 (Thursday)",
          time: "10:00 a.m. - 4:00 p.m",
          room: "Dewan Tan Sri Ainuddin",
          equipment: "10 x Table, 3 x Camera, 2 x Microphone",
          dept: "UTM Digital, Department of Deputy Vice-Chancellor (Student Affairs)",
          promptdatetime: "16/4/2026, 10:00:40 a.m.",
          prompt: "Assist me with the planning of AI project showcase on 23/4/2026 10 morning till 4 evening. Thanks."
        }
      ]
    },
    {
      id: "confirmed",
      title: "Confirmed",
      headerColor: "text-emerald-700",
      bgColor: "bg-emerald-100/70",
      accent: "bg-emerald-500",
      items: [
        {
          title: "Media Interview Event",
          date: "1/5/2026 (Friday)",
          time: "4:00 p.m. - 6:30 p.m",
          room: "Bilik Ilmuan 1",
          equipment: "3 x Microphone, 1 x Camera",
          dept: "Penerbit UTM Press, UTM Digital",
          promptdatetime: "20/4/2026, 7:32:40 p.m.",
          prompt: "Important pls arrnge me room for next Friday 4pm to 6.30pm Media Interview Event. Thank you."
        }
      ]
    },
    {
      id: "cancelled",
      title: "Cancelled",
      headerColor: "text-rose-700",
      bgColor: "bg-rose-100/70",
      accent: "bg-rose-500",
      items: [
        {
          title: "Japanese Beginner Class",
          date: "15/4/2026 (Wednesday)",
          time: "2:00 p.m. - 3:00 p.m",
          room: "Syndicate Room",
          equipment: "1 x Microphone, 1 x Projector",
          dept: "Multimedia UTM",
          promptdatetime: "12/4/2026, 3:03:20 p.m.",
          prompt: "Please cancel the reservation of Japanese Beginner Class on this Wednesday 2pm to 3pm."
        }
      ]
    },
    {
      id: "completed",
      title: "Completed",
      headerColor: "text-purple-700",
      bgColor: "bg-purple-100/70",
      accent: "bg-purple-500",
      items: [
        {
          title: "Library Sharing Talk",
          date: "9/3/2026 (Monday)",
          time: "9:00 a.m. - 11:00 a.m",
          room: "Bilik Ilmuan 3",
          equipment: "3 x Microphone, 1 x Camera",
          dept: "Library Administration, Multimedia UTM",
          promptdatetime: "1/3/2026, 10:00:40 a.m.",
          prompt: "Hey, Please help me plan room and stuff for 9/3/2026 9am to 11am Library Sharing Talk. Thanks."
        }
      ]
    }
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
            <button onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center space-x-3 p-2 hover:bg-white/50 rounded-lg transition-all text-sm font-medium text-gray-700 active:scale-95">
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
              onClick={onBack} 
              className="bg-white px-5 py-2 rounded-full shadow-sm flex items-center space-x-2 hover:bg-gray-50 transition-all active:scale-95 font-bold uppercase tracking-widest text-[11px] text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-cyan-400"
            >
              Main Page
            </button>
          </div>
        </header>
        
        {/* Main */}
        <div className="flex-1 overflow-y-auto no-scrollbar touch-pan-y px-4 md:px-10">
          <div className="sticky -top-px z-40 bg-[#F0F4F8] pt-2 pb-6 mb-2 -mx-4 px-4 -mt-1 flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bookings Status</h1>
              <p className="text-sm text-slate-500 font-medium">Events & equipment tracking</p>
            </div>
            <button onClick={onBack} className="p-1.5 bg-white shadow-sm border border-slate-100 hover:bg-slate-50 rounded-full transition-all active:scale-90 group">
              <span className="text-lg text-slate-400 group-hover:text-slate-600 transition-colors block leading-none px-1">✕</span>
            </button>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row gap-6 pb-24">
            {columns.map((col) => (
              <div key={col.id} className={`flex-1 min-w-[320px] md:min-w-0 ${col.bgColor} rounded-[2.5rem] p-5 md:p-6 flex flex-col border border-slate-200/40 shadow-inner h-fit`}>
                <div className="flex items-center justify-between px-2 mb-6 shrink-0">
                    <div className="flex items-center space-x-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${col.accent} shadow-sm`}></div>
                        <span className={`font-bold uppercase tracking-wider text-xs md:text-[13px] ${col.headerColor}`}>{col.title}</span>
                    </div>
                    <span className="bg-white/80 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-slate-400 shadow-sm">{col.items.length}</span>
                </div>

                <div className="space-y-5">
                    {col.items.map((item, i) => (
                        <div key={i} className={`rounded-[2.2rem] p-1.5 ${col.accent}/60 shadow-sm border ${col.accent}/50 active:scale-[0.98] transition-transform`}>
                            <div className="bg-white rounded-3xl p-6 md:p-7 shadow-sm border border-slate-100/50 hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start mb-5">
                                    <h3 className="font-bold text-slate-800 text-[16px] md:text-[17px] leading-tight flex-1">{item.title}</h3>
                                </div>
                                
                                <div className="space-y-2 mb-6">
                                    {[
                                        { label: 'Date', val: item.date },
                                        { label: 'Time', val: item.time },
                                        { label: 'Room', val: item.room },
                                        { label: 'Equip.', val: item.equipment },
                                        { label: 'Dept', val: item.dept },
                                    ].map((row) => (
                                        <div key={row.label} className="flex items-start text-[12px] md:text-[13px] leading-relaxed">
                                            <span className="w-18 shrink-0 font-bold text-slate-400">{row.label}:</span>
                                            <span className="text-slate-600 font-medium">{row.val}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/50">
                                    <p className="text-[13px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">User Prompt</p>
                                    <p className="text-[10px] text-slate-400 italic leading-snug text-wrap">
                                        {item.promptdatetime}
                                    </p>
                                    <p className="text-[11px] text-slate-500 italic leading-snug text-wrap">
                                        "{item.prompt}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                </div>
              </div>
            ))}

          </div>
        </div>
        {/* Disclaimer: DeepNaN is AI and can make mistakes. */}
      </main>
    </div>
  );
};

export default BookingStatus;