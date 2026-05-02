import React, { useState, useEffect } from 'react';
import logo from '../assets/LogoS.svg';
import iconMenu from '../assets/Menu.svg';
import iconSettings from '../assets/Settings.svg';
import iconInbox from '../assets/Inbox.svg';
import iconEdit from '../assets/Edit.svg';
import iconSearch from '../assets/Search.svg';
import iconInfo from '../assets/Info.svg';
import Projector from '../assets/Projector.jpg';
import Desktop from '../assets/Desktop.jpg';
import ExtraFlipChart from '../assets/ExtraFlipChart.jpg';
import Extension from '../assets/Extension.jpg';
import Microphone from '../assets/Microphone.gif';
import Camera from '../assets/Camera.jpg';
import Table from '../assets/Table.jpg';
import Chair from '../assets/Chair.jpg';

const IconMore = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
);

interface EquipmentCatalogProps {
  onBack: () => void;
  onEquipmentSelected: (equipmentName: string) => void;
  onOpenBookingStatus: () => void;
  onOpenProfileSettings: () => void;
  selectedEquipment: string[];
}

// Interfaces needed for Chat History
interface Message {
  role: 'user' | 'agent';
  text: string;
  thought?: string;
  isError?: boolean;
  tags?: {
    space: string | null;
    equipment: string[];
    depts: string[];
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  isCustomTitle?: boolean;
}

const EquipmentCatalog: React.FC<EquipmentCatalogProps> = ({
  onBack,
  onEquipmentSelected,
  onOpenBookingStatus,
  onOpenProfileSettings,
  selectedEquipment
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ name: string, id: number } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);

  // --- CHAT HISTORY STATES ---
  const [threadId, setThreadId] = useState(() => localStorage.getItem('current_thread_id') || '');
  const [chatHistory, setChatHistory] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Sync history changes (deletions/renames) to localStorage
  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Close the 3-dots menu if user clicks anywhere outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // --- HISTORY MANAGEMENT FUNCTIONS ---
  const handleNewChat = () => {
    setIsSidebarOpen(false);
    localStorage.removeItem('chat_messages');
    const newId = Math.random().toString(36).substring(7);
    localStorage.setItem('current_thread_id', newId); // Force new thread
    setThreadId(newId);
    onBack(); // Return to MainChat
  };

  const loadChat = (session: ChatSession) => {
    if (editingChatId === session.id) return;

    // Set up localStorage so MainChat loads this specific session
    localStorage.setItem('current_thread_id', session.id);
    localStorage.setItem('chat_messages', JSON.stringify(session.messages));
    setThreadId(session.id);

    setIsSidebarOpen(false);
    onBack(); // Return to MainChat
  };

