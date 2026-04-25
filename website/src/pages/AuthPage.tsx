import React, { useState } from 'react';
import logo from '../assets/LogoS.svg';
import { supabase } from '../lib/supabaseClient';

interface AuthPageProps {
  onLoginSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    staffId: '',
    phone: '',
    email: '',
    password: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        alert("Login failed: " + error.message);
      } else {
        onLoginSuccess();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            staff_id: formData.staffId,
            phone: formData.phone,
          }
        }
      });

      if (error) {
        alert("Sign up failed: " + error.message);
      } else {
        alert("Sign up successful! You can now log in.");
        setIsLogin(true);
      }
    }
    
    setLoading(false);
  };

  const handleBlur = () => {
    window.scrollTo({ top: 0, left: 0 });
  };

  return (
    <div className="flex h-full w-full bg-[#F0F4F8] items-center justify-center px-6 overflow-hidden">
      <div className="w-full max-w-md flex flex-col items-center">
        
        {/* Logo */}
        <div className="mb-12">
          <img src={logo} alt="DeepNaN Logo" className="h-10 md:h-12 w-auto" />
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {!isLogin && (
            <div className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                required
                className="w-full bg-white rounded-full px-6 py-4 border border-white focus:border-slate-200 outline-none shadow-xs text-slate-700 text-[16px]"
                onChange={handleInputChange}
                onBlur={handleBlur}
              />
              <input
                type="text"
                name="staffId"
                placeholder="Staff ID"
                required
                className="w-full bg-white rounded-full px-6 py-4 border border-white focus:border-slate-200 outline-none shadow-xs text-slate-700 text-[16px]"
                onChange={handleInputChange}
                onBlur={handleBlur}
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                required
                className="w-full bg-white rounded-full px-6 py-4 border border-white focus:border-slate-200 outline-none shadow-xs text-slate-700 text-[16px]"
                onChange={handleInputChange}
                onBlur={handleBlur}
              />
            </div>
          )}

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            required
            className="w-full bg-white rounded-full px-6 py-4 border border-white focus:border-slate-200 outline-none shadow-xs text-slate-700 text-[16px]"
            onChange={handleInputChange}
            onBlur={handleBlur}
          />
          
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className="w-full bg-white rounded-full px-6 py-4 border border-white focus:border-slate-200 outline-none shadow-xs text-slate-700 text-[16px]"
            onChange={handleInputChange}
            onBlur={handleBlur}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white py-4 rounded-full shadow-md font-bold uppercase tracking-widest text-[13px] active:scale-95 transition-all mt-4 border border-slate-50 flex items-center justify-center disabled:opacity-50"
          >
            <span className="text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-cyan-400">
              {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
            </span>
          </button>
        </form>

        {/* Toggle Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 font-medium">
            {isLogin ? "No account yet?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 font-bold text-cyan-500 hover:text-pink-500 transition-colors underline decoration-dotted underline-offset-4"
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;