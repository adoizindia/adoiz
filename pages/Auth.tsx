
import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { MOCK_USER, STATES, CITIES, COUNTRIES } from '../constants';
import { dbService } from '../services/dbService';

interface AuthProps {
  onLogin: (user: User) => void;
  onGoogleLogin: () => void;
  onFacebookLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onGoogleLogin, onFacebookLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [mobile, setMobile] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const filteredStates = STATES.filter(s => s.countryId === selectedCountryId);
  const filteredCities = CITIES.filter(c => c.stateId === selectedStateId);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('submitting');

    try {
      const allUsers = await dbService.getAllUsers();
      if (isLogin) {
        let found = allUsers.find(u => u.email === email);
        if (!found && email === 'user@adoiz.com') found = MOCK_USER;
        if (!found && email === 'admin@adoiz.com') found = allUsers.find(u => u.id === 'admin-master');
        if (!found && email === 'mod@adoiz.com') found = allUsers.find(u => u.id === 'mod-mumbai');

        if (found) {
          if (found.isSuspended) {
            alert("This account has been suspended. Please contact support.");
            setLoading(null);
            return;
          }
          onLogin(found);
        } else {
          alert("Invalid email or password.");
        }
      } else {
        const newUser = await dbService.registerUser({
          email, 
          name, 
          role: UserRole.USER, 
          countryId: selectedCountryId,
          stateId: selectedStateId, 
          cityId: selectedCityId, 
          mobile,
          walletBalance: 0,
          referralCode
        });
        onLogin(newUser);
      }
    } catch (err) {
      alert("An authentication error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleAdminQuickLogin = async () => {
    setLoading('admin');
    const allUsers = await dbService.getAllUsers();
    const admin = allUsers.find(u => u.role === UserRole.ADMIN) || allUsers.find(u => u.id === 'admin-master');
    if (admin) onLogin(admin);
    setLoading(null);
  };

  const handleModeratorQuickLogin = async () => {
    setLoading('mod');
    const allUsers = await dbService.getAllUsers();
    const mod = allUsers.find(u => u.role === UserRole.MODERATOR) || allUsers.find(u => u.id === 'mod-mumbai');
    if (mod) onLogin(mod);
    setLoading(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-50"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-100 rounded-full blur-[100px] opacity-50"></div>

      <div className="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white/50 animate-in fade-in zoom-in-95 duration-500 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl mb-6 shadow-xl shadow-blue-100">
            <h1 className="text-4xl font-black text-white tracking-tighter">A</h1>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Join ADOIZ'}
          </h2>
          <p className="text-gray-400 text-[10px] mt-2 font-black uppercase tracking-[0.3em]">Enterprise Local Marketplace</p>
        </div>

        <div className="space-y-4 pt-4">
          <button onClick={() => alert("Social login is currently disabled in this preview environment.")} disabled={!!loading} className="w-full flex items-center justify-between bg-white border border-gray-100 py-4 px-6 rounded-2xl hover:border-blue-500 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 group opacity-50 cursor-not-allowed">
            <div className="flex items-center space-x-4">
              <i className="fab fa-google text-gray-400"></i>
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Continue with Google (Disabled)</span>
            </div>
            <i className="fas fa-lock text-[10px] text-gray-300"></i>
          </button>
        </div>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-gray-100"></div>
          <span className="flex-shrink mx-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">Or use Email</span>
          <div className="flex-grow border-t border-gray-100"></div>
        </div>

        <form className="space-y-4" onSubmit={handleAuth}>
          <div className="space-y-3">
            {!isLogin && (
              <>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 text-sm font-bold" placeholder="Full Name" />
                
                <div className="grid grid-cols-2 gap-3">
                   <select required value={selectedCountryId} onChange={e => { setSelectedCountryId(e.target.value); setSelectedStateId(''); setSelectedCityId(''); }} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none text-xs font-bold appearance-none">
                      <option value="">Country</option>
                      {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <select required value={selectedStateId} onChange={e => { setSelectedStateId(e.target.value); setSelectedCityId(''); }} disabled={!selectedCountryId} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none text-xs font-bold appearance-none disabled:opacity-50">
                      <option value="">State</option>
                      {filteredStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <select required value={selectedCityId} onChange={e => setSelectedCityId(e.target.value)} disabled={!selectedStateId} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none text-xs font-bold appearance-none disabled:opacity-50">
                      <option value="">City</option>
                      {filteredCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <input type="tel" required value={mobile} onChange={e => setMobile(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 text-xs font-bold" placeholder="Mobile Number" />
                </div>
                <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 text-sm font-bold" placeholder="Referral Code (Optional)" />
              </>
            )}
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 text-sm font-bold" placeholder="Email" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 text-sm font-bold" placeholder="Password" />
          </div>
          
          <button type="submit" disabled={!!loading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] mt-4">
            {loading === 'submitting' ? <i className="fas fa-circle-notch fa-spin"></i> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="text-center pt-6 flex flex-col items-center space-y-4 border-t border-gray-50">
          <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
            {isLogin ? "New user? Register" : "Have an account? Login"}
          </button>
          
          <div className="flex gap-2 w-full pt-2">
            <button onClick={handleAdminQuickLogin} disabled={!!loading} className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">
              {loading === 'admin' ? <i className="fas fa-spinner fa-spin"></i> : 'Quick Admin'}
            </button>
            <button onClick={handleModeratorQuickLogin} disabled={!!loading} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
              {loading === 'mod' ? <i className="fas fa-spinner fa-spin"></i> : 'Quick Mod'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