  const deleteChat = (e: React.MouseEvent, idToRemove: string) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(session => session.id !== idToRemove));
    setOpenMenuId(null);
    if (idToRemove === threadId) {
      localStorage.removeItem('chat_messages');
      const newId = Math.random().toString(36).substring(7);
      localStorage.setItem('current_thread_id', newId);
      setThreadId(newId);
    }
  };

  const handleToggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(prev => prev === id ? null : id);
  };

  const handleStartRename = (e: React.MouseEvent, chat: ChatSession) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
    setOpenMenuId(null);
  };

  const handleSaveRename = (e: React.SyntheticEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      setChatHistory(prev => prev.map(c =>
        c.id === id ? { ...c, title: editTitle.trim(), isCustomTitle: true } : c
      ));
    }
    setEditingChatId(null);
  };

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const handleConfirmQuantity = () => {
    if (selectedItem) {
      onEquipmentSelected(`${selectedItem.name} (x${quantity})`);
      setSelectedItem(null);
      setQuantity(1);
    }
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const equipment = [
    { id: 1, name: "Projector", img: Projector },
    { id: 2, name: "Desktop", img: Desktop },
    { id: 3, name: "Extra Flip Chart", img: ExtraFlipChart },
    { id: 4, name: "Extension", img: Extension },
    { id: 5, name: "Microphone", img: Microphone },
    { id: 6, name: "Camera", img: Camera },
    { id: 7, name: "Table", img: Table },
    { id: 8, name: "Chair", img: Chair },
  ];

  const getTaggedQuantity = (name: string) => {
    const found = selectedEquipment.find(item => item.startsWith(name));
    if (!found) return null;
    const match = found.match(/\(x(\d+)\)/);
    return match ? match[1] : null;
  };

  return (
    <div className="flex h-svh w-full bg-[#F0F4F8] text-[#1a1a1a] overflow-hidden relative">

      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-100 transition-all duration-500 ease-in-out px-6 w-full max-w-xs md:hidden ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}>
        <div className="bg-slate-800 text-white py-3 px-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700">
          <img src={iconInfo} className="h-4 w-4 invert opacity-80" alt="info" />
          <p className="text-[12px] font-medium tracking-wide">Tap any card to tag it to your chat</p>
        </div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/5 z-70 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

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
            <button type="button" onClick={handleNewChat} className="w-full flex items-center space-x-3 p-2 hover:bg-white/50 rounded-lg transition-all text-sm font-medium text-gray-700 active:scale-95">
              <img src={iconEdit} className="h-5 w-5 opacity-70" /><span>New chat</span>
            </button>
            <button type="button" onClick={onOpenBookingStatus} className="w-full flex items-center space-x-3 p-2 hover:bg-white/50 rounded-lg transition-all text-sm font-medium text-gray-700 active:scale-95">
              <img src={iconInbox} className="h-5 w-5 opacity-70" /><span>Booking history</span>
            </button>
          </div>
          <div className="pt-4 px-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Chats</div>

          {/* DYNAMIC HISTORY NAV WITH MENU */}
          <nav className="flex-1 overflow-y-auto space-y-1 min-h-0 custom-scrollbar text-sm text-gray-600">
            {chatHistory.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 italic">No recent chats</div>
            ) : (
              chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => loadChat(chat)}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${chat.id === threadId
                    ? 'bg-blue-50/50 text-blue-700 font-medium'
                    : 'hover:bg-white/50 text-slate-600'
                    }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden w-full">
                    <span className="text-lg opacity-50 shrink-0"></span>

                    {/* Rename Input vs Normal Title */}
                    {editingChatId === chat.id ? (
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(e, chat.id);
                          else if (e.key === 'Escape') setEditingChatId(null);
                        }}
                        onBlur={(e) => handleSaveRename(e, chat.id)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-white border border-blue-300 rounded px-1.5 py-0.5 outline-none text-black w-full text-xs"
                      />
                    ) : (
                      <span className="truncate pr-1">{chat.title}</span>
                    )}
                  </div>

                  {/* Kebab Menu Container */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleMenu(e, chat.id)}
                      className={`p-1 rounded-md transition-colors ${openMenuId === chat.id ? 'bg-slate-200 text-slate-700 opacity-100' : 'text-gray-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                      title="Options"
                    >
                      <IconMore />
                    </button>

                    {/* Dropdown Box */}
                    {openMenuId === chat.id && (
                      <div className="absolute right-0 top-full mt-1 w-28 bg-white border border-slate-200 shadow-lg rounded-xl z-50 overflow-hidden text-sm py-1 font-medium">
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(e, chat)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteChat(e, chat.id)}
                          className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
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
                className={`p-2 hover:bg-gray-200/50 rounded-lg transition-all duration-300 active:scale-90 ${isSidebarOpen ? 'md:opacity-100 md:scale-100 opacity-0 scale-0 pointer-events-none md:pointer-events-auto' : 'opacity-100 scale-100'
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

        <div className="flex-1 overflow-y-auto no-scrollbar touch-pan-y px-4 md:px-10">
          <div className="sticky -top-px z-40 bg-[#F0F4F8] pt-2 pb-4 -mx-4 px-4 -mt-1 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Equipment Catalog</h1>
              <p className="text-sm text-slate-500 font-medium">Browse and request event gear</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="group relative flex items-center justify-end">
                <button onClick={() => setShowToast(true)} className="flex items-center gap-2.5 bg-white border border-slate-200 h-9 px-3 rounded-full shadow-xs transition-all duration-500 ease-out max-w-10.5 md:group-hover:max-w-75 overflow-hidden whitespace-nowrap active:scale-95">
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

          <div className="pb-24 mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12 w-full">
              {equipment.map((item) => {
                const taggedQty = getTaggedQuantity(item.name);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform relative"
                  >
                    <div className="relative w-full aspect-4/3 overflow-hidden rounded-3xl md:rounded-4xl shadow-sm border border-slate-200/50 bg-white">
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />

                      {/* Tagged Badge */}
                      {taggedQty && (
                        <div className="absolute top-3 right-3 bg-blue-600 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-lg border border-blue-400 animate-in zoom-in-50 duration-300">
                          ADDED: x{taggedQty}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-linear-to-t from-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div className="mt-3 md:mt-4 px-1 text-center">
                      <span className={`text-[13px] md:text-[15px] font-medium leading-snug block group-hover:text-blue-600 transition-colors ${taggedQty ? 'text-blue-700 font-bold' : 'text-slate-800'}`}>
                        {item.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {selectedItem && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <div className="bg-white rounded-4xl p-8 w-full max-w-xs shadow-xl border border-white animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-slate-900 text-center mb-1">{selectedItem.name}</h3>
              <p className="text-sm text-slate-500 text-center mb-6">How many do you need?</p>

              <div className="flex items-center justify-center gap-6 mb-8">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl font-bold hover:bg-slate-200 active:scale-90 transition-all border border-slate-100"
                >-</button>
                <span className="text-2xl font-bold w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl font-bold hover:bg-slate-200 active:scale-90 transition-all border border-slate-100"
                >+</button>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleConfirmQuantity}
                  className="w-full py-4 bg-blue-800 text-white rounded-2xl font-bold text-[13px] uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                >
                  {getTaggedQuantity(selectedItem.name) ? 'Update Tag' : 'Add to Chat'}
                </button>
                <button
                  onClick={() => { setSelectedItem(null); setQuantity(1); }}
                  className="w-full py-3 text-slate-400 font-bold text-[11px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EquipmentCatalog;