import React, { useState, useRef } from 'react';
import logo from '../assets/LogoS.svg';
import { supabase } from '../lib/supabaseClient';

interface AuthPageProps {
  onLoginSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, phone: numericValue });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    window.scrollTo({ top: 0, left: 0 });
    // Triggers the native tooltip instantly if the user clicks away and the field is invalid
    if (e.target.value !== "" && !e.target.validity.valid) {
      e.target.reportValidity();
    }
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
      const fullPhoneNumber = `+60${formData.phone}`;

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            phone: fullPhoneNumber,
          }
        }
      });

      if (error) {
        alert("Sign up failed: " + error.message);
      } else {
        alert("Sign up successful! You can now log in.");
        setIsLogin(true);
        setFormData({ name: '', phone: '', email: '', password: '' });
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex h-full w-full bg-[#F0F4F8] items-center justify-center px-6 overflow-hidden">
      <div className="w-full max-w-md flex flex-col items-center">

        {/* Logo */}
        <div className="mb-12">
          <img src={logo} alt="DeepNaN Logo" className="h-10 md:h-12 w-auto" />
        </div>

        {/* Auth Form */}
        <form ref={formRef} className="w-full space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <input
                type="text"
                name="name"
                value={formData.name}
                placeholder="Full Name"
                required
                className="w-full bg-white rounded-full px-6 py-4 border border-white focus:border-slate-200 outline-none shadow-xs text-slate-700 text-[16px]"
                onChange={handleInputChange}
                onBlur={handleBlur}
              />
              {/* Custom Fixed Prefix Phone Input */}
              <div className="w-full bg-white rounded-full px-6 py-4 border border-white focus-within:border-slate-200 shadow-xs flex items-center gap-3 transition-colors">
                <div className="flex items-center gap-2 pr-3 border-r border-slate-200 shrink-0 select-none">
                  <span className="text-lg leading-none">🇲🇾</span>
                  <span className="text-slate-500 font-medium">+60</span>
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  placeholder="Phone Number"
                  required
                  minLength={9}
                  maxLength={10}
                  pattern="[0-9]{9,10}"
                  title="Please enter exactly 9 or 10 digits."
                  className="w-full bg-transparent border-none outline-none text-slate-700 text-[16px] p-0 placeholder-slate-300"
                  onChange={handlePhoneChange}
                  onBlur={handleBlur}
                />
              </div>
            </div>
          )}

          {/* Email with strict Domain Pattern Validation */}
          <input
            type="email"
            name="email"
            value={formData.email}
            placeholder="Email Address"
            required
            pattern="[a-zA-Z0-9._%+\-]+@(gmail\.com|yahoo\.com|hotmail\.com|outlook\.com|icloud.com|aol.com|protonmail\.com|proton\.me)$"
            title="Please use a valid provider (@gmail.com, @yahoo.com, @outlook.com, @icloud.com, @aol.com, @protonmail.com, or @proton.me)."
            className="w-full bg-white rounded-full px-6 py-4 border border-white focus:border-slate-200 outline-none shadow-xs text-slate-700 text-[16px]"
            onChange={handleInputChange}
            onBlur={handleBlur}
          />

          {/* Password with strict Regex Pattern and minLength for Sign Up */}
          <input
            type="password"
            name="password"
            value={formData.password}
            placeholder="Password"
            required
            minLength={isLogin ? undefined : 8}
            pattern={isLogin ? undefined : "(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}"}
            title={isLogin ? "Please enter your password." : "Password must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 number, and 1 symbol."}
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
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ name: '', phone: '', email: '', password: '' });
              }}
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