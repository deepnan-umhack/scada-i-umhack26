import React, { useState, useRef, useEffect, type JSX } from 'react';
import logo from '../assets/LogoS.svg';
import iconMenu from '../assets/Menu.svg';
import iconSettings from '../assets/Settings.svg';
import iconInbox from '../assets/Inbox.svg';
import iconEdit from '../assets/Edit.svg';
import iconSearch from '../assets/Search.svg';
import { supabase } from '../lib/supabaseClient';
import ReactMarkdown from 'react-markdown';

const IconRetry = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
);

const IconMore = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
);

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
  thoughts?: string[];
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

  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem('chat_messages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });

  const [threadId, setThreadId] = useState(() => {
    return localStorage.getItem('current_thread_id') || Math.random().toString(36).substring(7);
  });

  const [chatHistory, setChatHistory] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chat_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<number, boolean>>({});
  const useMockAI = false;

  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('current_thread_id', threadId);
  }, [threadId]);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      let titleText = firstUserMsg?.text || 'Booking Inquiry';

      if (!firstUserMsg?.text && firstUserMsg?.tags?.space) {
        titleText = `Booking for ${firstUserMsg.tags.space}`;
      }

      setChatHistory(prev => {
        const existingIndex = prev.findIndex(p => p.id === threadId);
        const existingChat = prev[existingIndex];

        const title = existingChat?.isCustomTitle
          ? existingChat.title
          : (titleText.slice(0, 28) + (titleText.length > 28 ? '...' : ''));

        const newSession = {
          id: threadId,
          title,
          messages,
          isCustomTitle: existingChat?.isCustomTitle
        };

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newSession;
          return updated;
        }
        return [newSession, ...prev];
      });
    }
  }, [messages, threadId]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

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

  const handleRetry = async () => {
    if (isLoading) return;

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === 'agent') {
        return prev.slice(0, -1);
      }
      return prev;
    });

    await sendToAI(lastUserMsg.text, lastUserMsg.tags || { space: null, equipment: [], depts: [] });
  };

  const sendToAI = async (text: string, tags: any) => {
    setIsLoading(true);

    if (useMockAI) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'agent',
            text: `This is a mock response for UI testing.\nYou wrote: "${text || '...'}"`,
            thoughts: ["Walking through the request and preparing the best answer..."],
            isError: false
          }]);
          setIsLoading(false);
          resolve();
        }, 900);
      });
      return;
    }

    let messageForAI = text || "(User sent tags only)";
    const contextTags: string[] = [];
    if (tags.space) contextTags.push(`Space: ${tags.space}`);
    if (tags.equipment.length > 0) contextTags.push(`Equipment: ${tags.equipment.join(', ')}`);
    if (tags.depts.length > 0) contextTags.push(`Departments: ${tags.depts.join(', ')}`);

    if (contextTags.length > 0) {
      messageForAI = `${messageForAI}\n\n(System Note: User UI tags: ${contextTags.join(' | ')})`;
    }

    try {
      const payloadToSend = {
        message: messageForAI,
        thread_id: threadId,
        user_id: user?.id ? `${user.id}` : "user_01"
      };

      const response = await fetch("https://scada-i-umhack26-production.up.railway.app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToSend),
      });

      if (!response.ok) {
        throw new Error("Server error");
      }

      const contentType = response.headers.get("content-type") || "";
      const isStream = contentType.includes("text/event-stream") || contentType.includes("text/plain") || !contentType.includes("application/json");

      if (isStream && response.body) {
        setMessages(prev => [...prev, { role: 'agent', text: '', thoughts: [] }]);
        setIsLoading(false);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const appendThought = (thought: string) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'agent') {
              updated[updated.length - 1] = { ...last, thoughts: [...(last.thoughts ?? []), thought] };
            }
            return updated;
          });
        };

        const appendText = (token: string) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'agent') {
              updated[updated.length - 1] = { ...last, text: last.text + token };
            }
            return updated;
          });
        };

        const processLine = (line: string) => {
          const raw = line.startsWith('data: ') ? line.slice(6).trim() : line.trim();
          if (!raw || raw === '[DONE]') return;

          try {
            const parsed = JSON.parse(raw);
            const type = parsed.type;

            if (type === 'thought') {
              const detail: string = parsed.details ?? parsed.text ?? parsed.content ?? '';
              if (detail) appendThought(detail);

            } else if (type === 'action') {
              const agent: string = parsed.agent ?? 'Agent';
              const action: string = parsed.action ?? '';
              const rawDetails: string = parsed.details ?? '';

              let detailText = rawDetails;

              // Try to extract JSON anywhere in the string (handles mixed text + JSON)
              const jsonMatch = rawDetails.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const innerJson = JSON.parse(jsonMatch[0]);
                  // Use .message if present, otherwise pretty-print the whole object
                  detailText = typeof innerJson.message === 'string'
                    ? innerJson.message.trim()
                    : JSON.stringify(innerJson, null, 2);
                } catch {
                  detailText = rawDetails;
                }
              }

              const thoughtEntry = `${agent} — ${action}${detailText ? `\n${detailText}` : ''}`;
              appendThought(thoughtEntry);

            } else if (type === 'final_response') {
              const token: string = parsed.details ?? parsed.text ?? parsed.content ?? parsed.reply ?? '';
              if (token) appendText(token);

            } else if (type === 'done') {
              // stream complete, nothing to do

            } else {
              const token: string = parsed.token ?? parsed.text ?? parsed.content ?? parsed.reply ?? raw;
              if (token) appendText(token);
            }

          } catch {
            // Not JSON — append raw as text token
            if (raw) appendText(raw);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) processLine(line);
        }
        if (buffer.trim()) processLine(buffer);

        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'agent' && !last.text.trim()) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, text: "The server connected but didn't provide a reply. Please try again.", isError: true };
            return updated;
          }
          return prev;
        });

      } else {
        const data = await response.json();
        const replyText = data.reply || "The server connected but didn't provide a reply. Please try again.";
        setMessages(prev => [...prev, {
          role: 'agent',
          text: replyText,
          thoughts: data.thought ? [data.thought] : [],
          isError: !data.reply
        }]);
      }
    } catch (error) {
      console.error("Chat API failed:", error);
      setMessages(prev => [...prev, {
        role: 'agent',
        text: "Connection failed. Please check your internet or try again later.",
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const hasContent = requirement.trim() || displayedSpace || displayedEquipment.length > 0 || displayedDepts.length > 0;
    if (!hasContent || isLoading) return;

    const userText = requirement;
    const tagSnapshot = {
      space: displayedSpace,
      equipment: [...displayedEquipment],
      depts: [...displayedDepts],
    };

    setMessages(prev => [...prev, {
      role: 'user',
      text: userText,
      tags: tagSnapshot,
    }]);

    onSetRequirement('');
    onSetDisplayedSpace(null);
    onSetDisplayedEquipment([]);
    onSetDisplayedDepts([]);

    await sendToAI(userText, tagSnapshot);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    if (messages.length === 0) {
      setIsSidebarOpen(false);
      return;
    }

    setThreadId(Math.random().toString(36).substring(7));
    onSetRequirement('');
    setMessages([]);
    onSetDisplayedSpace(null);
    onSetDisplayedEquipment([]);
    onSetDisplayedDepts([]);
    setIsSidebarOpen(false);
    localStorage.removeItem('chat_messages');
  };

  const loadChat = (session: ChatSession) => {
    if (editingChatId === session.id) return;

    setThreadId(session.id);
    setMessages(session.messages);
    onSetRequirement('');
    onSetDisplayedSpace(null);
    onSetDisplayedEquipment([]);
    onSetDisplayedDepts([]);
    setIsSidebarOpen(false);
  };

  const deleteChat = (e: React.MouseEvent, idToRemove: string) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(session => session.id !== idToRemove));
    setOpenMenuId(null);
    if (idToRemove === threadId) {
      handleNewChat();
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

  const renderInputTags = (): JSX.Element => {
    const allTags: JSX.Element[] = [];
    if (displayedSpace) {
      allTags.push(
        <div key="space" className="flex items-center justify-between gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 text-xs font-medium text-green-700 w-auto h-7 shrink-0 animate-in zoom-in-95 duration-200">
          <span className="truncate">space: <span className="font-bold">{displayedSpace}</span></span>
          <button onClick={() => onSetDisplayedSpace(null)} className="hover:text-green-900 font-bold ml-1">✕</button>
        </div>
      );
    }
    displayedEquipment.forEach((item, index) => {
      allTags.push(
        <div key={`equip-${index}`} className="flex items-center justify-between gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 text-xs font-medium text-blue-700 w-auto h-7 shrink-0 animate-in zoom-in-95 duration-200">
          <span className="truncate">equip: <span className="font-bold">{item}</span></span>
          <button onClick={() => onSetDisplayedEquipment(displayedEquipment.filter((_, i) => i !== index))} className="hover:text-blue-900 font-bold ml-1">✕</button>
        </div>
      );
    });
    displayedDepts.forEach((dept, index) => {
      allTags.push(
        <div key={`dept-${index}`} className="flex items-center justify-between gap-2 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200 text-xs font-medium text-purple-700 w-auto h-7 shrink-0 animate-in zoom-in-95 duration-200">
          <span className="truncate">dept: <span className="font-bold">{dept}</span></span>
          <button onClick={() => onSetDisplayedDepts(displayedDepts.filter((_, i) => i !== index))} className="hover:text-purple-900 font-bold ml-1">✕</button>
        </div>
      );
    });

    const ghostTags: JSX.Element[] = [];
    if (!displayedSpace) ghostTags.push(<button key="g-s" onClick={() => onOpenBrowseSpaces()} className="flex items-center gap-1.5 border border-dashed border-slate-300 px-4 py-1.5 rounded-full text-xs font-medium text-slate-400 h-7 shrink-0 hover:bg-slate-50 transition-colors">+ Add Space</button>);
    if (displayedEquipment.length === 0) ghostTags.push(<button key="g-e" onClick={() => onOpenEquipmentCatalog()} className="flex items-center gap-1.5 border border-dashed border-slate-300 px-4 py-1.5 rounded-full text-xs font-medium text-slate-400 h-7 shrink-0 hover:bg-slate-50 transition-colors">+ Add Equipment</button>);
    if (displayedDepts.length === 0) ghostTags.push(<button key="g-d" onClick={() => onOpenDepartmentDirectory()} className="flex items-center gap-1.5 border border-dashed border-slate-300 px-4 py-1.5 rounded-full text-xs font-medium text-slate-400 h-7 shrink-0 hover:bg-slate-50 transition-colors">+ Add Dept</button>);

    const allMobile = [...allTags, ...ghostTags];
    const mRow1 = allMobile.filter((_, idx) => idx === 0 || idx === 1 || (idx > 3 && idx % 2 === 0));
    const mRow2 = allMobile.filter((_, idx) => idx === 2 || idx === 3 || (idx > 3 && idx % 2 !== 0));
    const dCount = Math.max(3, Math.ceil(allTags.length / 2));

    return (
      <>
        {/* Mobile View */}
        <div className="flex md:hidden flex-col w-full overflow-x-auto no-scrollbar gap-2 pb-1 mb-2 items-start transition-all">
          <div className="flex flex-row gap-2 shrink-0 min-w-max">{mRow1}</div>
          {mRow2.length > 0 && <div className="flex flex-row gap-2 shrink-0 min-w-max">{mRow2}</div>}
        </div>
        {/* Desktop View */}
        <div className="hidden md:flex flex-row w-full overflow-x-auto no-scrollbar gap-2 pb-1 mb-2 items-start transition-all">
          {allTags.length > 0 && (
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex flex-row gap-2 shrink-0">{allTags.slice(0, dCount)}</div>
              {allTags.length > dCount && <div className="flex flex-row gap-2 shrink-0">{allTags.slice(dCount)}</div>}
            </div>
          )}
          {ghostTags.length > 0 && <div className="flex flex-row items-center gap-2 shrink-0 h-7">{ghostTags}</div>}
        </div>
      </>
    );
  };

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

                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => handleToggleMenu(e, chat.id)}
                      className={`p-1 rounded-md transition-colors ${openMenuId === chat.id ? 'bg-slate-200 text-slate-700 opacity-100' : 'text-gray-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                      title="Options"
                    >
                      <IconMore />
                    </button>

                    {openMenuId === chat.id && (
                      <div className="absolute right-0 top-full mt-1 w-28 bg-white border border-slate-200 shadow-lg rounded-xl z-50 overflow-hidden text-sm py-1 font-medium">
                        <button
                          onClick={(e) => handleStartRename(e, chat)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700"
                        >
                          Rename
                        </button>
                        <button
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
        {/* Header */}
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

                    <div className={`max-w-[92%] px-5 py-4 shadow-sm overflow-hidden wrap-break-word w-fit ${msg.role === 'user'
                      ? 'bg-slate-900 text-white border border-slate-800 rounded-3xl rounded-br-none'
                      : 'bg-white text-[#1A1A1A] border border-slate-200 rounded-3xl rounded-bl-none'
                      }`}>

                      {msg.role === 'agent' ? (
                        <>
                          {msg.thoughts && msg.thoughts.length > 0 && (
                            <div className="mb-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setExpandedThoughts(prev => ({ ...prev, [idx]: !prev[idx] }));
                                }}
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors outline-none"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse"></span>
                                <span className="uppercase tracking-widest">Thought for a moment</span>
                                <svg
                                  className={`w-3 h-3 ml-1 transition-transform duration-200 ${expandedThoughts[idx] ? 'rotate-180' : ''}`}
                                  viewBox="0 0 16 16" fill="none"
                                >
                                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>

                              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedThoughts[idx] ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                <div className="border-l-2 border-slate-200 pl-3 ml-1 flex flex-col gap-2">
                                  {msg.thoughts.map((thoughtItem, ti) => (
                                    <div key={ti} className="text-[11px] leading-relaxed text-slate-500 italic whitespace-pre-wrap font-mono">
                                      {thoughtItem}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="prose prose-sm max-w-none prose-slate wrap-break-word whitespace-pre-wrap [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                        </>
                      ) : (
                        <div className="whitespace-pre-wrap wrap-break-word text-sm leading-6">
                          {msg.text || "Check these requirements:"}
                        </div>
                      )}
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

                    {msg.role === 'agent' && idx === messages.length - 1 && !isLoading && (
                      <button
                        onClick={handleRetry}
                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-wider"
                      >
                        <IconRetry /> {msg.isError ? 'Try again' : 'Regenerate'}
                      </button>
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

          <div className="w-full max-w-3xl mx-auto mt-2 mb-4 shrink-0">
            {requirement === '' && messages.length === 0 && (
              <div className="flex flex-row justify-start md:justify-center gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                {['Book room', 'Book equipment', 'Find the contact', 'Operating time', 'View history'].map(label => (
                  <button key={label} onClick={() => onSetRequirement(label)} className="text-[13px] border border-slate-300 px-5 py-2 rounded-2xl bg-white/50 hover:bg-white text-center transition-all whitespace-nowrap active:scale-95 font-medium text-slate-600 shadow-xs">
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-white rounded-[28px] md:rounded-4xl px-6 py-2.5 md:py-3.5 border border-white focus-within:border-slate-200 transition-all shadow-lg flex items-center relative overflow-hidden">
              <div className="flex flex-col w-full py-2">
                {renderInputTags()}
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
                  <button onClick={() => handleSendMessage()} disabled={isLoading} className="transition-all duration-200 active:scale-90 group p-1 flex items-center justify-center disabled:opacity-30">
                    <span className="text-2xl text-slate-300 rotate-[-15deg] block group-hover:text-blue-500 transition-colors leading-none">➤</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainChat;