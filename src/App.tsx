import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import MainChat from './pages/MainChat';
import BrowseSpaces from './pages/BrowseSpaces';
import BookingStatus from './pages/BookingStatus';
import EquipmentCatalog from './pages/EquipmentCatalog';
import DepartmentDirectory from './pages/DepartmentDirectory';
import ProfileSettings from './pages/ProfileSettings';

function App() {
  const [showLanding, setShowLanding] = useState(true);
  
  const [activeView, setActiveView] = useState<'chat' | 'browse' | 'bookings' | 'catalog' | 'directory' | 'profile'>('chat');

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
      
      {/* Main */}
      <div className="w-full h-full">
        <AnimatePresence mode="wait">
          
          {/* Main Chat */}
          {activeView === 'chat' && (
            <motion.div key="chat" {...snappyVariants} className="h-full">
              <MainChat 
                onOpenBrowseSpaces={() => setActiveView('browse')} 
                onOpenBookingStatus={() => setActiveView('bookings')} 
                onOpenEquipmentCatalog={() => setActiveView('catalog')}
                onOpenDepartmentDirectory={() => setActiveView('directory')}
                onOpenProfileSettings={() => setActiveView('profile')} // Profile Trigger
              />
            </motion.div>
          )}

          {/* Browse Spaces */}
          {activeView === 'browse' && (
            <motion.div key="browse" {...snappyVariants} className="h-full">
              <BrowseSpaces 
                onBack={() => setActiveView('chat')} 
                onOpenBookingStatus={() => setActiveView('bookings')}
                onOpenProfileSettings={() => setActiveView('profile')} // Profile Trigger
              />
            </motion.div>
          )}

          {/* Equipment Catalog */}
          {activeView === 'catalog' && (
            <motion.div key="catalog" {...snappyVariants} className="h-full">
              <EquipmentCatalog 
                onBack={() => setActiveView('chat')} 
                onOpenBookingStatus={() => setActiveView('bookings')}
                onOpenProfileSettings={() => setActiveView('profile')} // Profile Trigger
              />
            </motion.div>
          )}

          {/* Department Directory */}
          {activeView === 'directory' && (
            <motion.div key="directory" {...snappyVariants} className="h-full">
              <DepartmentDirectory 
                onBack={() => setActiveView('chat')} 
                onOpenBookingStatus={() => setActiveView('bookings')}
                onOpenProfileSettings={() => setActiveView('profile')} // Profile Trigger
              />
            </motion.div>
          )}

          {/* Booking Status */}
          {activeView === 'bookings' && (
            <motion.div key="bookings" {...snappyVariants} className="h-full">
              <BookingStatus 
                onBack={() => setActiveView('chat')} 
                onOpenProfileSettings={() => setActiveView('profile')} // Profile Trigger
              />
            </motion.div>
          )}

          {/* Profile & Settings */}
          {activeView === 'profile' && (
            <motion.div key="profile" {...snappyVariants} className="h-full">
              <ProfileSettings 
                onBack={() => setActiveView('chat')} 
                onOpenBookingStatus={() => setActiveView('bookings')} 
              />
            </motion.div>
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