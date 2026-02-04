
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
  const [bannerPreview, setBannerPreview] = useState(false);
  
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [userTransactions, setUserTransactions] = useState<WalletTransaction[]>([]);
  const [userBanners, setUserBanners] = useState<BannerAd[]>([]);
  
  // Banner Upload & Crop State
  const [cropModal, setCropModal] = useState<{ show: boolean; image: string | null }>({ show: false, image: null });
  const [cropOffset, setCropOffset] = useState(0); 
  const bannerCanvasRef = useRef<HTMLCanvasElement>(null);

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

  const activeSponsorships = useMemo(() => {
    return userBanners.filter(b => b.cityId === user.cityId && b.status === 'LIVE' && new Date(b.expiresAt) > new Date());
  }, [userBanners, user.cityId]);

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

  const handleActivateBlueTick = async () => {
    if (user.walletBalance < config.blueTickPrice) {
      notify(`Insufficient funds for Blue Tick Verification.`, "error");
      setShowRechargeModal(true);
      return;
    }

    if (window.confirm(`Activate Blue Tick Verification for ₹${config.blueTickPrice}?`)) {
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileForm({ ...profileForm, photo: reader.result as string });
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

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropModal({ show: true, image: reader.result as string });
      setCropOffset(0);
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = () => {
    if (!bannerCanvasRef.current || !cropModal.image) return;
    const canvas = bannerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = cropModal.image;
    img.onload = () => {
      canvas.width = 1280;
      canvas.height = 720;
      const targetAspect = 16 / 9;
      let sx = 0, sy = 0, sw = img.width, sh = sw / targetAspect;
      if (img.width / img.height > targetAspect) {
        sh = img.height; sw = sh * targetAspect; sx = (img.width - sw) / 2;
      } else {
        sy = ((img.height - sh) * cropOffset) / 100;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1280, 720);
      setBannerForm(prev => ({ ...prev, imageUrl: canvas.toDataURL('image/jpeg', 0.9) }));
      setCropModal({ show: false, image: null });
      setBannerPreview(true);
      notify("Creative cropped successfully.", "info");
    };
  };

  const handleBuyBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.imageUrl) return;
    setIsProcessing('banner');
    try {
      await dbService.processBannerSponsorship(user.id, user.cityId || 'c1', bannerForm.imageUrl, bannerForm.linkUrl, bannerForm.title);
      const u = await dbService.getUserById(user.id);
      if (u && onUpdateUser) onUpdateUser(u);
      setBannerForm({ title: '', imageUrl: '', linkUrl: '' });
      setBannerPreview(false);
      notify("City sponsorship purchased successfully.", "success");
      loadDashboardData();
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
            <button onClick={() => setShowProfileModal(true)} className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white"><i className="fas fa-pen text-xs"></i></button>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.name}</h1>
              {user.isVerified && <span className="bg-blue-50 text-blue-600 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-blue-100"><i className="fas fa-check-circle mr-1.5"></i> Verified</span>}
            </div>
            <p className="text-gray-500 font-medium mb-6">Location: <b>{getFormattedCity(user.cityId)}</b></p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <button onClick={() => setShowRechargeModal(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3">
                <i className="fas fa-wallet"></i> Wallet: ₹{user.walletBalance.toLocaleString()}
              </button>
              {user.role === UserRole.ADMIN && <button onClick={onAdminPanel} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Admin Panel</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-8 bg-white p-1.5 rounded-[2rem] border border-gray-100 shadow-sm w-full lg:w-fit overflow-x-auto">
        {['ADS', 'BANNER', 'SUPPORT', 'TRANSACTIONS'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4">
        {activeTab === 'ADS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 uppercase">Your Active Ads</h2>
              <button onClick={onPostNew} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg">+ Post New Ad</button>
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
                      <button onClick={() => onEdit(l)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl transition-all"><i className="fas fa-pen"></i></button>
                      <button onClick={() => onDelete(l.id)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all"><i className="fas fa-trash-alt"></i></button>
                      {!l.isPremium && <button onClick={() => handleUpgradeToPremium(l.id)} disabled={isProcessing === l.id} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2">
                        {isProcessing === l.id ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-crown"></i> Boost</>}
                      </button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'BANNER' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black mb-6 uppercase">City Sponsorship</h3>
                <form onSubmit={handleBuyBanner} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Campaign Title</label>
                      <input required type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400">Creative Asset</label>
                      <label className="flex flex-col items-center justify-center w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden relative">
                        {bannerForm.imageUrl ? <img src={bannerForm.imageUrl} className="w-full h-full object-cover" /> : <div className="text-center p-4"><i className="fas fa-image text-2xl text-gray-300 mb-2"></i><p className="text-[10px] font-black text-gray-400">Upload Banner</p></div>}
                        <input type="file" className="hidden" accept="image/*" onChange={handleBannerFileSelect} />
                      </label>
                   </div>
                   <button type="submit" disabled={!bannerForm.imageUrl || isProcessing === 'banner'} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase shadow-xl flex items-center justify-center gap-2">
                     {isProcessing === 'banner' ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-shopping-cart"></i>} Purchase Sponsorship
                   </button>
                </form>
             </div>
             <div className="space-y-6">
                <h3 className="text-xl font-black uppercase">Active Sponsorships</h3>
                {activeSponsorships.map(banner => (
                   <div key={banner.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                      <img src={banner.imageUrl} className="w-full aspect-video object-cover rounded-xl" />
                      <div className="flex justify-between items-center">
                         <h4 className="font-black text-gray-900 uppercase text-xs">{banner.title}</h4>
                         <span className="text-[10px] font-black text-emerald-500">ACTIVE</span>
                      </div>
                   </div>
                ))}
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
                 <button onClick={() => { onAddFunds(Number(rechargeAmount)); setShowRechargeModal(false); setRechargeAmount(''); notify("Payment request initialized.", "info"); }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase shadow-xl">Secure Payment</button>
                 <button onClick={() => setShowRechargeModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px]">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-10 border-b border-gray-100 flex justify-between items-center"><h3 className="text-2xl font-black uppercase">Modify Profile</h3><button onClick={() => setShowProfileModal(false)}><i className="fas fa-times text-xl"></i></button></div>
              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                 <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Display Name</label><input required type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Country</label><select className="w-full bg-gray-50 border p-4 rounded-xl font-bold text-xs" value={profileForm.countryId} onChange={e => handleCountryChange(e.target.value)}>{countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                       <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">State</label><select className="w-full bg-gray-50 border p-4 rounded-xl font-bold text-xs" value={profileForm.stateId} onChange={e => handleStateChange(e.target.value)}>{states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    </div>
                    <button type="submit" disabled={isProcessing === 'profile'} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2">
                       {isProcessing === 'profile' ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Commit Profile Changes
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {cropModal.show && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center"><h3 className="text-2xl font-black">Crop Banner</h3><button onClick={() => setCropModal({ show: false, image: null })}><i className="fas fa-times text-xl"></i></button></div>
              <div className="p-10 space-y-8">
                 <div className="relative aspect-video w-full bg-gray-100 rounded-2xl overflow-hidden">
                    <img src={cropModal.image!} className="absolute left-0 w-full" style={{ top: `-${cropOffset}%` }} />
                 </div>
                 <input type="range" min="0" max="100" value={cropOffset} onChange={e => setCropOffset(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                 <button onClick={applyCrop} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] shadow-xl">Finalize Asset</button>
              </div>
           </div>
        </div>
      )}
      <canvas ref={bannerCanvasRef} className="hidden" />
    </div>
  );
};
