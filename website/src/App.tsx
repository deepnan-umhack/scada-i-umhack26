import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import MainChat from './pages/MainChat';
import BrowseSpaces from './pages/BrowseSpaces';
import BookingStatus from './pages/BookingStatus';
import EquipmentCatalog from './pages/EquipmentCatalog';
import DepartmentDirectory from './pages/DepartmentDirectory';
import ProfileSettings from './pages/ProfileSettings';

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'browse' | 'bookings' | 'catalog' | 'directory' | 'profile'>('chat');
  const [draftMessage, setDraftMessage] = useState('');
  const [displayedSpace, setDisplayedSpace] = useState<string | null>(null);
  const [displayedEquipment, setDisplayedEquipment] = useState<string[]>([]);
  const [displayedDepts, setDisplayedDepts] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLanding(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const snappyVariants = {
    initial: { opacity: 0, scale: 0.99 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.01 }, 
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const } 
  };

  return (
    <div className="relative w-full h-svh bg-[#F0F4F8] overflow-hidden">
      
      <div className="w-full h-full">
        <AnimatePresence mode="wait">
          
          {!isAuthenticated ? (
            <motion.div key="auth" {...snappyVariants} className="h-full">
              <AuthPage onLoginSuccess={() => setIsAuthenticated(true)} />
            </motion.div>
          ) : (
            <>
              {/* MAIN CHAT VIEW */}
              {activeView === 'chat' && (
                <motion.div key="chat" {...snappyVariants} className="h-full">
                  <MainChat 
                    requirement={draftMessage}         // Persistent draft text
                    onSetRequirement={setDraftMessage} // Setter for text
                    displayedSpace={displayedSpace}
                    onSetDisplayedSpace={setDisplayedSpace}
                    displayedEquipment={displayedEquipment}
                    onSetDisplayedEquipment={setDisplayedEquipment}
                    displayedDepts={displayedDepts}
                    onSetDisplayedDepts={setDisplayedDepts}
                    onOpenBrowseSpaces={() => setActiveView('browse')} 
                    onOpenBookingStatus={() => setActiveView('bookings')} 
                    onOpenEquipmentCatalog={() => setActiveView('catalog')}
                    onOpenDepartmentDirectory={() => setActiveView('directory')}
                    onOpenProfileSettings={() => setActiveView('profile')}
                  />
                </motion.div>
              )}

              {/* BROWSE SPACES VIEW */}
              {activeView === 'browse' && (
                <motion.div key="browse" {...snappyVariants} className="h-full">
                  <BrowseSpaces 
                    onBack={() => setActiveView('chat')} 
                    selectedSpace={displayedSpace} // For grayscale/already tagged logic
                    onSpaceSelected={(spaceName) => {
                      if (displayedSpace !== spaceName) {
                        setDisplayedSpace(spaceName);
                        setActiveView('chat');
                      }
                    }}
                    onOpenBookingStatus={() => setActiveView('bookings')}
                    onOpenProfileSettings={() => setActiveView('profile')}
                  />
                </motion.div>
              )}

              {/* EQUIPMENT CATALOG VIEW */}
              {activeView === 'catalog' && (
                <motion.div key="catalog" {...snappyVariants} className="h-full">
                  <EquipmentCatalog 
                    onBack={() => setActiveView('chat')} 
                    selectedEquipment={displayedEquipment} // For ADDED badge logic
                    onEquipmentSelected={(equipmentWithQty) => {
                      // Logic: Replace existing tag for same item if quantity is updated
                      const baseName = equipmentWithQty.split(' (x')[0];
                      setDisplayedEquipment(prev => {
                        const filtered = prev.filter(item => !item.startsWith(baseName));
                        return [...filtered, equipmentWithQty];
                      });
                      setActiveView('chat');
                    }}
                    onOpenBookingStatus={() => setActiveView('bookings')}
                    onOpenProfileSettings={() => setActiveView('profile')}
                  />
                </motion.div>
              )}

              {/* DEPARTMENT DIRECTORY VIEW */}
              {activeView === 'directory' && (
                <motion.div key="directory" {...snappyVariants} className="h-full">
                  <DepartmentDirectory 
                    onBack={() => setActiveView('chat')} 
                    selectedDepts={displayedDepts} // For "Already Tagged" logic
                    onDepartmentSelected={(deptName) => {
                      if (!displayedDepts.includes(deptName)) {
                        setDisplayedDepts(prev => [...prev, deptName]);
                      }
                      setActiveView('chat');
                    }}
                    onOpenBookingStatus={() => setActiveView('bookings')}
                    onOpenProfileSettings={() => setActiveView('profile')}
                  />
                </motion.div>
              )}

              {/* BOOKING STATUS VIEW */}
              {activeView === 'bookings' && (
                <motion.div key="bookings" {...snappyVariants} className="h-full">
                  <BookingStatus 
                    onBack={() => setActiveView('chat')} 
                    onOpenProfileSettings={() => setActiveView('profile')}
                  />
                </motion.div>
              )}

              {/* PROFILE SETTINGS VIEW */}
              {activeView === 'profile' && (
                <motion.div key="profile" {...snappyVariants} className="h-full">
                  <ProfileSettings 
                    onBack={() => setActiveView('chat')} 
                    onOpenBookingStatus={() => setActiveView('bookings')}
                    onLogout={() => {
                        setIsAuthenticated(false);
                        setActiveView('chat');
                        setDraftMessage(''); // Reset draft on logout
                        setDisplayedEquipment([]);
                        setDisplayedDepts([]);
                        setDisplayedSpace(null);
                    }}
                  />
                </motion.div>
              )}
            </>
          )}

        </AnimatePresence>
      </div>

      {/* Landing Overlay */}
      <AnimatePresence>
        {showLanding && (
          <motion.div
            key="landing-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-100 bg-[#F0F4F8]"
          >
            <LandingPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;