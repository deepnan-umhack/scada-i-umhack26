import React, { useState, useRef, useEffect } from 'react';
import logo from '../assets/LogoS.svg';
import iconMenu from '../assets/Menu.svg';
import iconSettings from '../assets/Settings.svg';
import iconInbox from '../assets/Inbox.svg';
import iconEdit from '../assets/Edit.svg';
import iconSearch from '../assets/Search.svg';
import { supabase } from '../lib/supabaseClient';

interface MainChatProps {
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

// 1. Define how a message object looks
interface Message {
  role: 'user' | 'agent';
  text: string;
}

const MainChat: React.FC<MainChatProps> = ({ 
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
  const [requirement, setRequirement] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 2. Add states for the chat interaction
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

  // Auto-scroll to the bottom when a new message appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRequirement(e.target.value);
  };

  // 3. The actual API integration function
  const handleSendMessage = async () => {
    if (!requirement.trim() || isLoading) return;

    const userText = requirement;
    setRequirement(''); // Clear input immediately
    
    // Push ONLY the text they typed to the screen (keeps the UI clean)
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    // --- NEW LOGIC: Bundle the selected chips into the AI's message ---
    let messageForAI = userText;
    const contextTags = [];
    
    if (displayedSpace) contextTags.push(`Space: ${displayedSpace}`);
    if (displayedEquipment && displayedEquipment.length > 0) contextTags.push(`Equipment: ${displayedEquipment.join(', ')}`);
    if (displayedDepts && displayedDepts.length > 0) contextTags.push(`Departments: ${displayedDepts.join(', ')}`);

    if (contextTags.length > 0) {
      // Secretly append the UI context so the AI knows what they clicked
      messageForAI = `${userText}\n\n(System Note: The user has selected the following UI tags: ${contextTags.join(' | ')})`;
    }
    // ------------------------------------------------------------------

    try {
      const payloadToSend = {
        message: messageForAI, // We send the bundled string here!
        thread_id: threadId,
        user_id: user?.id || "user_01",
        user_name: user?.user_metadata?.full_name || "Guest"
      };

      // Print it so you can verify the merge conflict is gone
      console.log("SENDING THIS TO BACKEND:", payloadToSend);

      const response = await fetch("https://scada-i-umhack26.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToSend),
      });

      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();
      const agentReply = data.reply;
      
      if (agentReply) {
        setMessages(prev => [...prev, { role: 'agent', text: agentReply }]);
      } else {
        setMessages(prev => [...prev, { role: 'agent', text: "Agent didn't have a response for that." }]);
      }

    } catch (error) {
      console.error("Agent error:", error);
      setMessages(prev => [...prev, { role: 'agent', text: "Connection failed. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };
  // Listen for the Enter key to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setRequirement('');
    setMessages([]); // Clear the history
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
            <input 
              type="text" 
              placeholder="Search" 
              onBlur={handleBlur}
              className="w-full bg-white rounded-full py-2.5 pl-11 pr-4 text-[16px] border-none shadow-sm outline-none" 
            />
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

        {/* Main Content Area*/}
        <div className="flex-1 flex flex-col items-start md:items-center px-5 md:px-10 justify-end pb-4 md:pb-10 overflow-hidden relative">
        
          {messages.length === 0 ? (
            <div className="w-full flex flex-col items-start md:items-center mb-auto pt-8 md:pt-16 shrink-0">
              <div className="w-full text-left md:text-center">
                <h2 className="text-2xl md:text-4xl text-slate-900 font-light">Hey {user?.user_metadata?.full_name || 'username'}</h2>
                <h1 className="text-4xl md:text-5xl font-bold mt-1 text-slate-900 leading-tight">Planning an event?</h1>
                <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">We'll sort out the perfect space & equipment.</p>
              </div>

              <div className="flex flex-col md:flex-row justify-start md:justify-center items-start md:items-center gap-4 md:gap-3 mt-10 w-full">
                <button onClick={onOpenBrowseSpaces} className="px-10 py-3 bg-[#D4F7F2] hover:bg-[#bcf0e9] rounded-[20px] md:rounded-full text-[14px] md:text-[17px] font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap">Browse Spaces</button>
                <button onClick={onOpenEquipmentCatalog} className="px-10 py-3 bg-[#D6EAFB] hover:bg-[#c1e0f9] rounded-[20px] md:rounded-full text-[14px] md:text-[17px] font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap">Equipment Catalog</button>
                <button onClick={onOpenDepartmentDirectory} className="px-10 py-3 bg-[#D7DCFF] hover:bg-[#c2c9ff] rounded-[20px] md:rounded-full text-[14px] md:text-[17px] font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap">Department Directory</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full max-w-3xl overflow-y-auto no-scrollbar pt-4 pb-20 flex flex-col gap-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                    msg.role === 'user' ? 'bg-[#1a1a1a] text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl rounded-bl-none shadow-sm text-slate-400">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Bottom Chat Area */}
          <div className="w-full max-w-2xl mt-8 shrink-0">
            
            {/* Suggestion buttons */}
            {requirement === '' && (
              <div className="flex flex-row justify-start md:justify-center gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
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
                
                {/* Chip area */}
                {(displayedSpace || displayedEquipment.length > 0 || displayedDepts.length > 0) && (
                  <div className="flex flex-wrap gap-2 items-center mb-3 max-h-32 overflow-y-auto no-scrollbar">
                    {displayedSpace && (
                      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95 duration-200">
                        <span>space: <span className="font-semibold">{displayedSpace}</span></span>
                        <button onClick={handleClearSpace} className="hover:text-slate-900 transition-colors cursor-pointer font-bold ml-0.5">✕</button>
                      </div>
                    )}
                    
                    {displayedDepts.map((dept, index) => (
                      <div key={`dept-${index}`} className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full border border-purple-200 text-xs font-medium text-purple-700 animate-in fade-in zoom-in-95 duration-200">
                        <span>dept: <span className="font-semibold">{dept}</span></span>
                        <button onClick={() => handleRemoveDept(index)} className="hover:text-purple-900 transition-colors font-bold ml-0.5 active:scale-75 cursor-pointer">✕</button>
                      </div>
                    ))}

                    {displayedEquipment.map((item, index) => (
                      <div key={`equip-${index}`} className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 text-xs font-medium text-blue-700 animate-in fade-in zoom-in-95 duration-200">
                        <span>equipment: <span className="font-semibold">{item}</span></span>
                        <button onClick={() => handleRemoveEquipment(index)} className="hover:text-blue-900 transition-colors font-bold ml-0.5 active:scale-75 cursor-pointer">✕</button>
                      </div>
                    ))}
                  </div>
                )}

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
                    <button 
                      onClick={handleSendMessage}
                      disabled={isLoading || !requirement.trim()}
                      className="transition-all duration-200 active:scale-90 group p-1 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
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