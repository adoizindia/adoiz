import React, { useState, useEffect, useMemo, useRef } from 'react';
import { dbService } from '../services/dbService';
import { 
  User, UserRole, Listing, ListingStatus, WalletTransaction, 
  SystemConfig, City, State, Country, Category, BannerAd, UserStatus
} from '../types';
import { CITIES, STATES } from '../constants';

type MainMenu = 
  | 'DASHBOARD' | 'GEO' | 'USERS' | 'LISTINGS' | 'BANNERS' 
  | 'PRICING' | 'PAYMENTS' | 'COMMUNICATIONS' | 'FEATURES' | 'SYSTEM'
  | 'GEO_CATS' | 'REVENUE';

type UserDetailTab = 'IDENTITY' | 'FINANCIAL' | 'INVENTORY' | 'GEO_ANCHOR';

const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  window.dispatchEvent(new CustomEvent('adoiz-notify', { detail: { message, type } }));
};

export const AdminPanel: React.FC<{ 
  user: User; 
  onBack: () => void; 
  onLogout: () => void; 
  onViewAd?: (listing: Listing) => void;
  onGoToModeration?: () => void;
}> = ({ user, onBack, onLogout, onViewAd, onGoToModeration }) => {
  const [activeMenu, setActiveMenu] = useState<MainMenu>('DASHBOARD');
  const [activeTab, setActiveTab] = useState<string>('platform_meta');
  const [activeUserDetailTab, setActiveUserDetailTab] = useState<UserDetailTab>('IDENTITY');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<SystemConfig>(dbService.getSystemConfig());
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Selection & Detail States
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailAds, setDetailAds] = useState<Listing[]>([]);
  const [detailTxns, setDetailTxns] = useState<WalletTransaction[]>([]);
  const [walletForm, setWalletForm] = useState({ amount: '', type: 'CREDIT' as 'CREDIT' | 'DEBIT', reason: '' });

  // Listing Management States
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [listingFilterStatus, setListingFilterStatus] = useState<string>('ALL');
  const [listingFilterCategory, setListingFilterCategory] = useState<string>('ALL');

  // User Registry Filter
  const [userFilterRole, setUserFilterRole] = useState<string>('ALL');

  // Geo Specific States
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Detail Geo States
  const [detailStates, setDetailStates] = useState<State[]>([]);
  const [detailCities, setDetailCities] = useState<City[]>([]);

  // Category CRUD state
  const [catForm, setCatForm] = useState({ id: '', name: '', icon: '' });
  const [isEditingCat, setIsEditingCat] = useState(false);

  // City Tier state
  const [cityTiers, setCityTiers] = useState<Record<string, 'T1' | 'T2' | 'T3'>>(config.cityTierMapping);

  // Geo Forms State
  const [countryAddForm, setCountryAddForm] = useState({ name: '', code: '' });
  const [stateAddForm, setStateAddForm] = useState({ name: '', countryId: '' });
  const [cityAddForm, setCityAddForm] = useState({ name: '', countryId: '', stateId: '', tier: 'T2' as 'T1' | 'T2' | 'T3' });
  const [formStates, setFormStates] = useState<State[]>([]);

  useEffect(() => {
    loadData();
    setActiveTab(getTabsForMenu(activeMenu)[0].id);
  }, [activeMenu]);

  useEffect(() => {
    if (selectedUserId) {
      loadUserDetails(selectedUserId);
      setActiveUserDetailTab('IDENTITY');
    } else {
      setDetailUser(null);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedListingId) {
      loadListingDetails(selectedListingId);
    } else {
      setDetailListing(null);
    }
  }, [selectedListingId]);

  const loadData = async () => {
    setLoading(true);
    const [u, l, b, s, cats, cfg] = await Promise.all([
      dbService.getAllUsers(),
      dbService.getAllListings(),
      dbService.getAllBanners(),
      dbService.getSecurityLogs(),
      dbService.getCategories(),
      dbService.getSystemConfig()
    ]);
    setUsers(u);
    setListings(l);
    setBanners(b);
    setLogs(s);
    setCountries(dbService.getCountries());
    setStates(dbService.getStates());
    setCities(dbService.getCities());
    setCategories(cats);
    setConfig(cfg);
    setCityTiers(cfg.cityTierMapping);
    setLoading(false);
  };

  const loadListingDetails = async (id: string) => {
    setIsProcessing(true);
    const all = await dbService.getAllListings();
    const found = all.find(l => l.id === id);
    if (found) setDetailListing({ ...found });
    setIsProcessing(false);
  };

  const loadUserDetails = async (id: string) => {
    setIsProcessing(true);
    const [u, ads, txns] = await Promise.all([
      dbService.getUserById(id),
      dbService.getListingsBySeller(id),
      dbService.getTransactionsByUserId(id)
    ]);
    
    if (u) {
      setDetailUser(u);
      setDetailAds(ads);
      setDetailTxns(txns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      
      // Setup Geo Dropdowns
      if (u.stateId) {
        const state = STATES.find(s => s.id === u.stateId);
        if (state) {
          setDetailStates(dbService.getStates(state.countryId));
          setDetailCities(dbService.getCities(u.stateId));
        }
      }
    }
    setIsProcessing(false);
  };

  const handleDetailGeoChange = async (type: 'COUNTRY' | 'STATE', id: string) => {
    if (!detailUser) return;
    if (type === 'COUNTRY') {
      const states = dbService.getStates(id);
      setDetailStates(states);
      setDetailCities([]);
      setDetailUser({ ...detailUser, stateId: '', cityId: '' });
    } else {
      const cities = dbService.getCities(id);
      setDetailCities(cities);
      setDetailUser({ ...detailUser, stateId: id, cityId: '' });
    }
  };

  const saveDetailProfile = async () => {
    if (!detailUser) return;
    setIsProcessing(true);
    try {
      await dbService.adminUpdateUser(detailUser.id, detailUser, user.id);
      notify("Entity configuration committed successfully.", "success");
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleListingSave = async () => {
    if (!detailListing) return;
    setIsProcessing(true);
    try {
      await dbService.updateListing(detailListing.id, detailListing);
      notify("Listing asset updated successfully.", "success");
      loadData();
      setSelectedListingId(null);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleListingDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this listing asset? This action cannot be undone.")) return;
    setIsProcessing(true);
    try {
      await dbService.deleteListing(id);
      notify("Listing asset removed from inventory.", "info");
      loadData();
      if (selectedListingId === id) setSelectedListingId(null);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailUser || !walletForm.amount || !walletForm.reason) return;
    setIsProcessing(true);
    try {
      const updated = await dbService.adminAdjustWallet(
        detailUser.id, 
        Number(walletForm.amount), 
        walletForm.type, 
        walletForm.reason, 
        user.id
      );
      setDetailUser(updated);
      setWalletForm({ amount: '', type: 'CREDIT', reason: '' });
      await loadUserDetails(detailUser.id);
      notify(`${walletForm.type} operation successful.`, "success");
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCategoryAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) return;
    setIsProcessing(true);
    try {
        if (isEditingCat) {
            await dbService.updateCategory(catForm.id, { name: catForm.name, icon: catForm.icon });
            notify("Category updated.", "success");
        } else {
            await dbService.addCategory({ name: catForm.name, icon: catForm.icon });
            notify("Category created.", "success");
        }
        setCatForm({ id: '', name: '', icon: '' });
        setIsEditingCat(false);
        loadData();
    } catch (err: any) {
        notify(err.message, "error");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCityTierChange = (cityId: string, tier: 'T1' | 'T2' | 'T3') => {
    const updated = { ...cityTiers, [cityId]: tier };
    setCityTiers(updated);
    dbService.updateSystemConfig({ cityTierMapping: updated });
    notify(`City ${cityId} updated to ${tier}`, "info");
  };

  const handleCountryAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryAddForm.name || !countryAddForm.code) return;
    setIsProcessing(true);
    try {
      await dbService.addCountry({ name: countryAddForm.name, code: countryAddForm.code.toUpperCase() });
      setCountryAddForm({ name: '', code: '' });
      notify("Country registered.", "success");
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStateAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stateAddForm.name || !stateAddForm.countryId) return;
    setIsProcessing(true);
    try {
      await dbService.addState({ name: stateAddForm.name, countryId: stateAddForm.countryId });
      setStateAddForm({ name: '', countryId: '' });
      notify("State/Territory registered.", "success");
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCityAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityAddForm.name || !cityAddForm.stateId) return;
    setIsProcessing(true);
    try {
      const newCity = await dbService.addCity({ 
        name: cityAddForm.name, 
        stateId: cityAddForm.stateId,
        isActive: true 
      });
      // Apply tier mapping
      const updatedTiers = { ...cityTiers, [newCity.id]: cityAddForm.tier };
      setCityTiers(updatedTiers);
      dbService.updateSystemConfig({ cityTierMapping: updatedTiers });
      
      setCityAddForm({ name: '', countryId: '', stateId: '', tier: 'T2' });
      setFormStates([]);
      notify(`City ${newCity.name} added successfully.`, "success");
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCityToggle = async (cityId: string, currentStatus: boolean) => {
    try {
      await dbService.updateCity(cityId, { isActive: !currentStatus });
      notify(`City status updated.`, "info");
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: UserRole) => {
    if (!window.confirm(`Update user role to ${newRole}?`)) return;
    setIsProcessing(true);
    try {
      await dbService.adminUpdateUser(userId, { role: newRole }, user.id);
      notify("User role updated successfully.", "success");
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfigCommit = async () => {
    setIsProcessing(true);
    try {
      await dbService.updateSystemConfig(config);
      notify("Platform logic committed successfully.", "success");
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBannerStatusUpdate = async (id: string, status: BannerAd['status']) => {
    let reason = '';
    if (status === 'REJECTED') {
      reason = window.prompt("Reason for rejection?") || 'Policy violation';
    }
    setIsProcessing(true);
    try {
      await dbService.adminUpdateBannerStatus(id, status, reason, user.id);
      notify(`Banner ${status.toLowerCase()} successfully.`, "success");
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  function getTabsForMenu(menu: MainMenu) {
    switch(menu) {
      case 'DASHBOARD': return [
        { id: 'platform_meta', label: 'Identity & Traffic' },
        { id: 'inventory_meta', label: 'Marketplace Assets' },
        { id: 'system_meta', label: 'Operational Console' }
      ];
      case 'REVENUE': return [
        { id: 'pricing', label: 'Pricing' },
        { id: 'banner_ads', label: 'Banner Ad' },
        { id: 'adsense', label: 'Adsense' },
        { id: 'gateways', label: 'Gateway' }
      ];
      case 'GEO': return [
        { id: 'countries', label: 'Country' },
        { id: 'states', label: 'State' },
        { id: 'cities', label: 'City' },
        { id: 'categories_tab', label: 'Category' }
      ];
      case 'USERS': return [
        { id: 'all-users', label: 'All Users' },
        { id: 'verification', label: 'Verification Queue' }
      ];
      case 'LISTINGS': return [
        { id: 'master', label: 'Master Inventory' },
        { id: 'pending', label: 'Pending Review' },
        { id: 'banner_inventory', label: 'Banner Ad' }
      ];
      case 'BANNERS': return [
        { id: 'active', label: 'Active Banners' },
        { id: 'pending-banners', label: 'Moderation' }
      ];
      case 'SYSTEM': return [
        { id: 'site', label: 'Site Branding' },
        { id: 'gateways_sys', label: 'Payment & API' },
        { id: 'auth', label: 'Auth Config' },
        { id: 'logs', label: 'Security Logs' }
      ];
      case 'GEO_CATS': return [
        { id: 'location_mgmt', label: 'Location' },
        { id: 'category_mgmt', label: 'Category' }
      ];
      default: return [{ id: 'default', label: 'Management' }];
    }
  }

  const renderRevenue = () => {
    if (activeTab === 'pricing') {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Marketplace Monetization Structure</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-gray-400">Premium Listing Asset</p>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-bold text-gray-400">Price (₹)</label>
                    <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.premiumPrice} onChange={e => setConfig({...config, premiumPrice: Number(e.target.value)})} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-bold text-gray-400">Duration (Days)</label>
                    <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.premiumDurationDays} onChange={e => setConfig({...config, premiumDurationDays: Number(e.target.value)})} />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-gray-400">Standard Ad Logic</p>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-bold text-gray-400">Paid Ad Price (₹)</label>
                    <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.standardAdPrice} onChange={e => setConfig({...config, standardAdPrice: Number(e.target.value)})} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-bold text-gray-400">Free Ad Inventory Limit</label>
                    <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.freeAdLimit} onChange={e => setConfig({...config, freeAdLimit: Number(e.target.value)})} />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-gray-400">Professional Verification (Blue Tick)</p>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-bold text-gray-400">Price (₹)</label>
                    <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.blueTickPrice} onChange={e => setConfig({...config, blueTickPrice: Number(e.target.value)})} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-bold text-gray-400">Validity (Days)</label>
                    <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.blueTickDurationDays} onChange={e => setConfig({...config, blueTickDurationDays: Number(e.target.value)})} />
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleConfigCommit} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Commit Revenue Variables</button>
          </div>
        </div>
      );
    }
    if (activeTab === 'banner_ads') {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">City Sponsorship & Banner Tiers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400">Tier 1 (Metro Hubs) - ₹/Cycle</label>
                <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.bannerAdTierPrices.T1} onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T1: Number(e.target.value)}})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400">Tier 2 (Major Cities) - ₹/Cycle</label>
                <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.bannerAdTierPrices.T2} onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T2: Number(e.target.value)}})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400">Tier 3 (Emerging) - ₹/Cycle</label>
                <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.bannerAdTierPrices.T3} onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T3: Number(e.target.value)}})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400">Standard / Global - ₹/Cycle</label>
                <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.bannerAdPrice} onChange={e => setConfig({...config, bannerAdPrice: Number(e.target.value)})} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400">Standard Campaign Duration (Days)</label>
                <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.bannerAdDurationDays} onChange={e => setConfig({...config, bannerAdDurationDays: Number(e.target.value)})} />
              </div>
            </div>
            <button onClick={handleConfigCommit} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Commit Sponsorship Logic</button>
          </div>
        </div>
      );
    }
    if (activeTab === 'adsense') {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Google Adsense Integration</h4>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Universal Ad Placement Script</label>
              <textarea rows={10} className="w-full bg-slate-900 text-emerald-400 font-mono text-xs p-6 rounded-[2rem] border-none outline-none focus:ring-4 focus:ring-blue-500/10" value={config.googleAdsenseCode} onChange={e => setConfig({...config, googleAdsenseCode: e.target.value})} placeholder="<script async src='https://pagead2.googlesyndication.com...'></script>" />
            </div>
            <button onClick={handleConfigCommit} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Inject Ad Script</button>
          </div>
        </div>
      );
    }
    if (activeTab === 'gateways') {
      const gateways = [
        { id: 'razorpay', label: 'Razorpay', fields: ['keyId', 'keySecret'] },
        { id: 'stripe', label: 'Stripe', fields: ['publishableKey', 'secretKey'] },
        { id: 'paypal', label: 'PayPal', fields: ['clientId', 'secret'] },
        { id: 'paytm', label: 'Paytm', fields: ['merchantId', 'merchantKey', 'website'] },
        { id: 'phonepe', label: 'PhonePe', fields: ['merchantId', 'saltKey', 'saltIndex'] }
      ];
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          {gateways.map(gw => {
             const gwData = (config.paymentGateway as any)[gw.id];
             return (
               <div key={gw.id} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                 <div className="flex justify-between items-center">
                   <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-900">{gw.label} Gateway</h4>
                   <button onClick={() => {
                     const updated = { ...config.paymentGateway, [gw.id]: { ...gwData, active: !gwData.active } };
                     setConfig({ ...config, paymentGateway: updated as any });
                   }} className={`w-12 h-6 rounded-full relative transition-all ${gwData.active ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gwData.active ? 'left-7' : 'left-1'}`}></div>
                   </button>
                 </div>
                 <div className="space-y-4">
                   {gw.fields.map(f => (
                     <div key={f} className="space-y-1">
                       <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">{f.replace(/([A-Z])/g, ' $1')}</label>
                       <input type="text" className="w-full bg-gray-50 border p-3 rounded-xl font-bold text-xs" value={gwData[f]} onChange={e => {
                         const updated = { ...config.paymentGateway, [gw.id]: { ...gwData, [f]: e.target.value } };
                         setConfig({ ...config, paymentGateway: updated as any });
                       }} />
                     </div>
                   ))}
                 </div>
               </div>
             );
          })}
          <div className="md:col-span-2">
            <button onClick={handleConfigCommit} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl">Commit Global Financial Logic</button>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderGeoCats = () => {
    if (activeTab === 'location_mgmt') {
      const filteredCities = cities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex items-center gap-4">
                <i className="fas fa-search text-gray-300 ml-4"></i>
                <input type="text" placeholder="Filter operational hubs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none p-2 outline-none text-xs font-bold" />
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50">
                    <th className="px-10 py-6">City Identity</th>
                    <th className="px-10 py-6">Parent Node (State)</th>
                    <th className="px-10 py-6">Economics</th>
                    <th className="px-10 py-6 text-right">Protocol Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCities.map(c => {
                    const state = states.find(s => s.id === c.stateId);
                    const tier = cityTiers[c.id] || 'T2';
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-10 py-6"><span className="text-sm font-black text-gray-900">{c.name}</span></td>
                        <td className="px-10 py-6"><span className="text-[10px] font-bold text-gray-400 uppercase">{state?.name || 'ROOT'}</span></td>
                        <td className="px-10 py-6">
                          <select 
                            value={tier} 
                            onChange={(e) => handleCityTierChange(c.id, e.target.value as any)}
                            className="bg-gray-50 border border-gray-100 p-2 rounded-xl text-[9px] font-black uppercase outline-none"
                          >
                            <option value="T1">T1</option>
                            <option value="T2">T2</option>
                            <option value="T3">T3</option>
                          </select>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <button 
                            onClick={() => handleCityToggle(c.id, !!c.isActive)}
                            className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${
                              c.isActive 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}
                           >
                              {c.isActive ? 'Authorized' : 'Deactivated'}
                           </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm h-fit">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-6 flex items-center gap-2"><i className="fas fa-globe"></i> Register Country</h4>
               <form onSubmit={handleCountryAdd} className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Country Name</label>
                     <input required type="text" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none" value={countryAddForm.name} onChange={e => setCountryAddForm({...countryAddForm, name: e.target.value})} placeholder="e.g. India" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">ISO Code</label>
                     <input required type="text" maxLength={3} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none" value={countryAddForm.code} onChange={e => setCountryAddForm({...countryAddForm, code: e.target.value})} placeholder="e.g. IN" />
                  </div>
                  <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl">Commit Country Node</button>
               </form>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm h-fit">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-6 flex items-center gap-2"><i className="fas fa-map"></i> Register State</h4>
               <form onSubmit={handleStateAdd} className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Select Country</label>
                     <select required className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none" value={stateAddForm.countryId} onChange={e => setStateAddForm({...stateAddForm, countryId: e.target.value})}>
                        <option value="">Select Sovereign Node</option>
                        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">State/Territory Name</label>
                     <input required type="text" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none" value={stateAddForm.name} onChange={e => setStateAddForm({...stateAddForm, name: e.target.value})} placeholder="e.g. Maharashtra" />
                  </div>
                  <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl">Commit State Node</button>
               </form>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm h-fit">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-6 flex items-center gap-2"><i className="fas fa-city"></i> Register City Asset</h4>
               <form onSubmit={handleCityAdd} className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Select Country</label>
                     <select required className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none" value={cityAddForm.countryId} onChange={e => {
                        const cid = e.target.value;
                        setCityAddForm({...cityAddForm, countryId: cid, stateId: ''});
                        setFormStates(dbService.getStates(cid));
                      }}>
                        <option value="">Select Sovereign Node</option>
                        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Select State</label>
                     <select required disabled={!cityAddForm.countryId} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none disabled:opacity-50" value={cityAddForm.stateId} onChange={e => setCityAddForm({...cityAddForm, stateId: e.target.value})}>
                        <option value="">Select State</option>
                        {formStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">City Name</label>
                     <input required type="text" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none" value={cityAddForm.name} onChange={e => setCityAddForm({...cityAddForm, name: e.target.value})} placeholder="e.g. Mumbai" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Market Tier</label>
                     <select required className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none" value={cityAddForm.tier} onChange={e => setCityAddForm({...cityAddForm, tier: e.target.value as any})}>
                        <option value="T1">Tier 1 (Metro)</option>
                        <option value="T2">Tier 2 (Major)</option>
                        <option value="T3">Tier 3 (Town)</option>
                     </select>
                  </div>
                  <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl shadow-blue-100">Deploy City Node</button>
               </form>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'category_mgmt') {
      const filteredCats = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-8">{isEditingCat ? 'Edit' : 'Create New'} Category</h4>
               <form onSubmit={handleCategoryAction} className="space-y-6">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-gray-400">Category Name</label>
                     <input required type="text" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-gray-400">FontAwesome Icon</label>
                     <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-blue-500 border border-gray-100 shadow-inner">
                            <i className={`fas ${catForm.icon || 'fa-tag'}`}></i>
                        </div>
                        <input required type="text" placeholder="fa-couch, fa-car..." className="flex-1 bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} />
                     </div>
                  </div>
                  <div className="flex gap-3">
                      <button type="submit" disabled={isProcessing} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100">
                          {isEditingCat ? 'Update Asset' : 'Create Asset'}
                      </button>
                      {isEditingCat && (
                          <button type="button" onClick={() => { setIsEditingCat(false); setCatForm({id:'', name:'', icon:''}); }} className="px-6 bg-gray-100 text-gray-400 rounded-2xl"><i className="fas fa-times"></i></button>
                      )}
                  </div>
               </form>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-4">
                <i className="fas fa-search text-gray-300 ml-4"></i>
                <input type="text" placeholder="Filter Categories..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none p-2 outline-none text-xs font-bold" />
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50">
                    <th className="px-10 py-6">Visual Node</th>
                    <th className="px-10 py-6">Label</th>
                    <th className="px-10 py-6 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCats.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-10 py-6">
                        <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center border border-blue-100">
                          <i className={`fas ${cat.icon}`}></i>
                        </div>
                      </td>
                      <td className="px-10 py-6"><span className="text-sm font-black text-gray-900 uppercase tracking-tight">{cat.name}</span></td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setCatForm(cat); setIsEditingCat(true); }} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl flex items-center justify-center transition-all shadow-sm"><i className="fas fa-pen text-xs"></i></button>
                            <button onClick={() => { if(window.confirm("Delete category?")) { dbService.deleteCategory(cat.id).then(() => { loadData(); notify("Category deleted", "info"); }); } }} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-rose-600 rounded-xl flex items-center justify-center transition-all shadow-sm"><i className="fas fa-trash-alt text-xs"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderDashboardAnalytics = () => {
    const totalViews = listings.reduce((acc, l) => acc + (l.views || 0), 0);
    const approvedListings = listings.filter(l => l.status === ListingStatus.APPROVED).length;
    const pendingListings = listings.filter(l => l.status === ListingStatus.PENDING).length;
    const premiumListings = listings.filter(l => l.isPremium).length;
    const verifiedUsers = users.filter(u => u.isVerified).length;
    const suspendedUsers = users.filter(u => u.isSuspended).length;
    const totalBanners = banners.length;
    const totalBannerViews = banners.reduce((acc, b) => acc + (b.views || 0), 0);

    switch(activeTab) {
      case 'platform_meta':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Identity Base</p>
                <h3 className="text-4xl font-black text-gray-900 leading-tight">{users.length}</h3>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded">+{verifiedUsers} Verified</span>
                  <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded">{suspendedUsers} Suspended</span>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Global Page Views</p>
                <h3 className="text-4xl font-black text-blue-600 leading-tight">{totalViews.toLocaleString()}</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase mt-4">Simulated Traffic Node</p>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Growth Index</p>
                <h3 className="text-4xl font-black leading-tight">84%</h3>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-6 overflow-hidden">
                  <div className="bg-blue-500 h-full w-[84%]"></div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-8">User Role Distribution</h4>
              <div className="space-y-6">
                 {Object.values(UserRole).map(role => {
                    const count = users.filter(u => u.role === role).length;
                    const percent = (count / users.length) * 100;
                    return (
                      <div key={role} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="text-gray-900">{role}</span>
                          <span className="text-gray-400">{count} Entities</span>
                        </div>
                        <div className="w-full bg-gray-50 h-3 rounded-xl overflow-hidden border border-gray-100">
                          <div className={`h-full bg-blue-600 transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                 })}
              </div>
            </div>
          </div>
        );
      case 'inventory_meta':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Live Listings</p>
                <h4 className="text-2xl font-black text-gray-900">{approvedListings}</h4>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Queue Size</p>
                <h4 className="text-2xl font-black text-amber-500">{pendingListings}</h4>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Premium Ratio</p>
                <h4 className="text-2xl font-black text-blue-600">{premiumListings}</h4>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Assets</p>
                <h4 className="text-2xl font-black text-gray-900">{listings.length}</h4>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-8">Banner Ad Analytics</h4>
                <div className="space-y-4">
                  <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase text-emerald-900">Total Banners</p>
                      <p className="text-2xl font-black text-emerald-700">{totalBanners}</p>
                    </div>
                    <i className="fas fa-rectangle-ad text-3xl text-emerald-200"></i>
                  </div>
                  <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase text-blue-900">Sponsorship Reach</p>
                      <p className="text-2xl font-black text-blue-700">{totalBannerViews.toLocaleString()} Views</p>
                    </div>
                    <i className="fas fa-chart-line text-3xl text-blue-200"></i>
                  </div>
                </div>
              </div>
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-8">Inventory Distribution</h4>
                <div className="space-y-5">
                  {categories.map(cat => {
                    const count = listings.filter(l => l.category === cat.name).length;
                    const percent = listings.length > 0 ? (count / listings.length) * 100 : 0;
                    return (
                      <div key={cat.id} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs text-blue-500 border border-gray-100">
                          <i className={`fas ${cat.icon}`}></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-[9px] font-black uppercase mb-1.5">
                            <span>{cat.name}</span>
                            <span>{count}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      case 'system_meta':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-slate-900 p-10 rounded-[3rem] shadow-xl text-white">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Security Health Index</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Total Logs</p>
                      <h4 className="text-3xl font-black">{logs.length}</h4>
                    </div>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[9px] font-black uppercase text-rose-400 mb-2">Critical Events</p>
                      <h4 className="text-3xl font-black text-rose-500">{logs.filter(l => l.severity === 'CRITICAL').length}</h4>
                    </div>
                  </div>
                  <div className="mt-8 p-6 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
                      <i className="fas fa-shield-check"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Protocol Integrity</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Sovereign Layer Secured</p>
                    </div>
                  </div>
               </div>
               <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-8">Platform Capital Flow</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <i className="fas fa-wallet text-blue-500"></i>
                        <span className="text-[10px] font-black uppercase">Total Wallet Balance</span>
                      </div>
                      <span className="text-sm font-black text-gray-900">₹{users.reduce((acc, u) => acc + u.walletBalance, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <i className="fas fa-receipt text-emerald-500"></i>
                        <span className="text-[10px] font-black uppercase">Service Revenue (Sim)</span>
                      </div>
                      <span className="text-sm font-black text-emerald-600">₹{(users.length * 100).toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={() => setActiveMenu('SYSTEM')} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Audit Platform Ledger</button>
               </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center h-full"><i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i></div>;
    
    if (selectedUserId) return renderUserDetail();
    if (selectedListingId) return renderListingDetail();

    if (activeMenu === 'DASHBOARD') return renderDashboardAnalytics();
    if (activeMenu === 'GEO_CATS') return renderGeoCats();
    if (activeMenu === 'REVENUE') return renderRevenue();
    
    // Existing list logic for other menus...
    return <div className="p-20 text-center text-gray-300 uppercase font-black tracking-widest italic">Module interface under initialization...</div>;
  };

  const renderUserDetail = () => {
    if (!detailUser) return null;
    const currentCountryId = STATES.find(s => s.id === detailUser.stateId)?.countryId || '';

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedUserId(null)} className="flex items-center gap-2 text-gray-400 hover:text-blue-600 font-black uppercase text-[10px] tracking-widest transition-all">
            <i className="fas fa-arrow-left"></i> Back to Registry
          </button>
          <button onClick={saveDetailProfile} disabled={isProcessing} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center gap-2">
            {isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Commit All Changes
          </button>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
           <div className="relative group">
              <img src={detailUser.photo} className="w-24 h-24 rounded-[2rem] object-cover ring-4 ring-gray-50 shadow-md" alt="" />
              {detailUser.isVerified && <div className="absolute -top-1 -right-1 bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center border-4 border-white shadow-md"><i className="fas fa-check text-[10px]"></i></div>}
           </div>
           <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-black text-gray-900 leading-none">{detailUser.name}</h3>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter"><i className="fas fa-id-card mr-1.5 text-blue-500"></i> UUID: {detailUser.id}</p>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter"><i className="fas fa-envelope mr-1.5 text-blue-500"></i> {detailUser.email}</p>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter"><i className="fas fa-location-dot mr-1.5 text-rose-500"></i> {CITIES.find(c => c.id === detailUser.cityId)?.name || 'UNSET'}</p>
              </div>
           </div>
           <div className="flex gap-2">
              <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${detailUser.isSuspended ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {detailUser.isSuspended ? 'Suspended' : 'Active Account'}
              </span>
              <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest">
                Ledger: ₹{detailUser.walletBalance.toLocaleString()}
              </span>
           </div>
        </div>

        <div className="flex items-center space-x-2 bg-gray-100/50 p-1.5 rounded-[1.8rem] w-fit border border-gray-100">
           {(['IDENTITY', 'FINANCIAL', 'INVENTORY', 'GEO_ANCHOR'] as UserDetailTab[]).map(tab => (
             <button
               key={tab}
               onClick={() => setActiveUserDetailTab(tab)}
               className={`px-8 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeUserDetailTab === tab ? 'bg-white text-blue-600 shadow-md border border-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
             >
               {tab.replace('_', ' ')}
             </button>
           ))}
        </div>

        <div className="mt-4">
           {activeUserDetailTab === 'IDENTITY' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Identity Nodes</h4>
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Legal Name</label>
                         <input type="text" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailUser.name} onChange={e => setDetailUser({...detailUser, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Access Email</label>
                         <input type="email" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailUser.email} onChange={e => setDetailUser({...detailUser, email: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Contact GSM</label>
                            <input type="text" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailUser.mobile} onChange={e => setDetailUser({...detailUser, mobile: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 ml-1">WhatsApp Tunnel</label>
                            <input type="text" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailUser.whatsapp} onChange={e => setDetailUser({...detailUser, whatsapp: e.target.value})} />
                        </div>
                      </div>
                   </div>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 shadow-xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Governance Overrides</h4>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                            <div>
                                <p className="text-[10px] font-black uppercase">Service Suspension</p>
                                <p className={`text-[8px] font-bold uppercase ${detailUser.isSuspended ? 'text-rose-400' : 'text-emerald-400'}`}>{detailUser.isSuspended ? 'Restricted' : 'Authorized'}</p>
                            </div>
                            <button onClick={() => setDetailUser({...detailUser, isSuspended: !detailUser.isSuspended})} className={`w-12 h-6 rounded-full relative transition-all ${detailUser.isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${detailUser.isSuspended ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderListingDetail = () => {
    if (!detailListing) return null;
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedListingId(null)} className="flex items-center gap-2 text-gray-400 hover:text-blue-600 font-black uppercase text-[10px] tracking-widest transition-all">
            <i className="fas fa-arrow-left"></i> Back to Inventory
          </button>
          <button onClick={handleListingSave} disabled={isProcessing} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">
            {isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Commit Ad Changes
          </button>
        </div>
        {/* Ad details form... */}
      </div>
    );
  };

  const menuItems: { id: MainMenu; icon: string; label: string; hiddenForMod?: boolean }[] = [
    { id: 'DASHBOARD', icon: 'fa-chart-pie', label: 'Command Center' },
    { id: 'USERS', icon: 'fa-users-gear', label: 'User Registry' },
    { id: 'LISTINGS', icon: 'fa-boxes-stacked', label: 'Ad Inventory' },
    { id: 'GEO_CATS', icon: 'fa-map-location-dot', label: 'Geo & Categories' },
    { id: 'REVENUE', icon: 'fa-indian-rupee-sign', label: 'Revenue' },
    { id: 'SYSTEM', icon: 'fa-shield-halved', label: 'System Vault', hiddenForMod: true },
  ];

  const filteredMenu = menuItems.filter(i => user.role === UserRole.ADMIN || !i.hiddenForMod);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-72 h-full bg-white border-r border-gray-100 flex flex-col z-30 shadow-xl shadow-gray-200/50">
        <div className="p-8 border-b border-gray-50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">A</div>
             <span className="text-xl font-black text-gray-900 tracking-tighter">ADOIZ PRO</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredMenu.map(item => (
            <button 
              key={item.id} 
              onClick={() => { setActiveMenu(item.id); setSelectedUserId(null); setSelectedListingId(null); }}
              className={`w-full text-left px-6 py-4 rounded-2xl text-[11px] font-black uppercase transition-all flex items-center ${activeMenu === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <i className={`fas ${item.icon} w-6 mr-3 text-sm`}></i>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-8 border-t border-gray-50 space-y-3">
           <button onClick={onBack} className="w-full py-4 bg-gray-50 text-[10px] font-black uppercase text-gray-500 rounded-xl">Exit Core</button>
           <button onClick={onLogout} className="w-full py-4 bg-rose-50 text-[10px] font-black uppercase text-rose-600 rounded-xl">Logout</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white border-b border-gray-100 p-8 pb-0 z-20">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
               {filteredMenu.find(m => m.id === activeMenu)?.label || activeMenu}
            </h2>
            <div className="flex items-center gap-4">
               <div className="text-right">
                  <p className="text-[10px] font-black text-gray-900 uppercase leading-none">{user.name}</p>
                  <p className="text-[9px] font-bold text-blue-500 uppercase mt-1">{user.role}</p>
               </div>
               <img src={user.photo} className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-50" />
            </div>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto hide-scrollbar pb-2">
            {!selectedUserId && !selectedListingId && getTabsForMenu(activeMenu).map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                className={`flex-shrink-0 px-6 py-3 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 border-b-4 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-10">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};