import React from 'react';
import { motion } from 'framer-motion';
import logo from '../assets/Logo.svg'; 

const LandingPage: React.FC = () => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#F0F4F8] p-4 overflow-hidden">
      <div className="relative flex items-center justify-center">
        
        {/* Water Drop Effect */}
        <motion.div
          initial={{ y: -600, scaleY: 1.5, scaleX: 0.8, opacity: 1 }}
          animate={{ 
            y: 0, 
            scaleY: [1.5, 0.6, 2],
            scaleX: [0.8, 1.4, 2], 
            opacity: [1, 1, 0] 
          }}
          transition={{ 
            duration: 0.9, 
            ease: [0.45, 0, 0.55, 1],
            times: [0, 0.8, 1]
          }}
          className="absolute w-12 h-12 bg-slate-900 rounded-full z-20"
        />

        {/* Splash Ripples */}
        {[1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5], opacity: [0, 0.5, 0] }}
            transition={{ 
              delay: 0.7, 
              duration: 0.8, 
              ease: "easeOut" 
            }}
            className="absolute w-32 h-32 border border-slate-400 rounded-full z-10"
          />
        ))}

        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ 
            delay: 0.75,
            duration: 0.6, 
            type: "spring", 
            stiffness: 260, 
            damping: 20 
          }}
          className="flex items-center justify-center relative z-30"
        >
          <img 
            src={logo} 
            alt="DeepNaN Logo" 
            className="h-20 w-auto md:h-35" 
          />
        </motion.div>
      </div>

      {/* Ground Shadow */}
      <motion.div 
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1], opacity: [0, 0.15, 0] }}
        transition={{ duration: 0.9, ease: "linear" }}
        className="absolute w-20 h-4 bg-black rounded-[100%] mt-40 blur-md"
      />

    </div>
  );
};

export default LandingPage;