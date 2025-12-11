import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { getStoredUsers, saveUser } from '../services/storage';
import { Library, UserPlus, LogIn, Mail, Lock, User as UserIcon, Hash, Phone, Briefcase, ArrowRight } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    department: '',
    yearSection: '',
    mobile: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return "Please enter a valid email address.";
    
    if (formData.password.length < 4) return "Password must be at least 4 characters long.";

    if (!isLogin) {
      if (!formData.name.trim()) return "Full Name is required.";
      if (!formData.studentId.trim()) return "Student ID is required.";
      if (!formData.department) return "Please select a department.";
      
      const mobileRegex = /^\d{10}$/;
      if (!mobileRegex.test(formData.mobile)) return "Mobile number must be exactly 10 digits.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // Async DB call
      const users = await getStoredUsers();

      if (isLogin) {
        const user = users.find(u => u.email === formData.email && u.password === formData.password);
        if (user) {
          if (user.isBlocked) {
            setError('Your account has been blocked by the administrator.');
            setIsLoading(false);
            return;
          }
          onLogin(user);
        } else {
          setError('Invalid credentials. Please try again.');
          setIsLoading(false);
        }
      } else {
        if (users.find(u => u.email === formData.email)) {
          setError('An account with this email already exists.');
          setIsLoading(false);
          return;
        }
        
        const newUser: User = {
          id: `user-${Date.now()}`,
          role: UserRole.STUDENT,
          isBlocked: false,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          studentId: formData.studentId,
          department: formData.department,
          yearSection: formData.yearSection,
          mobile: formData.mobile
        };
        
        await saveUser(newUser);
        onLogin(newUser);
      }
    } catch (err) {
      setError("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 p-4 font-sans">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto md:min-h-[600px] animate-in fade-in zoom-in-95 duration-500">
        
        {/* Left Side */}
        <div className="md:w-5/12 bg-primary p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
           <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-900 opacity-20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
           
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                 <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md shadow-inner border border-white/10">
                    <Library className="w-6 h-6" />
                 </div>
                 <span className="text-2xl font-bold tracking-tight">LibBook</span>
              </div>
              
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                  {isLogin ? "Welcome back, Scholar!" : "Join the Library Community"}
                </h2>
                <p className="text-blue-100 text-base leading-relaxed">
                  {isLogin 
                    ? "Access your dashboard to manage seat reservations, view history, and find the perfect spot for your study session."
                    : "Create an account to start booking seats, PC stations, and quiet zones instantly. It takes less than a minute."}
                </p>
              </div>
           </div>
           
           <div className="relative z-10 mt-12 pt-8 border-t border-white/20">
              <div className="flex gap-6 text-xs font-medium text-blue-200">
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div> 
                   System Online
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> 
                   MongoDB Ready
                 </div>
              </div>
           </div>
        </div>

        {/* Right Side */}
        <div className="md:w-7/12 p-8 md:p-12 bg-white flex flex-col justify-center relative">
          
          <div className="max-w-md mx-auto w-full">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{isLogin ? 'Sign In' : 'Create Account'}</h3>
                <p className="text-slate-500 text-sm mt-1">
                  {isLogin ? "Please enter your details." : "Fill in the information below."}
                </p>
              </div>
              
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); setFormData({...formData, email: '', password: ''}); }}
                className="text-sm font-semibold text-primary hover:text-blue-700 transition-colors flex items-center group"
              >
                {isLogin ? 'Register instead' : 'Login instead'}
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="bg-red-100 p-1 rounded-full flex-shrink-0"><span className="block w-2 h-2 bg-red-500 rounded-full"></span></div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <UserIcon className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                      <input required name="name" type="text" placeholder="Full Name" onChange={handleChange} 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm" />
                    </div>
                    <div className="relative group">
                      <Hash className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                      <input required name="studentId" type="text" placeholder="Student ID" onChange={handleChange} 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                       <Briefcase className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                       <select required name="department" onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-600 text-sm appearance-none cursor-pointer">
                        <option value="">Select Dept...</option>
                        <option value="CS">Comp. Sci</option>
                        <option value="EE">Electrical</option>
                        <option value="ME">Mechanical</option>
                        <option value="BA">Business</option>
                      </select>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary font-bold text-xs pt-0.5">YR</div>
                      <input required name="yearSection" type="text" placeholder="Year/Sec (e.g. 3-A)" onChange={handleChange} 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm" />
                    </div>
                  </div>

                  <div className="relative group">
                    <Phone className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                    <input required name="mobile" type="tel" placeholder="Mobile Number (10 digits)" onChange={handleChange} 
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm" />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                  <input required name="email" type="email" placeholder="Email Address" onChange={handleChange} 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm" />
                </div>
                
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                  <input required name="password" type="password" placeholder="Password (min 4 chars)" onChange={handleChange} 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-sm" />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-3 bg-primary hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                     isLogin ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Create Account</>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-slate-400 bg-slate-50 py-2 px-4 rounded-full inline-block border border-slate-100">
                <span className="font-semibold text-slate-500">Admin Demo:</span> admin@library.edu / admin
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
