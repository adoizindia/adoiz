import React, { useState, useEffect } from 'react';
import { User, Listing, ListingStatus, UserRole, City, State, Country, SupportTicket, WalletTransaction, BannerAd } from '../types';
import { dbService } from '../services/dbService';

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

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, listings, onEdit, onDelete, onBoost, onPostNew, onAddFunds, onUpdateUser, onAdminPanel, onModerationPanel, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'ADS' | 'BANNER' | 'SUPPORT' | 'TRANSACTIONS'>('ADS');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState(false);
  
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [userTransactions, setUserTransactions] = useState<WalletTransaction[]>([]);
  const [userBanners, setUserBanners] = useState<BannerAd[]>([]);
  
  // Location lists for dropdowns
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
  const [bannerForm, setBannerForm] = useState({ imageUrl: '', linkUrl: '' });
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

  useEffect(() => { 
    loadDashboardData(); 
  }, [user.id]);

  // Handle location initial loads and auto-selection
  useEffect(() => {
    const listCountries = dbService.getCountries();
    setCountries(listCountries);

    if (user.stateId) {
      const currentState = dbService.getStates().find(s => s.id === user.stateId);
      if (currentState) {
        setProfileForm(prev => ({ ...prev, countryId: currentState.countryId }));
        setStates(dbService.getStates(currentState.countryId));
        setCities(dbService.getCities(user.stateId));
      }
    }
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

  const handleUpgradeToPremium = async (listingId: string) => {
    if (user.walletBalance < config.premiumPrice) { 
      alert(`Insufficient funds. You need ₹${config.premiumPrice} to upgrade to Premium.`); 
      setShowRechargeModal(true);
      return;
    }
    setIsProcessing(listingId);
    try {
      await onBoost(listingId);
      alert("Ad successfully upgraded to Premium and Approved!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleActivateBlueTick = async () => {
    if (user.walletBalance < config.blueTickPrice) {
      alert(`Insufficient funds. You need ₹${config.blueTickPrice} to activate Blue Tick Verification.`);
      setShowRechargeModal(true);
      return;
    }

    if (window.confirm(`Activate Blue Tick Verification for ₹${config.blueTickPrice}? (Valid for ${config.blueTickDurationDays} days)`)) {
      setIsProcessing('bluetick');
      try {
        const updated = await dbService.activateBlueTick(user.id);
        if (updated && onUpdateUser) onUpdateUser(updated);
        alert("Blue Tick Verification activated! Your profile now features a verified badge.");
        loadDashboardData();
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsProcessing(null);
      }
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message) return;
    await dbService.createTicket(user.id, user.name, ticketForm.subject, ticketForm.message);
    setTicketForm({ subject: '', message: '' });
    loadDashboardData();
    alert("Support ticket created. Our team will contact you soon.");
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await dbService.updateUser(user.id, profileForm);
    if (updated && onUpdateUser) onUpdateUser(updated);
    setShowProfileModal(false);
    alert("Profile updated successfully.");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm({ ...profileForm, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
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

  const handleBuyBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const isSufficient = user.walletBalance >= config.bannerAdPrice;
    
    try {
      await dbService.processBannerSponsorship(user.id, user.cityId || 'c1', bannerForm.imageUrl, bannerForm.linkUrl);
      
      const u = await dbService.getUserById(user.id);
      if (u && onUpdateUser) onUpdateUser(u);
      
      setBannerForm({ imageUrl: '', linkUrl: '' });
      setBannerPreview(false);
      
      if (!isSufficient) {
        alert("Wallet balance too low. Ad saved as DRAFT. Please recharge to activate.");
        setShowRechargeModal(true);
      } else {
        alert("City banner purchased! It is now live in your city.");
      }
      
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleActivateBanner = async (id: string) => {
    if (user.walletBalance < config.bannerAdPrice) {
      alert("Insufficient balance to activate this sponsorship.");
      setShowRechargeModal(true);
      return;
    }

    setIsProcessing(id);
    try {
      await dbService.activateExistingBanner(id, user.id);
      const u = await dbService.getUserById(user.id);
      if (u && onUpdateUser) onUpdateUser(u);
      alert("Sponsorship activated successfully!");
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 pb-32">
      {/* Header Profile Section */}
      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-gray-100 mb-10">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <img src={user.photo} className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] object-cover border-4 border-white shadow-2xl group-hover:scale-105 transition-transform" alt="" />
            <button onClick={() => setShowProfileModal(true)} className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white">
              <i className="fas fa-pen text-xs"></i>
            </button>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.name}</h1>
              {user.isVerified ? (
                <span className="inline-flex items-center bg-blue-50 text-blue-600 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-blue-100"><i className="fas fa-check-circle mr-1.5"></i> Verified Professional</span>
              ) : (
                <button 
                  onClick={handleActivateBlueTick}
                  disabled={isProcessing === 'bluetick'}
                  className="inline-flex items-center bg-gray-100 text-gray-500 hover:bg-blue-600 hover:text-white text-[9px] font-black uppercase px-3 py-1 rounded-full border border-gray-200 transition-all active:scale-95"
                >
                  {isProcessing === 'bluetick' ? <i className="fas fa-circle-notch fa-spin mr-1.5"></i> : <i className="fas fa-certificate mr-1.5"></i>}
                  Get Verified (₹{config.blueTickPrice})
                </button>
              )}
              <span className="inline-flex items-center bg-gray-50 text-gray-400 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-gray-100">{user.role}</span>
            </div>
            <p className="text-gray-500 font-medium mb-6">Location: <b>{user.cityId}</b></p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <button onClick={() => setShowRechargeModal(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 flex items-center gap-3 active:scale-95 transition-all">
                <i className="fas fa-wallet"></i> Wallet: ₹{user.walletBalance.toLocaleString()}
              </button>
              {user.role === UserRole.ADMIN && <button onClick={onAdminPanel} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3">Admin Panel</button>}
              {user.role === UserRole.MODERATOR && <button onClick={onModerationPanel} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3">Moderation</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 mb-8 bg-white p-1.5 rounded-[2rem] border border-gray-100 shadow-sm w-fit overflow-x-auto hide-scrollbar">
        {[
          { id: 'ADS', icon: 'fa-tags', label: 'My Listings' },
          { id: 'BANNER', icon: 'fa-rectangle-ad', label: 'Sponsorship' },
          { id: 'SUPPORT', icon: 'fa-headset', label: 'Support' },
          { id: 'TRANSACTIONS', icon: 'fa-history', label: 'Wallet History' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <i className={`fas ${tab.icon} mr-2`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* Content Rendering */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'ADS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Your Active Ads</h2>
              <button onClick={onPostNew} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">+ Post New Ad</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {listings.map(l => (
                <div key={l.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex gap-6 hover:shadow-xl transition-all group">
                  <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
                    <img src={l.images[0]} className="w-full h-full object-cover rounded-2xl" alt="" />
                    {l.isPremium && <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-lg"><i className="fas fa-crown"></i> Premium</div>}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-gray-900 text-lg truncate">{l.title}</h4>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${l.status === ListingStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{l.status}</span>
                      </div>
                      <p className="text-blue-600 font-black text-lg">₹{l.price.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1"><i className="fas fa-eye mr-1"></i> {l.views} Views • {l.category}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-4">
                      <button onClick={() => onEdit(l)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl transition-all" title="Edit Ad"><i className="fas fa-pen"></i></button>
                      <button onClick={() => onDelete(l.id)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all" title="Delete Ad"><i className="fas fa-trash-alt"></i></button>
                      {!l.isPremium && (
                        <button 
                          onClick={() => handleUpgradeToPremium(l.id)} 
                          disabled={isProcessing === l.id}
                          className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                        >
                          {isProcessing === l.id ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-crown"></i> Premium (₹{config.premiumPrice})</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {listings.length === 0 && (
                <div className="md:col-span-2 py-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem]">
                   <p className="text-gray-300 font-black uppercase tracking-widest">You have no active listings yet.</p>
                   <button onClick={onPostNew} className="mt-4 text-blue-600 font-bold uppercase text-[10px] tracking-widest hover:underline">Post your first ad now</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'BANNER' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black mb-6 uppercase tracking-tighter">Sponsor Your City</h3>
                <p className="text-gray-500 text-sm mb-8">Purchase a premium banner ad to be displayed on the home page for all users in <b>{user.cityId}</b>.</p>
                <form onSubmit={handleBuyBanner} className="space-y-6">
                   <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-gray-400">Creative Image URL</label>
                        <button type="button" onClick={() => setBannerPreview(!bannerPreview)} className="text-[9px] font-black uppercase text-blue-600 hover:underline">Toggle Preview</button>
                      </div>
                      <input required type="url" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={bannerForm.imageUrl} onChange={e => setBannerForm({...bannerForm, imageUrl: e.target.value})} placeholder="https://..." />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Target Website URL</label>
                      <input required type="url" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={bannerForm.linkUrl} onChange={e => setBannerForm({...bannerForm, linkUrl: e.target.value})} placeholder="https://..." />
                   </div>
                   <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex justify-between items-center">
                      <div>
                        <p className="font-black text-blue-900">Sponsorship Fee</p>
                        <p className="text-[10px] text-blue-600 uppercase font-black">Valid for {config.bannerAdDurationDays} days</p>
                      </div>
                      <p className="text-xl font-black text-blue-900">₹{config.bannerAdPrice}</p>
                   </div>
                   <button 
                    type="submit" 
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${user.walletBalance >= config.bannerAdPrice ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-gray-100 text-gray-400 shadow-none'}`}
                   >
                     {user.walletBalance >= config.bannerAdPrice ? 'Purchase Sponsorship' : 'Save as Draft'}
                   </button>
                   {user.walletBalance < config.bannerAdPrice && (
                     <div className="text-center">
                        <button type="button" onClick={() => setShowRechargeModal(true)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Insufficient Balance? Recharge Now</button>
                     </div>
                   )}
                </form>
             </div>
             
             <div className="space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tighter">My City Banners</h3>
                {userBanners.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-200 aspect-[6/1] rounded-2xl flex items-center justify-center p-4">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No sponsorships recorded</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userBanners.map(banner => (
                      <div key={banner.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 group">
                        <div className="relative aspect-[6/1] rounded-xl overflow-hidden border border-gray-50">
                           <img src={banner.imageUrl} className="w-full h-full object-cover" alt="Sponsor" />
                           <div className={`absolute top-2 right-2 px-2 py-0.5 text-[7px] font-black uppercase rounded text-white ${
                             banner.status === 'LIVE' ? 'bg-emerald-500' : 
                             banner.status === 'DRAFT' ? 'bg-amber-500' : 'bg-rose-500'
                           }`}>
                             {banner.status}
                           </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="min-w-0 pr-4">
                            <p className="text-[9px] font-black uppercase text-gray-400">City: <b>{banner.cityId}</b></p>
                            {banner.status === 'LIVE' && <p className="text-[9px] font-black uppercase text-emerald-600 mt-1">Expires: {new Date(banner.expiresAt).toLocaleDateString()}</p>}
                          </div>
                          {(banner.status === 'DRAFT' || banner.status === 'EXPIRED') && (
                            <button 
                              onClick={() => handleActivateBanner(banner.id)}
                              disabled={isProcessing === banner.id}
                              className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2"
                            >
                              {isProcessing === banner.id ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-bolt"></i> Activate</>}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {bannerPreview && bannerForm.imageUrl && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Live Preview</h3>
                    <div className="bg-gray-100 aspect-[6/1] rounded-2xl overflow-hidden border border-blue-200 shadow-lg">
                       <img src={bannerForm.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'SUPPORT' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
             <div className="md:col-span-1">
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 sticky top-8">
                   <h3 className="text-xl font-black mb-6 uppercase tracking-tighter">Open Support Ticket</h3>
                   <form onSubmit={handleCreateTicket} className="space-y-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400">Subject</label>
                         <input required type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={ticketForm.subject} onChange={e => setTicketForm({...ticketForm, subject: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400">Detailed Description</label>
                         <textarea required rows={4} className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={ticketForm.message} onChange={e => setTicketForm({...ticketForm, message: e.target.value})} />
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]">Submit Ticket</button>
                   </form>
                </div>
             </div>
             <div className="md:col-span-2 space-y-4">
                <h3 className="text-xl font-black uppercase tracking-tighter">Ticket History</h3>
                {userTickets.map(t => (
                  <div key={t.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 flex items-center justify-between">
                     <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-2">
                           <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase ${t.status === 'OPEN' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>{t.status}</span>
                           <span className="text-[10px] text-gray-300 font-bold uppercase">{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-lg font-black text-gray-900 truncate">{t.subject}</h4>
                        <p className="text-gray-500 text-sm italic mt-1 truncate">"{t.message}"</p>
                     </div>
                     <button className="w-12 h-12 bg-gray-50 text-gray-300 rounded-2xl hover:text-blue-600 transition-all"><i className="fas fa-chevron-right"></i></button>
                  </div>
                ))}
                {userTickets.length === 0 && <div className="py-20 text-center text-gray-300 font-black uppercase text-sm tracking-widest italic border-2 border-dashed border-gray-100 rounded-[2.5rem]">No active support tickets.</div>}
             </div>
          </div>
        )}

        {activeTab === 'TRANSACTIONS' && (
          <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
             <div className="p-10 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tighter">Wallet Ledger</h3>
                <div className="text-right">
                   <p className="text-[10px] font-black uppercase text-gray-400">Current Balance</p>
                   <p className="text-2xl font-black text-blue-600">₹{user.walletBalance.toLocaleString()}</p>
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-white border-b border-gray-50">
                      <tr>
                         <th className="px-10 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Date & Time</th>
                         <th className="px-10 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Description</th>
                         <th className="px-10 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Amount</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {userTransactions.map(tx => (
                         <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-10 py-6 text-[11px] font-bold text-gray-400 whitespace-nowrap">
                               {new Date(tx.timestamp).toLocaleString()}
                            </td>
                            <td className="px-10 py-6">
                               <p className="text-sm font-black text-gray-900">{tx.description}</p>
                               <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${tx.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {tx.type}
                               </span>
                            </td>
                            <td className={`px-10 py-6 text-right font-black text-lg ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                               {tx.type === 'CREDIT' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                            </td>
                         </tr>
                      ))}
                      {userTransactions.length === 0 && (
                         <tr>
                            <td colSpan={3} className="py-20 text-center text-gray-300 font-black uppercase text-xs italic tracking-widest">No wallet activity recorded.</td>
                         </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-blue-600 p-8 text-white text-center">
                 <h3 className="text-2xl font-black">Recharge Wallet</h3>
                 <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mt-2">Secure Credit Transmission</p>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Recharge Amount (₹)</label>
                    <input autoFocus type="number" className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-2xl text-3xl font-black focus:border-blue-500 outline-none" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} placeholder="0.00" />
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                    {[100, 500, 1000].map(amt => (
                      <button key={amt} onClick={() => setRechargeAmount(amt.toString())} className="bg-gray-50 py-3 rounded-xl text-xs font-black text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all">₹{amt}</button>
                    ))}
                 </div>
                 <div className="flex flex-col gap-3 pt-4">
                    <button onClick={() => { onAddFunds(Number(rechargeAmount)); setShowRechargeModal(false); setRechargeAmount(''); loadDashboardData(); }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100">Initialize Payment</button>
                    <button onClick={() => setShowRechargeModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
              <div className="p-10 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="text-2xl font-black tracking-tighter uppercase">Modify User Profile</h3>
                 <button onClick={() => setShowProfileModal(false)} className="text-gray-300"><i className="fas fa-times text-xl"></i></button>
              </div>
              <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                 {/* Photo Upload Section */}
                 <div className="flex flex-col items-center">
                    <div className="relative group mb-4">
                       <img src={profileForm.photo} className="w-24 h-24 rounded-3xl object-cover border-4 border-gray-50 shadow-lg" alt="" />
                       <label className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                          <i className="fas fa-camera text-xl"></i>
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                       </label>
                    </div>
                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Click photo to upload new</p>
                 </div>

                 <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Display Name</label><input required type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Mobile Number</label><input required type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={profileForm.mobile} onChange={e => setProfileForm({...profileForm, mobile: e.target.value})} /></div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-gray-400">Country</label>
                          <select required className="w-full bg-gray-50 border p-4 rounded-xl font-bold text-xs" value={profileForm.countryId} onChange={e => handleCountryChange(e.target.value)}>
                             <option value="">Select</option>
                             {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-gray-400">State</label>
                          <select required disabled={!profileForm.countryId} className="w-full bg-gray-50 border p-4 rounded-xl font-bold text-xs disabled:opacity-50" value={profileForm.stateId} onChange={e => handleStateChange(e.target.value)}>
                             <option value="">Select</option>
                             {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-gray-400">City</label>
                          <select required disabled={!profileForm.stateId} className="w-full bg-gray-50 border p-4 rounded-xl font-bold text-xs disabled:opacity-50" value={profileForm.cityId} onChange={e => setProfileForm({...profileForm, cityId: e.target.value})}>
                             <option value="">Select</option>
                             {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">WhatsApp Number</label><input required type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={profileForm.whatsapp} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Profile Photo URL (Manual)</label><input type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={profileForm.photo} onChange={e => setProfileForm({...profileForm, photo: e.target.value})} /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Postal Address</label><input required type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} /></div>
                    
                    <div className="flex gap-4 pt-6">
                       <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Save Changes</button>
                       <button type="button" onClick={() => setShowProfileModal(false)} className="px-8 border border-gray-200 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-400">Cancel</button>
                    </div>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};