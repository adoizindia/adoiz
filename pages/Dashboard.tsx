import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Listing, ListingStatus, UserRole, City, State, Country, SupportTicket, WalletTransaction, BannerAd } from '../types';
import { dbService } from '../services/dbService';
import { CITIES } from '../constants';

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
  onModerationPanel?: () => void;
  onLogout: () => void;
}

const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  window.dispatchEvent(new CustomEvent('adoiz-notify', { detail: { message, type } }));
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, listings, onEdit, onDelete, onBoost, onPostNew, onAddFunds, onUpdateUser, onAdminPanel, onModerationPanel, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'ADS' | 'BANNER' | 'SUPPORT' | 'TRANSACTIONS'>('ADS');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [userTransactions, setUserTransactions] = useState<WalletTransaction[]>([]);
  const [userBanners, setUserBanners] = useState<BannerAd[]>([]);

  // Location lists
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
  const [bannerForm, setBannerForm] = useState({ title: '', imageUrl: '', linkUrl: '' });
  const [profileForm, setProfileForm] = useState({ 
    name: user.name, 
    photo: user.photo || '', 
    mobile: user.mobile || '',
    whatsapp: user.whatsapp || '',
    address: user.address || '',
    countryId: '',
    stateId: user.stateId || '',
    cityId: user.cityId || ''
  });

  const config = dbService.getSystemConfig();

  useEffect(() => { loadDashboardData(); }, [user.id]);

  useEffect(() => {
    const initializeLocationData = async () => {
      const listCountries = dbService.getCountries();
      setCountries(listCountries);
      if (user.stateId) {
        const allStates = dbService.getStates();
        const currentState = allStates.find(s => s.id === user.stateId);
        if (currentState) {
          setProfileForm(prev => ({ ...prev, countryId: currentState.countryId }));
          setStates(dbService.getStates(currentState.countryId));
          setCities(dbService.getCities(user.stateId));
        }
      }
    };
    initializeLocationData();
  }, [showProfileModal, user]);

  const loadDashboardData = async () => {
    const [tickets, transactions, banners] = await Promise.all([
      dbService.getUserTickets(user.id),
      dbService.getTransactionsByUserId(user.id),
      dbService.getUserBanners(user.id)
    ]);
    setUserTickets(tickets);
    setUserTransactions(transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setUserBanners(banners);
  };

  const currentBannerPrice = useMemo(() => dbService.getBannerPrice(user.cityId || 'c1'), [user.cityId]);

  const activeBanner = useMemo(() => {
    return userBanners.find(b => b.status === 'LIVE' || b.status === 'PENDING');
  }, [userBanners]);

  const bannerHistory = useMemo(() => {
    return userBanners.filter(b => b.status === 'EXPIRED' || b.status === 'REJECTED').slice(0, 3);
  }, [userBanners]);

  const handleUpgradeToPremium = async (listingId: string) => {
    if (user.walletBalance < config.premiumPrice) { 
      notify(`Insufficient funds. You need ₹${config.premiumPrice}.`, "error"); 
      setShowRechargeModal(true);
      return;
    }
    setIsProcessing(listingId);
    try {
      await onBoost(listingId);
      notify("Ad upgraded to Premium successfully.", "success");
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleActivateBlueTick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Ensure no parent clicks interfere
    
    if (user.walletBalance < config.blueTickPrice) {
      notify(`Insufficient funds for Blue Tick Verification. Price: ₹${config.blueTickPrice}`, "error");
      setShowRechargeModal(true);
      return;
    }

    if (window.confirm(`Activate Blue Tick Verification for ₹${config.blueTickPrice}? The amount will be deducted from your wallet.`)) {
      setIsProcessing('bluetick');
      try {
        const updated = await dbService.activateBlueTick(user.id);
        if (updated && onUpdateUser) onUpdateUser(updated);
        notify("Blue Tick activated! Profile badge updated.", "success");
        loadDashboardData();
      } catch (err: any) {
        notify(err.message, "error");
      } finally {
        setIsProcessing(null);
      }
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message) return;
    setIsProcessing('ticket');
    await dbService.createTicket(user.id, user.name, ticketForm.subject, ticketForm.message);
    setTicketForm({ subject: '', message: '' });
    loadDashboardData();
    setIsProcessing(null);
    notify("Support ticket submitted.", "success");
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing('profile');
    const updated = await dbService.updateUser(user.id, profileForm);
    if (updated && onUpdateUser) onUpdateUser(updated);
    setShowProfileModal(false);
    setIsProcessing(null);
    notify("Profile configuration updated.", "success");
  };

  const handleCountryChange = (id: string) => {
    setProfileForm({ ...profileForm, countryId: id, stateId: '', cityId: '' });
    setStates(dbService.getStates(id));
    setCities([]);
  };

  const handleStateChange = (id: string) => {
    setProfileForm({ ...profileForm, stateId: id, cityId: '' });
    setCities(dbService.getCities(id));
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>, editingId: string | null = null) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      if (editingId) {
        setIsProcessing('updating-banner');
        try {
          await dbService.updateBanner(editingId, { imageUrl: dataUrl });
          loadDashboardData();
          notify("Banner creative updated.", "success");
        } catch (err: any) {
          notify(err.message, "error");
        } finally {
          setIsProcessing(null);
        }
      } else {
        setBannerForm(prev => ({ ...prev, imageUrl: dataUrl }));
        notify("Creative uploaded successfully.", "info");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBuyBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.imageUrl) return;
    
    if (user.walletBalance < currentBannerPrice) {
      notify(`Insufficient funds for sponsorship. You need ₹${currentBannerPrice.toLocaleString()}.`, "error");
      setShowRechargeModal(true);
      return;
    }

    setIsProcessing('banner');
    try {
      await dbService.processBannerSponsorship(user.id, user.cityId || 'c1', bannerForm.imageUrl, bannerForm.linkUrl, bannerForm.title);
      const u = await dbService.getUserById(user.id);
      if (u && onUpdateUser) onUpdateUser(u);
      setBannerForm({ title: '', imageUrl: '', linkUrl: '' });
      notify("City sponsorship purchased and pending review.", "success");
      loadDashboardData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(null);
    }
  };

  const updateActiveBannerUrl = async (id: string, url: string) => {
    setIsProcessing('updating-url');
    try {
      await dbService.updateBanner(id, { linkUrl: url });
      loadDashboardData();
      notify("Target URL updated.", "success");
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(null);
    }
  };

  const getFormattedCity = (cityId?: string) => {
    if (!cityId) return 'N/A';
    const city = CITIES.find(c => c.id === cityId);
    return city ? `${city.name} - ${cityId}` : cityId;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 pb-32">
      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-gray-100 mb-10">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <img src={user.photo} className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] object-cover border-4 border-white shadow-2xl" alt="" />
            <button onClick={() => setShowProfileModal(true)} className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white cursor-pointer active:scale-95 transition-transform"><i className="fas fa-pen text-xs"></i></button>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.name}</h1>
              {user.isVerified && <span className="bg-blue-50 text-blue-600 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-blue-100"><i className="fas fa-check-circle mr-1.5"></i> Verified</span>}
            </div>
            <p className="text-gray-500 font-medium mb-6">Location: <b>{getFormattedCity(user.cityId)}</b></p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <button onClick={() => setShowRechargeModal(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3 cursor-pointer hover:bg-blue-700 active:scale-95 transition-all">
                <i className="fas fa-wallet"></i> Wallet: ₹{user.walletBalance.toLocaleString()}
              </button>
              
              {user.role === UserRole.ADMIN && <button onClick={onAdminPanel} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl cursor-pointer hover:bg-black active:scale-95 transition-all">Admin Panel</button>}
              
              {user.role === UserRole.MODERATOR && (
                <button 
                  onClick={onModerationPanel} 
                  className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl cursor-pointer hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  Moderation Panel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-8 bg-white p-1.5 rounded-[2rem] border border-gray-100 shadow-sm w-full lg:w-fit overflow-x-auto">
        {['ADS', 'BANNER', 'SUPPORT', 'TRANSACTIONS'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4">
        {activeTab === 'ADS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 uppercase">Your Active Ads</h2>
              <button onClick={onPostNew} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg cursor-pointer hover:bg-blue-700 active:scale-95 transition-all">+ Post New Ad</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {listings.map(l => (
                <div key={l.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex gap-6 hover:shadow-xl transition-all">
                  <img src={l.images[0]} className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-2xl" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-gray-900 text-lg truncate">{l.title}</h4>
                      <p className="text-blue-600 font-black text-lg">₹{l.price.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <button onClick={() => onEdit(l)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl transition-all cursor-pointer"><i className="fas fa-pen"></i></button>
                      <button onClick={() => onDelete(l.id)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer"><i className="fas fa-trash-alt"></i></button>
                      {l.isPremium ? (
                        <div className="flex-1 bg-amber-50 text-amber-700 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 border border-amber-100">
                          <i className="fas fa-crown text-amber-500"></i> Premium Ad
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleUpgradeToPremium(l.id)} 
                          disabled={isProcessing === l.id} 
                          className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          {isProcessing === l.id ? (
                            <i className="fas fa-circle-notch fa-spin"></i>
                          ) : (
                            <><i className="fas fa-bolt text-blue-400"></i> Boost (₹{config.premiumPrice})</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'BANNER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
             {/* Left Column: Form or Active Details */}
             <div className="lg:col-span-8 space-y-8">
                {activeBanner ? (
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="flex justify-between items-start">
                       <div>
                          <h3 className="text-2xl font-black text-gray-900 uppercase">Your Active Sponsorship</h3>
                          <p className="text-sm font-medium text-gray-500 mt-1">Status: 
                            <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-black uppercase ${activeBanner.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                               {activeBanner.status}
                            </span>
                          </p>
                       </div>
                       <div className="flex gap-4">
                          <div className="text-center">
                             <p className="text-[10px] font-black uppercase text-gray-400">Views</p>
                             <p className="text-xl font-black text-blue-600">{activeBanner.views || 0}</p>
                          </div>
                          <div className="text-center">
                             <p className="text-[10px] font-black uppercase text-gray-400">Clicks</p>
                             <p className="text-xl font-black text-emerald-600">{activeBanner.clicks || 0}</p>
                          </div>
                       </div>
                    </div>

                    <div 
                      className="relative rounded-[2rem] overflow-hidden group shadow-lg border border-gray-100 w-full"
                      style={{ aspectRatio: '4 / 1' }}
                    >
                       <img src={activeBanner.imageUrl} className="w-full h-full object-cover" />
                       {activeBanner.status === 'PENDING' && (
                         <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBannerFileSelect(e, activeBanner.id)} />
                            <div className="bg-white text-gray-900 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                               <i className="fas fa-upload"></i> Change Creative
                            </div>
                         </label>
                       )}
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Target URL</label>
                          <div className="flex gap-2">
                             <input 
                                disabled={activeBanner.status === 'LIVE'}
                                type="url" 
                                className="flex-1 bg-gray-50 border border-gray-200 p-4 rounded-xl font-bold text-sm outline-none focus:bg-white transition-all disabled:opacity-50" 
                                value={activeBanner.linkUrl} 
                                onChange={(e) => updateActiveBannerUrl(activeBanner.id, e.target.value)} 
                                placeholder="https://yourwebsite.com"
                             />
                             {activeBanner.status === 'LIVE' && (
                               <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl flex items-center text-[8px] font-black uppercase max-w-[100px] text-center">
                                  Locked after Approval
                               </div>
                             )}
                          </div>
                       </div>
                       
                       <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-center gap-4">
                          <i className="fas fa-clock text-blue-500"></i>
                          <div>
                             <p className="text-[10px] font-black uppercase text-blue-900">Subscription Period</p>
                             <p className="text-xs font-bold text-blue-700">Expires on {new Date(activeBanner.expiresAt).toLocaleDateString()} at {new Date(activeBanner.expiresAt).toLocaleTimeString()}</p>
                          </div>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                     <h3 className="text-2xl font-black uppercase">City Sponsorship</h3>
                     <div className="bg-slate-900 p-8 rounded-[2rem] text-white space-y-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Campaign Package</h4>
                        <div className="flex justify-between items-end">
                           <p className="text-3xl font-black">₹{currentBannerPrice.toLocaleString()}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{config.bannerAdDurationDays} Days Cycle</p>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">Your ad will be featured prominently at the top of <b>{getFormattedCity(user.cityId)}</b> listings.</p>
                     </div>

                     <form onSubmit={handleBuyBanner} className="space-y-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-gray-400">Campaign Name</label>
                           <input required type="text" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl font-bold" value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} placeholder="e.g. Summer Mega Sale" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-gray-400">Target Landing Page (URL)</label>
                           <input required type="url" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl font-bold" value={bannerForm.linkUrl} onChange={e => setBannerForm({...bannerForm, linkUrl: e.target.value})} placeholder="https://yourbrand.com/promo" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-gray-400">Creative Asset (4:1)</label>
                           <label 
                            className="flex flex-col items-center justify-center w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden relative group"
                            style={{ aspectRatio: '4 / 1' }}
                           >
                             {bannerForm.imageUrl ? (
                               <>
                                 <img src={bannerForm.imageUrl} className="w-full h-full object-cover" />
                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="bg-white text-gray-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Change Image</span>
                                 </div>
                               </>
                             ) : (
                               <div className="text-center p-4">
                                 <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xl shadow-blue-50">
                                   <i className="fas fa-image text-lg"></i>
                                 </div>
                                 <p className="text-[10px] font-black text-gray-900 uppercase">Upload Sponsorship Banner</p>
                                 <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Recommended: 1200x300 (4:1)</p>
                               </div>
                             )}
                             <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBannerFileSelect(e)} />
                           </label>
                        </div>
                        <button type="submit" disabled={!bannerForm.imageUrl || isProcessing === 'banner'} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer">
                          {isProcessing === 'banner' ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-bolt"></i>} Initialize Campaign
                        </button>
                     </form>
                  </div>
                )}
             </div>

             {/* Right Column: History & Stats */}
             <div className="lg:col-span-4 space-y-8">
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                   <h4 className="text-lg font-black uppercase mb-6">Campaign History</h4>
                   <div className="space-y-4">
                      {bannerHistory.map(b => (
                         <div key={b.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 grayscale hover:grayscale-0 transition-all">
                            <div className="flex gap-3 items-center">
                               <img 
                                src={b.imageUrl} 
                                className="w-20 rounded-md object-cover" 
                                style={{ aspectRatio: '4 / 1' }}
                               />
                               <div className="min-w-0">
                                  <p className="text-[10px] font-black uppercase text-gray-900 truncate">{b.title || 'Untitled'}</p>
                                  <p className={`text-[8px] font-black uppercase ${b.status === 'REJECTED' ? 'text-rose-500' : 'text-gray-400'}`}>{b.status}</p>
                               </div>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-3">
                               <div className="text-center">
                                  <p className="text-[7px] font-black uppercase text-gray-400">Views</p>
                                  <p className="text-[11px] font-black">{b.views || 0}</p>
                               </div>
                               <div className="text-center">
                                  <p className="text-[7px] font-black uppercase text-gray-400">Clicks</p>
                                  <p className="text-[11px] font-black">{b.clicks || 0}</p>
                               </div>
                               <div className="text-right">
                                  <p className="text-[7px] font-black uppercase text-gray-400">Ended</p>
                                  <p className="text-[10px] font-bold text-gray-600">{new Date(b.expiresAt).toLocaleDateString()}</p>
                               </div>
                            </div>
                         </div>
                      ))}
                      {bannerHistory.length === 0 && (
                        <div className="text-center py-10">
                           <i className="fas fa-history text-gray-200 text-3xl mb-3"></i>
                           <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">No previous campaigns</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="bg-blue-50 p-8 rounded-[3rem] border border-blue-100 shadow-sm">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm"><i className="fas fa-chart-line"></i></div>
                      <h4 className="text-[10px] font-black uppercase text-blue-900 tracking-widest leading-none">Performance Insights</h4>
                   </div>
                   <p className="text-[10px] font-medium text-blue-700 leading-relaxed uppercase tracking-tighter">Cities like <b>{getFormattedCity(user.cityId)?.split(' ')[0]}</b> have an average of <b>5k+ weekly impressions</b> for sponsors.</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'SUPPORT' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black mb-6 uppercase">Open a Ticket</h3>
                <form onSubmit={handleCreateTicket} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Subject</label>
                      <input required type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={ticketForm.subject} onChange={e => setTicketForm({...ticketForm, subject: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Message</label>
                      <textarea required rows={4} className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={ticketForm.message} onChange={e => setTicketForm({...ticketForm, message: e.target.value})} />
                   </div>
                   <button type="submit" disabled={isProcessing === 'ticket'} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-700 active:scale-95 transition-all">
                     {isProcessing === 'ticket' ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>} Send Request
                   </button>
                </form>
             </div>
             <div className="space-y-6">
                <h3 className="text-xl font-black uppercase">Recent Tickets</h3>
                {userTickets.map(ticket => (
                   <div key={ticket.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                         <h4 className="font-black text-gray-900 uppercase text-xs">{ticket.subject}</h4>
                         <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${ticket.status === 'OPEN' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{ticket.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{ticket.message}</p>
                      <p className="text-[8px] text-gray-400 font-black uppercase pt-2">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'TRANSACTIONS' && (
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50"><h3 className="text-xl font-black uppercase">Capital Ledger</h3></div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50">
                         <th className="px-10 py-5">Date</th>
                         <th className="px-10 py-5">Descriptor</th>
                         <th className="px-10 py-5">Value</th>
                         <th className="px-10 py-5 text-right">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {userTransactions.map(tx => (
                        <tr key={tx.id} className="text-xs font-bold hover:bg-gray-50">
                           <td className="px-10 py-5 text-gray-400">{new Date(tx.timestamp).toLocaleDateString()}</td>
                           <td className="px-10 py-5 text-gray-900 uppercase">{tx.description}</td>
                           <td className={`px-10 py-5 ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.type === 'CREDIT' ? '+' : '-'} ₹{tx.amount.toLocaleString()}</td>
                           <td className="px-10 py-5 text-right"><span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[8px] font-black">COMPLETED</span></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {showRechargeModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="bg-blue-600 p-8 text-white text-center"><h3 className="text-2xl font-black">Recharge Wallet</h3></div>
              <div className="p-10 space-y-6">
                 <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-2xl text-3xl font-black outline-none" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} placeholder="₹ 0.00" />
                 <button onClick={() => { onAddFunds(Number(rechargeAmount)); setShowRechargeModal(false); setRechargeAmount(''); notify("Payment request initialized.", "info"); }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase shadow-xl cursor-pointer hover:bg-blue-700 active:scale-95 transition-all">Secure Payment</button>
                 <button onClick={() => setShowRechargeModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px] cursor-pointer">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-10 border-b border-gray-100 flex justify-between items-center"><h3 className="text-2xl font-black uppercase">Modify Profile</h3><button onClick={() => setShowProfileModal(false)} className="cursor-pointer"><i className="fas fa-times text-xl"></i></button></div>
              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Display Name</label><input required type="text" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-bold" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} /></div>
                    
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Contact Number</label><input type="text" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-bold text-xs" value={profileForm.mobile} onChange={e => setProfileForm({...profileForm, mobile: e.target.value})} placeholder="+91 ..." /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">WhatsApp Number</label><input type="text" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-bold text-xs" value={profileForm.whatsapp} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} placeholder="+91 ..." /></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-gray-400">Country</label>
                          <select className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-bold text-xs outline-none" value={profileForm.countryId} onChange={e => handleCountryChange(e.target.value)}>
                            <option value="">Select Country</option>
                            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-gray-400">State</label>
                          <select className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-bold text-xs outline-none" value={profileForm.stateId} onChange={e => handleStateChange(e.target.value)}>
                            <option value="">Select State</option>
                            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-gray-400">City</label>
                          <select className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-bold text-xs outline-none" value={profileForm.cityId} onChange={e => setProfileForm({...profileForm, cityId: e.target.value})}>
                            <option value="">Select City</option>
                            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Full Address</label>
                      <textarea rows={3} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-bold text-xs outline-none focus:bg-white transition-all" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} placeholder="House No, Street, Landmark..." />
                    </div>

                    <button type="submit" disabled={isProcessing === 'profile'} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-black active:scale-95 transition-all">
                       {isProcessing === 'profile' ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Commit Profile Changes
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
