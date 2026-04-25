import React, { useState, useRef, useEffect } from 'react';
import logo from '../assets/LogoS.svg';
import iconMenu from '../assets/Menu.svg';
import iconSettings from '../assets/Settings.svg';
import iconInbox from '../assets/Inbox.svg';
import iconEdit from '../assets/Edit.svg';
import iconSearch from '../assets/Search.svg';
import { supabase } from '../lib/supabaseClient';

interface MainChatProps {
  requirement: string;
  onSetRequirement: (val: string) => void;
  displayedSpace: string | null;
  onSetDisplayedSpace: (space: string | null) => void;
  displayedEquipment: string[];
  onSetDisplayedEquipment: (equipment: string[]) => void;
  displayedDepts: string[];
  onSetDisplayedDepts: (depts: string[]) => void;
  onOpenBrowseSpaces: () => void;
  onOpenBookingStatus: () => void;
  onOpenEquipmentCatalog: () => void;
  onOpenDepartmentDirectory: () => void;
  onOpenProfileSettings: () => void;
}

interface Message {
  role: 'user' | 'agent';
  text: string;
  tags?: {
    space: string | null;
    equipment: string[];
    depts: string[];
  };
}

const MainChat: React.FC<MainChatProps> = ({
  requirement,
  onSetRequirement,
  displayedSpace,
  onSetDisplayedSpace,
  displayedEquipment,
  onSetDisplayedEquipment,
  displayedDepts,
  onSetDisplayedDepts,
  onOpenBrowseSpaces,
  onOpenBookingStatus,
  onOpenEquipmentCatalog,
  onOpenDepartmentDirectory,
  onOpenProfileSettings
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId] = useState(() => Math.random().toString(36).substring(7));
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleBlur = () => {
    window.scrollTo({ top: 0, left: 0 });
  };

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSetRequirement(e.target.value);
  };

  const handleSendMessage = async () => {
    const hasContent = requirement.trim() || displayedSpace || displayedEquipment.length > 0 || displayedDepts.length > 0;
    if (!hasContent || isLoading) return;

    const userText = requirement;
    const tagSnapshot = {
      space: displayedSpace,
      equipment: [...displayedEquipment],
      depts: [...displayedDepts]
    };

    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userText,
      tags: tagSnapshot
    }]);

    onSetRequirement('');
    onSetDisplayedSpace(null);
    onSetDisplayedEquipment([]);
    onSetDisplayedDepts([]);
    setIsLoading(true);

    // ===========================================================================================================
    // AI API CALL (in case ai got problem change this to comment and uncomment the MANUAL TEST CODE block below)
    // ===========================================================================================================
    let messageForAI = userText || "(User sent tags only)";
    const contextTags = [];
    if (tagSnapshot.space) contextTags.push(`Space: ${tagSnapshot.space}`);
    if (tagSnapshot.equipment.length > 0) contextTags.push(`Equipment: ${tagSnapshot.equipment.join(', ')}`);
    if (tagSnapshot.depts.length > 0) contextTags.push(`Departments: ${tagSnapshot.depts.join(', ')}`);

    if (contextTags.length > 0) {
      messageForAI = `${messageForAI}\n\n(System Note: User UI tags: ${contextTags.join(' | ')})`;
    }

