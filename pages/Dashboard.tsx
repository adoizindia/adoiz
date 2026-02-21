
import React, { useState, useEffect, useRef } from 'react';
import { User, Listing, ListingStatus, UserRole, WalletTransaction, SubscriptionPlan, BannerAd, City, State } from '../types';
import { dbService } from '../services/dbService';
import { CITIES, STATES } from '../constants';

interface DashboardProps {
  user: User;
  listings: Listing[];
  onEdit: (listing: Listing) => void;
  onDelete: (id: string) => Promise<void>;
  onBoost: (id: string) => Promise<void>;
  onPostNew: () => void;
  onAddFunds: (amount: number) => void;
  onUpdateUser?: (user: User) => void;
  onAdminPanel?: () => void;
  onLogout: () => void;
}

const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  window.dispatchEvent(new CustomEvent('adoiz-notify', { detail: { message, type } }));
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, listings, onEdit, onDelete, onBoost, onPostNew, onAddFunds, onUpdateUser, onAdminPanel, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'ADS' | 'BANNERS' | 'SUBSCRIPTION' | 'TRANSACTIONS' | 'PROFILE'>('ADS');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [userBanners, setUserBanners] = useState<BannerAd[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  
  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
    mobile: user.mobile || '',
    whatsapp: user.whatsapp || '',
    address: user.address || '',
    photo: user.photo || '',
    cityId: user.cityId || '',
    stateId: user.stateId || '',
    countryId: user.countryId || 'ctr1'
  });

  // Banner Form State
  const [bannerForm, setBannerForm] = useState({
    title: '',
    cityId: user.cityId || CITIES[0].id,
    imageUrl: '',
    linkUrl: '',
    budget: ''
  });

  const config = dbService.getSystemConfig();

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    const [tx, bn] = await Promise.all([
      dbService.getTransactionsByUserId(user.id),
      dbService.getUserBanners(user.id)
    ]);
    setTransactions(tx.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setUserBanners(bn);
  };

  const handleSubscribe = async (planId: string) => {
    setIsProcessing(planId);
    try {
      const updatedUser = await dbService.subscribeUser(user.id, planId);
      if (updatedUser && onUpdateUser) onUpdateUser(updatedUser);
      notify("Plan activated successfully!", "success");
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        notify("Image size should be less than 2MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing('profile');
    try {
      const updatedUser = await dbService.updateUserProfile(user.id, profileForm);
      if (updatedUser && onUpdateUser) onUpdateUser(updatedUser);
      notify("Profile updated successfully!", "success");
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePostBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.imageUrl) {
      notify("Please upload a banner image", "error");
      return;
    }
    setIsProcessing('banner');
    try {
      await dbService.createBannerAd({
        ...bannerForm,
        budget: Number(bannerForm.budget),
        userId: user.id
      });
      const updatedUser = await dbService.getUserById(user.id);
      if (updatedUser && onUpdateUser) onUpdateUser(updatedUser);
      notify("Banner ad submitted for review!", "success");
      setShowBannerModal(false);
      setBannerForm({ title: '', cityId: user.cityId || CITIES[0].id, imageUrl: '', linkUrl: '', budget: '' });
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(null);
    }
  };

  const isSubscribed = user.subscription && user.subscription.status === 'ACTIVE' && new Date(user.subscription.expiresAt) > new Date();

  // Banner Pricing Calculation
  const selectedCityTier = config.cityTierMapping[bannerForm.cityId] || 'T2';
  const cpmRate = config.bannerAdTierPrices[selectedCityTier];
  const estimatedImpressions = bannerForm.budget ? Math.floor((Number(bannerForm.budget) / cpmRate) * 1000) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-32">
      {/* Header Profile Section */}
      <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-sm border border-gray-100 mb-10 flex flex-col md:flex-row items-center gap-10">
        <div className="relative group cursor-pointer" onClick={() => setActiveTab('PROFILE')}>
          <img src={user.photo} className="w-40 h-40 rounded-[2.5rem] object-cover border-4 border-white shadow-2xl transition-transform group-hover:scale-105" alt="" />
          <div className="absolute inset-0 bg-black/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <i className="fas fa-camera text-white text-2xl"></i>
          </div>
          {user.isVerified && <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg"><i className="fas fa-check"></i></div>}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">{user.name}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
             <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border border-blue-100"><i className="fas fa-wallet mr-1.5"></i> Wallet: ₹{user.walletBalance.toLocaleString()}</span>
             {isSubscribed && <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border border-emerald-100"><i className="fas fa-crown mr-1.5"></i> {user.subscription?.planName}</span>}
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
             <button onClick={() => setShowRechargeModal(true)} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Add Funds</button>
             {user.role === UserRole.ADMIN && <button onClick={onAdminPanel} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Go to Admin</button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 mb-10 bg-white p-1.5 rounded-[2.5rem] border border-gray-100 shadow-sm w-fit overflow-x-auto hide-scrollbar">
        {[
          {id: 'ADS', label: 'My Ads'},
          {id: 'BANNERS', label: 'Banner Ads'},
          {id: 'PROFILE', label: 'Profile Settings'},
          {id: 'SUBSCRIPTION', label: 'Membership'},
          {id: 'TRANSACTIONS', label: 'Payments'}
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-8 md:px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-gray-400 hover:bg-gray-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'ADS' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Active Advertisements</h2>
              <button onClick={onPostNew} className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-200">+ New Ad</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {listings.map(l => (
                <div key={l.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 flex gap-8 hover:shadow-2xl transition-all group">
                  <div className="w-40 h-40 rounded-3xl overflow-hidden flex-shrink-0">
                    <img src={l.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-2">
                    <div>
                      <h4 className="font-black text-gray-900 text-xl truncate mb-1">{l.title}</h4>
                      <p className="text-blue-600 font-black text-2xl">₹{l.price.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => onEdit(l)} className="p-3.5 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl transition-all border border-gray-100" title="Edit"><i className="fas fa-pen"></i></button>
                      <button onClick={() => onDelete(l.id)} className="p-3.5 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all border border-gray-100" title="Delete"><i className="fas fa-trash-alt"></i></button>
                      {l.isPremium ? (
                        <div className="flex-1 bg-amber-50 text-amber-700 rounded-xl text-[9px] font-black uppercase flex items-center justify-center border border-amber-100">Premium Active</div>
                      ) : (
                        <button onClick={() => onBoost(l.id)} className="flex-1 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">Promote Ad</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {listings.length === 0 && <div className="col-span-2 text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 text-gray-400 font-black uppercase text-xs">You haven't posted any ads yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'BANNERS' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Your Banner Campaigns</h2>
              <button onClick={() => setShowBannerModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-200">+ Post Banner</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {userBanners.map(b => (
                <div key={b.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 space-y-6 hover:shadow-2xl transition-all group">
                  <div className="aspect-[4/1] rounded-2xl overflow-hidden bg-gray-100 border border-gray-50">
                    <img src={b.imageUrl} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-gray-900 text-xl truncate mb-1">{b.title}</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target City: {CITIES.find(c => c.id === b.cityId)?.name}</p>
                      {b.status === 'LIVE' && (
                         <div className="mt-4 flex gap-6">
                            <div><p className="text-2xl font-black text-blue-600">{b.views}</p><p className="text-[8px] font-bold text-gray-400 uppercase">Impressions</p></div>
                            <div><p className="text-2xl font-black text-emerald-600">{b.clicks}</p><p className="text-[8px] font-bold text-gray-400 uppercase">Clicks</p></div>
                            <div><p className="text-2xl font-black text-gray-900">{Math.round((b.views / (b.targetImpressions || 1)) * 100)}%</p><p className="text-[8px] font-bold text-gray-400 uppercase">Completed</p></div>
                         </div>
                      )}
                      {b.status === 'PENDING' && <p className="mt-2 text-xs font-bold text-amber-600">Waiting for approval...</p>}
                    </div>
                    <div className="text-right">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                         b.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600' : 
                         b.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                       }`}>
                         {b.status}
                       </span>
                       <p className="mt-2 text-[9px] font-black text-gray-400 uppercase">Budget: ₹{b.budget}</p>
                    </div>
                  </div>
                </div>
              ))}
              {userBanners.length === 0 && <div className="col-span-2 text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 text-gray-400 font-black uppercase text-xs">No active banner ads. Start advertising now!</div>}
            </div>
          </div>
        )}

        {activeTab === 'PROFILE' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Update My Profile</h2>
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
               <form onSubmit={handleUpdateProfile} className="space-y-8">
                  {/* Photo Section */}
                  <div className="flex flex-col items-center gap-4 border-b border-gray-50 pb-8">
                     <div className="relative group w-32 h-32">
                        <img src={profileForm.photo} className="w-full h-full rounded-[2rem] object-cover border-4 border-gray-50 shadow-lg" alt="" />
                        <button 
                          type="button" 
                          onClick={() => profilePhotoInputRef.current?.click()}
                          className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                     </div>
                     <input type="file" ref={profilePhotoInputRef} className="hidden" accept="image/*" onChange={handleProfilePhotoUpload} />
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Profile Picture</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Identity Name</label>
                       <input type="text" required className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Verified Email (Readonly)</label>
                       <input type="email" readOnly className="w-full bg-gray-100 border border-gray-100 p-4 rounded-2xl font-bold text-gray-400 outline-none" value={profileForm.email} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Contact</label>
                       <input type="tel" required className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" value={profileForm.mobile} onChange={e => setProfileForm({...profileForm, mobile: e.target.value})} placeholder="+91 00000 00000" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
                       <input type="tel" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" value={profileForm.whatsapp} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} placeholder="+91 00000 00000" />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">State</label>
                       <select className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none appearance-none" value={profileForm.stateId} onChange={e => setProfileForm({...profileForm, stateId: e.target.value, cityId: ''})}>
                          <option value="">Select State</option>
                          {STATES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Default City</label>
                       <select className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none appearance-none" value={profileForm.cityId} onChange={e => setProfileForm({...profileForm, cityId: e.target.value})}>
                          <option value="">Select City</option>
                          {CITIES.filter(c => !profileForm.stateId || c.stateId === profileForm.stateId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                    
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Physical Address / Shipping Info</label>
                       <textarea className="w-full bg-gray-50 border border-gray-100 p-5 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all h-24" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} placeholder="House No, Building, Area, PIN Code..." />
                    </div>
                  </div>

                  <div className="pt-4">
                     <button type="submit" disabled={isProcessing === 'profile'} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3">
                        {isProcessing === 'profile' ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Save Profile Changes
                     </button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {activeTab === 'SUBSCRIPTION' && (
          <div className="space-y-12">
            {isSubscribed ? (
               <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                  <div className="relative z-10">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">My Active Plan</h3>
                     <h2 className="text-4xl font-black uppercase mb-8">{user.subscription?.planName}</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="bg-white/10 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                           <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Started On</p>
                           <p className="text-xl font-black">{new Date(user.subscription!.activatedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="bg-white/10 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                           <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Expires On</p>
                           <p className="text-xl font-black">{new Date(user.subscription!.expiresAt).toLocaleDateString()}</p>
                        </div>
                     </div>
                  </div>
               </div>
            ) : (
               <div className="bg-rose-50 border border-rose-100 p-10 rounded-[3rem] flex items-center gap-8 mb-12">
                  <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center text-2xl"><i className="fas fa-exclamation-triangle"></i></div>
                  <div>
                     <h3 className="text-xl font-black text-rose-900 uppercase tracking-tight">No Membership Plan</h3>
                     <p className="text-sm text-rose-700 font-medium">Standard ads are limited. Subscribe to a plan to post unlimited ads.</p>
                  </div>
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {config.subscriptionPlans.map(plan => (
                  <div key={plan.id} className={`bg-white p-10 rounded-[3.5rem] border shadow-sm flex flex-col transition-all hover:shadow-2xl hover:-translate-y-2 ${plan.isPopular ? 'border-blue-400 ring-2 ring-blue-50' : 'border-gray-100'}`}>
                     {plan.isPopular && <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest self-start mb-6">Best Value</span>}
                     <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">{plan.name}</h4>
                     <p className="text-4xl font-black text-gray-900 mb-6">₹{plan.price}<span className="text-sm font-bold text-gray-400"> / {plan.durationDays}d</span></p>
                     <ul className="space-y-4 mb-10 flex-1">
                        {plan.features.map((f, i) => (
                           <li key={i} className="text-xs font-bold text-gray-600 flex items-center gap-3"><i className="fas fa-check-circle text-emerald-500"></i> {f}</li>
                        ))}
                     </ul>
                     <button 
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={isProcessing === plan.id || user.subscription?.planId === plan.id}
                        className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all ${user.subscription?.planId === plan.id ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                     >
                        {isProcessing === plan.id ? <i className="fas fa-circle-notch fa-spin"></i> : (user.subscription?.planId === plan.id ? 'Current Plan' : 'Choose Plan')}
                     </button>
                  </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'TRANSACTIONS' && (
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
             <table className="w-full text-left">
                <thead>
                   <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50"><th className="px-10 py-6">Date</th><th className="px-10 py-6">Details</th><th className="px-10 py-6 text-right">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {transactions.map(tx => (
                     <tr key={tx.id} className="text-xs font-bold hover:bg-gray-50 transition-colors">
                        <td className="px-10 py-6 text-gray-400">{new Date(tx.timestamp).toLocaleString()}</td>
                        <td className="px-10 py-6 text-gray-900 uppercase">{tx.description}</td>
                        <td className={`px-10 py-6 text-right font-black ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.type === 'CREDIT' ? '+' : '-'} ₹{tx.amount}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}
      </div>

      {showRechargeModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-blue-600 p-10 text-white text-center">
                 <h3 className="text-3xl font-black uppercase tracking-tight">Add Funds</h3>
                 <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-2">Top up your wallet</p>
              </div>
              <div className="p-12 space-y-8">
                 <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">₹</span>
                    <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 p-6 pl-12 rounded-3xl text-4xl font-black outline-none focus:border-blue-500 transition-all" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} placeholder="0" />
                 </div>
                 <button onClick={() => { onAddFunds(Number(rechargeAmount)); setShowRechargeModal(false); setRechargeAmount(''); }} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">Recharge Now</button>
                 <button onClick={() => setShowRechargeModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">Close</button>
              </div>
           </div>
        </div>
      )}

      {showBannerModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-blue-600 p-8 text-white text-center">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Post Banner Ad</h3>
                 <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mt-1">Boost your visibility locally</p>
              </div>
              <form onSubmit={handlePostBanner} className="p-10 space-y-6">
                 <div className="space-y-4">
                    <div>
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Title</label>
                       <input required type="text" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} placeholder="e.g. 50% Off Sale" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target City (Fixed)</label>
                       <select disabled className="w-full bg-gray-100 border border-gray-200 p-4 rounded-2xl font-bold outline-none appearance-none text-gray-500 cursor-not-allowed" value={bannerForm.cityId} onChange={e => setBannerForm({...bannerForm, cityId: e.target.value})}>
                          {CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Image (Ideal: 1600 x 400 Pixels | 4:1 Ratio)</label>
                       <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all overflow-hidden relative"
                       >
                          {bannerForm.imageUrl ? (
                            <img src={bannerForm.imageUrl} className="w-full h-full object-cover" alt="Banner Preview" />
                          ) : (
                            <>
                              <i className="fas fa-cloud-upload-alt text-2xl text-gray-300 mb-2"></i>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">Click to upload image</p>
                            </>
                          )}
                          <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload}
                            className="hidden" 
                          />
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Link URL</label>
                       <input required type="url" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" value={bannerForm.linkUrl} onChange={e => setBannerForm({...bannerForm, linkUrl: e.target.value})} placeholder="https://your-website.com" />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div>
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Campaign Budget (₹)</label>
                       <input required type="number" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" value={bannerForm.budget} onChange={e => setBannerForm({...bannerForm, budget: e.target.value})} placeholder="Enter amount" />
                    </div>
                    
                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-black text-blue-900 uppercase">Estimated Reach</p>
                          <p className="text-xs text-blue-600 font-bold">CPM Rate: ₹{cpmRate}/1k ({selectedCityTier})</p>
                       </div>
                       <div className="text-right">
                          <p className="text-2xl font-black text-blue-600">~{estimatedImpressions.toLocaleString()}</p>
                          <p className="text-[8px] font-bold text-blue-400 uppercase">Impressions</p>
                       </div>
                    </div>
                 </div>

                 <button disabled={isProcessing === 'banner'} type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                    {isProcessing === 'banner' ? <i className="fas fa-circle-notch fa-spin"></i> : 'Pay & Submit'}
                 </button>
                 <button type="button" onClick={() => setShowBannerModal(false)} className="w-full py-2 text-gray-400 font-black uppercase text-[9px] tracking-widest">Cancel</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
