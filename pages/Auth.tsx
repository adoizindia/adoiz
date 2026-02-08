import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { MOCK_USER, STATES, CITIES } from '../constants';
import { dbService } from '../services/dbService';

interface AuthProps {
  onLogin: (user: User) => void;
  onGoogleLogin: () => void;
  onFacebookLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onGoogleLogin, onFacebookLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');

  const filteredCities = CITIES.filter(c => c.stateId === selectedStateId);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('submitting');

    try {
      const allUsers = await dbService.getAllUsers();
      if (isLogin) {
        let found = allUsers.find(u => u.email === email);
        
        // Basic fallback for mock users
        if (!found && email === 'user@adoiz.com') found = MOCK_USER;
        if (!found && email === 'admin@adoiz.com') found = allUsers.find(u => u.id === 'admin-master');
        if (!found && email === 'mod@adoiz.com') found = allUsers.find(u => u.id === 'mod-mumbai');

        if (found) {
          if (found.isSuspended) {
            alert("This account has been suspended by the administrator.");
            setLoading(null);
            return;
          }
          onLogin(found);
        } else {
          alert("Account not found. Use admin@adoiz.com or mod@adoiz.com for testing.");
        }
      } else {
        const newUser = await dbService.registerUser({
          email,
          name,
          role: UserRole.USER,
          cityId: selectedCityId,
          stateId: selectedStateId,
          mobile: '+91 00000 00000',
          whatsapp: '+91 00000 00000',
          socialProvider: 'email'
        });
        onLogin(newUser);
      }
    } catch (err) {
      alert("Auth Error. Try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleAdminQuickLogin = () => {
    setEmail('admin@adoiz.com');
    setPassword('password123');
    setIsLogin(true);
    triggerButtonEffect('auth-submit-btn');
  };

  const handleModeratorQuickLogin = () => {
    setEmail('mod@adoiz.com');
    setPassword('password123');
    setIsLogin(true);
    triggerButtonEffect('auth-submit-btn');
  };

  const triggerButtonEffect = (id: string) => {
    const btn = document.getElementById(id);
    btn?.classList.add('scale-105', 'ring-4', 'ring-blue-200');
    setTimeout(() => btn?.classList.remove('scale-105', 'ring-4', 'ring-blue-200'), 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-50"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-100 rounded-full blur-[100px] opacity-50"></div>

      <div className="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white/50 animate-in fade-in zoom-in-95 duration-500 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl mb-6 shadow-xl shadow-blue-100">
            <h1 className="text-4xl font-black text-white tracking-tighter">A</h1>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Join adoiz'}
          </h2>
          <p className="text-gray-400 text-[10px] mt-2 font-black uppercase tracking-[0.3em]">Enterprise Local Marketplace</p>
        </div>

        <div className="space-y-4 pt-4">
          <button 
            type="button"
            onClick={onGoogleLogin}
            disabled={!!loading}
            className="w-full flex items-center justify-between bg-white border border-gray-100 py-4 px-6 rounded-2xl hover:border-blue-500 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 group"
          >
            <div className="flex items-center space-x-4">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-5 h-5" alt="Google" />
              <span className="text-xs font-black text-gray-700 uppercase tracking-widest">
                Continue with Google
              </span>
            </div>
            <i className="fas fa-chevron-right text-[10px] text-gray-300 group-hover:text-blue-500 transition-colors"></i>
          </button>

          <button 
            type="button"
            onClick={onFacebookLogin}
            disabled={!!loading}
            className="w-full flex items-center justify-between bg-white border border-gray-100 py-4 px-6 rounded-2xl hover:border-[#1877F2] transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 group"
          >
            <div className="flex items-center space-x-4">
              <img src="https://upload.wikimedia.org/wikipedia/en/0/04/Facebook_f_logo_%282021%29.svg" className="w-5 h-5" alt="Facebook" />
              <span className="text-xs font-black text-gray-700 uppercase tracking-widest">
                Continue with Facebook
              </span>
            </div>
            <i className="fas fa-chevron-right text-[10px] text-gray-300 group-hover:text-[#1877F2] transition-colors"></i>
          </button>
        </div>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-gray-100"></div>
          <span className="flex-shrink mx-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">Secured Email Access</span>
          <div className="flex-grow border-t border-gray-100"></div>
        </div>

        <form className="space-y-4" onSubmit={handleAuth}>
          <div className="space-y-3">
            {!isLogin && (
              <>
                <div className="relative group">
                   <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors"></i>
                   <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold" placeholder="Full Legal Name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <select required value={selectedStateId} onChange={e => setSelectedStateId(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-xs font-bold appearance-none">
                      <option value="">Select State</option>
                      {STATES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                   <select required value={selectedCityId} onChange={e => setSelectedCityId(e.target.value)} disabled={!selectedStateId} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-xs font-bold appearance-none disabled:opacity-50">
                      <option value="">Select City</option>
                      {filteredCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
              </>
            )}
            <div className="relative group">
               <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors"></i>
               <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold" placeholder="Email Address" />
            </div>
            <div className="relative group">
               <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors"></i>
               <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold" placeholder="Secure Password" />
            </div>
          </div>
          
          <button 
            id="auth-submit-btn"
            type="submit" 
            disabled={!!loading} 
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] mt-4"
          >
            {loading === 'submitting' ? <i className="fas fa-circle-notch fa-spin"></i> : (isLogin ? 'Sign In Now' : 'Initialize Account')}
          </button>
        </form>

        <div className="text-center pt-6 flex flex-col items-center space-y-4 border-t border-gray-50">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already a member? Sign In"}
          </button>

          <div className="flex flex-col space-y-2 w-full pt-4">
             <button 
              onClick={handleAdminQuickLogin}
              className="w-full py-3 bg-slate-900 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center"
            >
              <i className="fas fa-shield-halved mr-2"></i> Admin Login
            </button>
            <button 
              onClick={handleModeratorQuickLogin}
              className="w-full py-3 bg-emerald-600 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center"
            >
              <i className="fas fa-gavel mr-2"></i> Moderator Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