try {
      const payloadToSend = {
        message: messageForAI,
        thread_id: threadId,
        user_id: user?.id || "user_01",
        user_name: user?.user_metadata?.full_name
      };

      const response = await fetch("https://scada-i-umhack26.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToSend),
      });

      if (!response.ok) {
        throw new Error("Server error");
      }

      const data = await response.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'agent', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'agent', 
          text: "The server connected but didn't provide a reply. Please try again." 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        text: "Connection failed. Please check your internet or try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
    

    // ==========================================
    // MANUAL TEST CODE (Simulating AI Reply)
    // ==========================================
    /*
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        text: "I have checked the availability for your requested date. Unfortunately, the main hall is currently undergoing maintenance. However, I can offer you Bilik Ilmuan 1 or the Seminar Room as alternatives. \n\nBoth spaces are fully equipped with high-speed Wi-Fi, premium sound systems, and enough seating for up to 50 participants. Please let me know if you would like me to lock in these dates for you, or if you need to add more equipment like microphones or extra flip charts to your list. Our team is ready to assist you in making your event a success!" 
      }]);
      setIsLoading(false);
    }, 1500); 
    */
    // ==========================================
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    onSetRequirement('');
    setMessages([]);
    onSetDisplayedSpace(null);
    onSetDisplayedEquipment([]);
    onSetDisplayedDepts([]);
    setIsSidebarOpen(false);
  };

  const handleClearSpace = () => onSetDisplayedSpace(null);
  const handleRemoveEquipment = (indexToRemove: number) => {
    const updatedList = displayedEquipment.filter((_, index) => index !== indexToRemove);
    onSetDisplayedEquipment(updatedList);
  };
  const handleRemoveDept = (indexToRemove: number) => {
    const updatedList = displayedDepts.filter((_, index) => index !== indexToRemove);
    onSetDisplayedDepts(updatedList);
  };

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  return (
    <div className="flex h-svh w-full bg-[#F0F4F8] text-[#1A1A1A] overflow-hidden relative">
      
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
            <input type="text" placeholder="Search" onBlur={handleBlur} className="w-full bg-white rounded-full py-2.5 pl-11 pr-4 text-[16px] border-none shadow-sm outline-none" />
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
                  isSidebarOpen ? 'md:opacity-100 md:scale-100 opacity-0 scale-0 pointer-events-none md:pointer-events-auto' : 'opacity-100 scale-100'
                }`}
              >
                <img src={iconMenu} alt="Menu" className="h-5 w-auto" />
              </button>
              
              <button onClick={handleNewChat} className="hover:opacity-70 transition">
                <img src={logo} alt="DeepNaN" className="h-6 w-auto" />
              </button>
            </div>
            <button onClick={onOpenBookingStatus} className="bg-white px-5 py-2 rounded-full shadow-sm font-bold uppercase tracking-widest text-[11px] text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-cyan-400">
              Bookings
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col px-5 md:px-10 overflow-hidden relative">
          
          <div className="flex-1 overflow-y-auto no-scrollbar pt-4 flex flex-col">
            {messages.length === 0 ? (
              <div className="mt-4 md:mt-9 mb-auto w-full flex flex-col items-start md:items-center">
                <div className="w-full text-left md:text-center">
                  <h2 className="text-2xl md:text-4xl text-slate-900 font-light">Hey {user?.user_metadata?.full_name}</h2>
                  <h1 className="text-4xl md:-mt-1 md:text-5xl font-bold text-slate-900 leading-tight">Planning an event?</h1>
                  <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">We'll sort out the perfect space & equipment.</p>
                </div>
                <div className="flex flex-col md:flex-row justify-start md:justify-center items-start md:items-center gap-4 md:gap-3 mt-7 w-full">
                  <button onClick={onOpenBrowseSpaces} className="px-10 py-3 bg-[#D4F7F2] hover:bg-[#bcf0e9] rounded-[20px] md:rounded-full text-[14px] font-medium shadow-sm active:scale-95 whitespace-nowrap">Browse Spaces</button>
                  <button onClick={onOpenEquipmentCatalog} className="px-10 py-3 bg-[#D6EAFB] hover:bg-[#c1e0f9] rounded-[20px] md:rounded-full text-[14px] font-medium shadow-sm active:scale-95 whitespace-nowrap">Equipment Catalog</button>
                  <button onClick={onOpenDepartmentDirectory} className="px-10 py-3 bg-[#D7DCFF] hover:bg-[#c2c9ff] rounded-[20px] md:rounded-full text-[14px] font-medium shadow-sm active:scale-95 whitespace-nowrap">Department Directory</button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-3xl mx-auto flex flex-col gap-5 pb-0 mt-auto">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm whitespace-pre-wrap ${
                      msg.role === 'user' ? 'bg-[#1A1A1A] text-white rounded-br-none' : 'bg-white text-[#1A1A1A] border border-slate-200 rounded-bl-none'
                    }`}>
                      {msg.text || (msg.role === 'user' && "Check these requirements:")}
                    </div>
                    
                    {msg.role === 'user' && msg.tags && (
                      <div className="flex flex-wrap justify-end gap-2 mt-2 max-w-[85%]">
                        {msg.tags.space && (
                          <div className="bg-green-50 px-3 py-1 rounded-full border border-green-100 text-[11px] font-medium text-green-600">
                            space: <span className="font-bold">{msg.tags.space}</span>
                          </div>
                        )}
                        {msg.tags.equipment.map((item, i) => (
                          <div key={i} className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-[11px] font-medium text-blue-600">
                            equipment: <span className="font-bold">{item}</span>
                          </div>
                        ))}
                        {msg.tags.depts.map((dept, i) => (
                          <div key={i} className="bg-purple-50 px-3 py-1 rounded-full border border-purple-100 text-[11px] font-medium text-purple-600">
                            dept: <span className="font-bold">{dept}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl rounded-bl-none shadow-sm text-slate-400">
                      <span className="animate-pulse italic">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="w-full max-w-2xl mx-auto mt-2 mb-4 shrink-0">
            {requirement === '' && messages.length === 0 && (
              <div className="flex flex-row justify-start md:justify-center gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                {['Book room', 'Book equipment', 'Find the contact','Operating time','View history'].map(label => (
                  <button key={label} onClick={() => onSetRequirement(label)} className="text-[13px] border border-slate-300 px-5 py-2 rounded-2xl bg-white/50 hover:bg-white text-center transition-all whitespace-nowrap active:scale-95 font-medium text-slate-600 shadow-xs">
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-white rounded-[28px] md:rounded-4xl px-6 py-2.5 md:py-3.5 border border-white focus-within:border-slate-200 transition-all shadow-lg flex items-center relative overflow-hidden">
              <div className="flex flex-col w-full py-2">
                
                <div className="flex flex-wrap gap-2 items-center mb-1 max-h-20 overflow-y-auto custom-scrollbar pr-1">
                  {displayedSpace ? (
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200 text-xs font-medium text-green-700 animate-in zoom-in-95 duration-200">
                      <span>space: <span className="font-semibold">{displayedSpace}</span></span>
                      <button onClick={handleClearSpace} className="hover:text-green-900 font-bold ml-0.5">✕</button>
                    </div>
                  ) : (
                    <button onClick={onOpenBrowseSpaces} className="flex items-center gap-1.5 border border-dashed border-slate-300 px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-all active:scale-95">
                      + Add Space
                    </button>
                  )}

                  {displayedEquipment.length > 0 ? (
                    displayedEquipment.map((item, index) => (
                      <div key={`equip-${index}`} className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 text-xs font-medium text-blue-700 animate-in zoom-in-95 duration-200">
                        <span>equipment: <span className="font-semibold">{item}</span></span>
                        <button onClick={() => handleRemoveEquipment(index)} className="hover:text-blue-900 font-bold ml-0.5 active:scale-75">✕</button>
                      </div>
                    ))
                  ) : (
                    <button onClick={onOpenEquipmentCatalog} className="flex items-center gap-1.5 border border-dashed border-slate-300 px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-all active:scale-95">
                      + Add Equipment
                    </button>
                  )}

                  {displayedDepts.length > 0 ? (
                    displayedDepts.map((dept, index) => (
                      <div key={`dept-${index}`} className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full border border-purple-200 text-xs font-medium text-purple-700 animate-in zoom-in-95 duration-200">
                        <span>dept: <span className="font-semibold">{dept}</span></span>
                        <button onClick={() => handleRemoveDept(index)} className="hover:text-purple-900 font-bold ml-0.5 active:scale-75">✕</button>
                      </div>
                    ))
                  ) : (
                    <button onClick={onOpenDepartmentDirectory} className="flex items-center gap-1.5 border border-dashed border-slate-300 px-3 py-1 rounded-full text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-all active:scale-95">
                      + Add Dept
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full">
                  <textarea
                    ref={textareaRef}
                    value={requirement}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder="Type in your requirement"
                    rows={1}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] outline-none text-slate-700 resize-none placeholder-slate-300 font-normal leading-normal h-auto no-scrollbar max-h-40 overflow-y-hidden py-1 disabled:opacity-50"
                  />
                  <div className="flex items-center shrink-0">
                    <button onClick={handleSendMessage} disabled={isLoading} className="transition-all duration-200 active:scale-90 group p-1 flex items-center justify-center disabled:opacity-30">
                      <span className="text-2xl text-slate-300 rotate-[-15deg] block group-hover:text-blue-500 transition-colors leading-none">➤</span>
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