
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
        { id: 'pending', label: 'Pending Review' }
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
          {gateways.map(gw => (
            <div key={gw.id} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-900">{gw.label} Gateway</h4>
                <button onClick={() => {
                  const updated = { ...config.paymentGateway, [gw.id]: { ...config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']] as any, active: !(config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']] as any).active } };
                  setConfig({ ...config, paymentGateway: updated as any });
                }} className={`w-12 h-6 rounded-full relative transition-all ${(config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']] as any).active ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${(config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']] as any).active ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
              <div className="space-y-4">
                {gw.fields.map(f => (
                  <div key={f} className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">{f.replace(/([A-Z])/g, ' $1')}</label>
                    <input type="text" className="w-full bg-gray-50 border p-3 rounded-xl font-bold text-xs" value={(config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']] as any)[f]} onChange={e => {
                      const updated = { ...config.paymentGateway, [gw.id]: { ...config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']] as any, [f]: e.target.value } };
                      setConfig({ ...config, paymentGateway: updated as any });
                    }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
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
          {/* City Table and Search (Now at the TOP) */}
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

          {/* Geo Creation Suite (Now BELOW the list) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Country Form */}
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

            {/* State Form */}
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

            {/* City Form */}
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
                    const percent = (count / listings.length) * 100;
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

  const renderListingDetail = () => {
    if (!detailListing) return null;
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedListingId(null)} className="flex items-center gap-2 text-gray-400 hover:text-blue-600 font-black uppercase text-[10px] tracking-widest transition-all">
            <i className="fas fa-arrow-left"></i> Back to Inventory
          </button>
          <button onClick={handleListingSave} disabled={isProcessing} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center gap-2">
            {isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Commit Ad Changes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Asset Identity</h4>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Title / Caption</label>
                       <input type="text" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailListing.title} onChange={e => setDetailListing({...detailListing, title: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Asset Description</label>
                       <textarea rows={4} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailListing.description} onChange={e => setDetailListing({...detailListing, description: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Price Index (₹)</label>
                            <input type="number" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailListing.price} onChange={e => setDetailListing({...detailListing, price: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Category Classification</label>
                            <select className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailListing.category} onChange={e => setDetailListing({...detailListing, category: e.target.value})}>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Moderation Status</h4>
                  <div className="space-y-4">
                     {Object.values(ListingStatus).map(status => (
                        <button 
                          key={status}
                          onClick={() => setDetailListing({...detailListing, status})}
                          className={`w-full p-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${detailListing.status === status ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white'}`}
                        >
                           {status}
                        </button>
                     ))}
                  </div>
              </div>
              <div className="bg-rose-50 p-8 rounded-[3rem] border border-rose-100 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Hazardous Operations</h4>
                  <button onClick={() => handleListingDelete(detailListing.id)} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-100">Permanently Terminate Asset</button>
              </div>
           </div>
        </div>
      </div>
    );
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
          <button onClick={saveDetailProfile} disabled={isProcessing} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center gap-2 disabled:opacity-50">
            {isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Commit All Changes
          </button>
        </div>

        {/* User Profile Header */}
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

        {/* Modular Navigation Tabs */}
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

        {/* Tab Content Rendering */}
        <div className="mt-4 animate-in fade-in zoom-in-95 duration-300">
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
                      <div className="space-y-1">
                         <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Postal Address</label>
                         <textarea rows={2} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all resize-none" value={detailUser.address || ''} onChange={e => setDetailUser({...detailUser, address: e.target.value})} />
                      </div>
                   </div>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 shadow-xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Governance Overrides</h4>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                            <div>
                                <p className="text-[10px] font-black uppercase">Service Suspension</p>
                                <p className={`text-[8px] font-bold uppercase ${detailUser.isSuspended ? 'text-rose-400' : 'text-emerald-400'}`}>{detailUser.isSuspended ? 'Restricted Entity' : 'Authorized Entity'}</p>
                            </div>
                            <button onClick={() => { setDetailUser({...detailUser, isSuspended: !detailUser.isSuspended}); notify("Suspension state toggled locally. Commit to save.", "info"); }} className={`w-12 h-6 rounded-full relative transition-all shadow-inner ${detailUser.isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${detailUser.isSuspended ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                            <div>
                                <p className="text-[10px] font-black uppercase">Professional Verification</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Verification Badge Activation</p>
                            </div>
                            <button onClick={() => { setDetailUser({...detailUser, isVerified: !detailUser.isVerified}); notify("Verification state toggled locally. Commit to save.", "info"); }} className={`w-12 h-6 rounded-full relative transition-all ${detailUser.isVerified ? 'bg-blue-500' : 'bg-slate-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${detailUser.isVerified ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                            <div>
                                <p className="text-[10px] font-black uppercase">Account Access Level</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">System Authorization Role</p>
                            </div>
                            <select 
                              value={detailUser.role}
                              onChange={(e) => {
                                const newRole = e.target.value as UserRole;
                                setDetailUser({...detailUser, role: newRole});
                                notify("Account level updated locally. Commit to save.", "info");
                              }}
                              className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none text-white cursor-pointer"
                            >
                              <option value={UserRole.USER} className="bg-slate-900">User</option>
                              <option value={UserRole.MODERATOR} className="bg-slate-900">Moderator</option>
                              <option value={UserRole.ADMIN} className="bg-slate-900">Admin</option>
                            </select>
                        </div>
                    </div>
                </div>
             </div>
           )}

           {activeUserDetailTab === 'FINANCIAL' && (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 bg-blue-50 p-8 rounded-[3rem] border border-blue-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-end">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Capital Ledger</h4>
                        <p className="text-2xl font-black text-blue-600 leading-none">₹{detailUser.walletBalance.toLocaleString()}</p>
                    </div>
                    <form onSubmit={handleWalletAdjustment} className="space-y-4">
                        <div className="flex gap-2 p-1 bg-white rounded-xl border border-blue-100">
                            <button type="button" onClick={() => setWalletForm({...walletForm, type: 'CREDIT'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${walletForm.type === 'CREDIT' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400'}`}>Credit</button>
                            <button type="button" onClick={() => setWalletForm({...walletForm, type: 'DEBIT'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${walletForm.type === 'DEBIT' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'text-gray-400'}`}>Debit</button>
                        </div>
                        <input type="number" placeholder="Adjustment Amount" className="w-full bg-white border border-blue-100 p-4 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={walletForm.amount} onChange={e => setWalletForm({...walletForm, amount: e.target.value})} />
                        <input type="text" placeholder="Audit Reason" className="w-full bg-white border border-blue-100 p-4 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/20" value={walletForm.reason} onChange={e => setWalletForm({...walletForm, reason: e.target.value})} />
                        <button type="submit" disabled={isProcessing} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2">
                           {isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-coins"></i>} Apply Ledger Update
                        </button>
                    </form>
                </div>
                <div className="lg:col-span-8 bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="font-black text-gray-900 uppercase text-[10px] tracking-widest">Transaction History</h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white border-b border-gray-50 z-10">
                                <tr className="text-[8px] font-black uppercase text-gray-400">
                                    <th className="px-8 py-3">Timestamp</th>
                                    <th className="px-8 py-3">Descriptor</th>
                                    <th className="px-8 py-3 text-right">Value Delta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {detailTxns.map(tx => (
                                <tr key={tx.id} className="text-[10px] hover:bg-gray-50/30">
                                    <td className="px-8 py-4 font-bold text-gray-400">{new Date(tx.timestamp).toLocaleString()}</td>
                                    <td className="px-8 py-4 font-black text-gray-900 uppercase tracking-tighter truncate max-w-[200px]">{tx.description}</td>
                                    <td className={`px-8 py-4 text-right font-black ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {tx.type === 'CREDIT' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                                    </td>
                                </tr>
                                ))}
                                {detailTxns.length === 0 && (
                                    <tr><td colSpan={3} className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest italic">No transactions indexed.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
           )}

           {activeUserDetailTab === 'INVENTORY' && (
             <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                   <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Listing Catalog</h3>
                   <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase border border-blue-100">{detailAds.length} Items</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                   {detailAds.map(ad => (
                     <div key={ad.id} className="flex flex-col bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden hover:bg-white hover:shadow-xl transition-all group">
                        <div className="relative aspect-video">
                           <img src={ad.images[0]} className="w-full h-full object-cover" alt="" />
                           <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-[7px] font-black uppercase text-white shadow-lg ${ad.status === ListingStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-500'}`}>
                              {ad.status}
                           </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                           <div>
                              <h5 className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">{ad.title}</h5>
                              <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">₹{ad.price.toLocaleString()} • {ad.category}</p>
                           </div>
                           <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest"><i className="fas fa-eye mr-1"></i> {ad.views} Views</p>
                              <div className="flex gap-2">
                                <button onClick={() => setSelectedListingId(ad.id)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition-all"><i className="fas fa-pen text-[10px]"></i></button>
                                <button onClick={() => {
                                  const nextStatus = ad.status === ListingStatus.DISABLED ? ListingStatus.APPROVED : ListingStatus.DISABLED;
                                  dbService.adminToggleListingStatus(ad.id, nextStatus, user.id).then(() => {
                                    loadUserDetails(detailUser.id);
                                    notify(`Ad status updated to ${nextStatus}`, "info");
                                  });
                                }} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${ad.status === ListingStatus.DISABLED ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                  <i className={`fas ${ad.status === ListingStatus.DISABLED ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))}
                   {detailAds.length === 0 && <div className="col-span-full py-20 text-center text-gray-300 uppercase font-black tracking-widest italic text-sm">No inventory indexed.</div>}
                </div>
             </div>
           )}

           {activeUserDetailTab === 'GEO_ANCHOR' && (
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-xl shadow-inner shadow-rose-100/50">
                        <i className="fas fa-map-pin"></i>
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Jurisdictional Node Settings</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Anchor entity to specific geographical nodes</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Country Node</label>
                        <select className="w-full bg-gray-50 border border-gray-100 p-5 rounded-2xl font-bold text-sm outline-none focus:bg-white transition-all" value={currentCountryId} onChange={e => handleDetailGeoChange('COUNTRY', e.target.value)}>
                            <option value="">Select Sovereign Node</option>
                            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Territory / State</label>
                        <select className="w-full bg-gray-50 border border-gray-100 p-5 rounded-2xl font-bold text-sm outline-none focus:bg-white transition-all" value={detailUser.stateId} onChange={e => handleDetailGeoChange('STATE', e.target.value)}>
                            <option value="">Select State</option>
                            {detailStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Primary Operational Hub (City)</label>
                        <select className="w-full bg-gray-50 border border-gray-100 p-5 rounded-2xl font-bold text-sm outline-none focus:bg-white transition-all" value={detailUser.cityId} onChange={e => { setDetailUser({...detailUser, cityId: e.target.value}); notify("Location changed locally. Commit to save.", "info"); }}>
                            <option value="">Select City</option>
                            {detailCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center h-full"><i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i></div>;
    
    if (selectedUserId) return renderUserDetail();
    if (selectedListingId) return renderListingDetail();

    if (activeMenu === 'DASHBOARD') {
       return renderDashboardAnalytics();
    }

    if (activeMenu === 'GEO_CATS') {
      return renderGeoCats();
    }

    if (activeMenu === 'REVENUE') {
      return renderRevenue();
    }

    switch(activeMenu) {
      case 'USERS':
        return (
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm animate-in fade-in">
            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/30">
              <h3 className="font-black text-gray-900 uppercase text-xs">Entity Registry</h3>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                  <input type="text" placeholder="Filter identities..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-6 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                </div>
                <select 
                  value={userFilterRole} 
                  onChange={e => setUserFilterRole(e.target.value)} 
                  className="bg-white border border-gray-200 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer shadow-sm"
                >
                  <option value="ALL">Account Type: All</option>
                  <option value={UserRole.USER}>User</option>
                  <option value={UserRole.MODERATOR}>Moderator</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50">
                    <th className="px-8 py-5">Profile</th>
                    <th className="px-8 py-5">Communication</th>
                    <th className="px-8 py-5">Account Level</th>
                    <th className="px-8 py-5">Financial Node</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.filter(u => 
                    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
                    (userFilterRole === 'ALL' || u.role === userFilterRole)
                  ).map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <img src={u.photo} className="w-10 h-10 rounded-xl object-cover" />
                          <div>
                            <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">{u.name}{u.isVerified && <i className="fas fa-check-circle text-blue-500 text-[8px]"></i>}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">ID: {u.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <p className="text-[10px] font-bold text-gray-900">{u.email}</p>
                         <p className="text-[10px] font-bold text-gray-400 mt-1">{u.mobile || 'NO PHONE'}</p>
                      </td>
                      <td className="px-8 py-5">
                        <select 
                          value={u.role}
                          onChange={(e) => handleUserRoleChange(u.id, e.target.value as UserRole)}
                          className={`bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none transition-all ${
                            u.role === UserRole.ADMIN ? 'text-rose-600 bg-rose-50 border-rose-100' :
                            u.role === UserRole.MODERATOR ? 'text-blue-600 bg-blue-50 border-blue-100' :
                            'text-gray-600'
                          }`}
                        >
                          <option value={UserRole.USER}>User</option>
                          <option value={UserRole.MODERATOR}>Moderator</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                      </td>
                      <td className="px-8 py-5"><p className="text-xs font-black text-blue-600">₹{u.walletBalance.toLocaleString()}</p></td>
                      <td className="px-8 py-5 text-right">
                         <button onClick={() => setSelectedUserId(u.id)} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg">Manage</button>
                      </td>
                    </tr>
                  ))}
                  {users.filter(u => 
                    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
                    (userFilterRole === 'ALL' || u.role === userFilterRole)
                  ).length === 0 && (
                    <tr><td colSpan={5} className="py-20 text-center text-[10px] font-black uppercase text-gray-300 italic tracking-widest">No entities matching indexed parameters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'LISTINGS':
        const filteredListings = listings.filter(l => {
          const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              l.sellerId.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus = listingFilterStatus === 'ALL' || l.status === listingFilterStatus;
          const matchesCategory = listingFilterCategory === 'ALL' || l.category === listingFilterCategory;
          return matchesSearch && matchesStatus && matchesCategory;
        });

        if (activeTab === 'pending') {
          const pendingListings = listings.filter(l => l.status === ListingStatus.PENDING || l.status === ListingStatus.EDIT_PENDING);
          return (
            <div className="space-y-6 animate-in fade-in">
              {pendingListings.length === 0 ? (
                <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-check"></i>
                  </div>
                  <h3 className="text-lg font-black uppercase text-gray-900">Review Queue Empty</h3>
                  <p className="text-xs text-gray-400 mt-1">All inventory assets have been processed.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingListings.map(l => (
                    <div key={l.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex gap-6 shadow-sm hover:shadow-xl transition-all">
                       <img src={l.images[0]} className="w-32 h-32 rounded-2xl object-cover flex-shrink-0" />
                       <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                             <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${l.status === ListingStatus.EDIT_PENDING ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>{l.status}</span>
                             <h4 className="text-sm font-black text-gray-900 truncate mt-1">{l.title}</h4>
                             <p className="text-xs font-black text-blue-600">₹{l.price.toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2 pt-4">
                             <button onClick={() => { dbService.updateListingStatus(l.id, ListingStatus.APPROVED, undefined, user.id); loadData(); notify("Ad Approved!", "success"); }} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100">Approve</button>
                             <button onClick={() => { const reason = window.prompt("Rejection Reason?"); if (reason) { dbService.updateListingStatus(l.id, ListingStatus.REJECTED, reason, user.id); loadData(); notify("Ad Rejected.", "error"); } }} className="flex-1 bg-white border border-rose-100 text-rose-600 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest">Reject</button>
                             <button onClick={() => setSelectedListingId(l.id)} className="w-9 h-9 flex-shrink-0 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 transition-all flex items-center justify-center"><i className="fas fa-expand text-[10px]"></i></button>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-6 animate-in fade-in">
            {/* Filter Suite */}
            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
               <div className="relative flex-1">
                  <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                  <input type="text" placeholder="Search Title, Seller ID, or SKU..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all" />
               </div>
               <div className="flex gap-4 w-full md:w-auto">
                  <select value={listingFilterStatus} onChange={e => setListingFilterStatus(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[9px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer">
                     <option value="ALL">Status: All</option>
                     {Object.values(ListingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={listingFilterCategory} onChange={e => setListingFilterCategory(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[9px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer">
                     <option value="ALL">Category: All</option>
                     {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50">
                           <th className="px-10 py-6">Asset Profile</th>
                           <th className="px-10 py-6">Origin Node</th>
                           <th className="px-10 py-6">Financials</th>
                           <th className="px-10 py-6">Status</th>
                           <th className="px-10 py-6 text-right">Operations</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {filteredListings.map(l => (
                           <tr key={l.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-4">
                                    <img src={l.images[0]} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                                    <div className="min-w-0">
                                       <p className="text-xs font-black text-gray-900 truncate max-w-[180px]">{l.title}</p>
                                       <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{l.category}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <p className="text-[10px] font-black text-gray-900">{CITIES.find(c => c.id === l.cityId)?.name || 'UNSET'}</p>
                                 <p className="text-[9px] text-gray-400 font-bold tracking-tighter">ID: {l.id}</p>
                              </td>
                              <td className="px-10 py-6">
                                 <p className="text-[11px] font-black text-blue-600">₹{l.price.toLocaleString()}</p>
                                 <p className="text-[9px] font-bold text-gray-400 uppercase">{l.views} Views</p>
                              </td>
                              <td className="px-10 py-6">
                                 <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                    l.status === ListingStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    l.status === ListingStatus.PENDING ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                    l.status === ListingStatus.REJECTED ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                    'bg-gray-100 text-gray-400 border border-gray-200'
                                 }`}>
                                    {l.status}
                                 </span>
                              </td>
                              <td className="px-10 py-6 text-right">
                                 <div className="flex justify-end gap-2">
                                    <button onClick={() => setSelectedListingId(l.id)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-blue-100 shadow-sm flex items-center justify-center"><i className="fas fa-pen text-xs"></i></button>
                                    <button onClick={() => handleListingDelete(l.id)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all border border-transparent border-rose-100 shadow-sm flex items-center justify-center"><i className="fas fa-trash-alt text-xs"></i></button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                        {filteredListings.length === 0 && (
                           <tr><td colSpan={5} className="py-24 text-center text-[10px] font-black uppercase text-gray-300 italic tracking-widest">No assets matching criteria.</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        );
      case 'SYSTEM':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
               <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Platform Core Identity</h4>
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-gray-400">Site Title</label>
                     <input type="text" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.siteName} onChange={e => setConfig({...config, siteName: e.target.value})} />
                  </div>
                  <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-amber-900 uppercase">Maintenance Mode</p>
                        <p className="text-[8px] font-bold text-amber-600 uppercase">Global Lock</p>
                     </div>
                     <button onClick={() => { setConfig({...config, maintenanceMode: !config.maintenanceMode}); notify("Maintenance mode toggled.", "info"); }} className={`w-12 h-6 rounded-full relative transition-all ${config.maintenanceMode ? 'bg-amber-500' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.maintenanceMode ? 'left-7' : 'left-1'}`}></div>
                     </button>
                  </div>
               </div>
               <button onClick={() => { dbService.updateSystemConfig(config); notify("System variables updated.", "success"); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Commit Platform Variable Changes</button>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
               <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-6">Security Logs</h4>
               <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-3">
                 {logs.slice(0, 10).map(log => (
                   <div key={log.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-[9px]">
                     <div className="flex justify-between items-start mb-1">
                       <span className="font-black uppercase text-blue-600">{log.action}</span>
                       <span className="text-gray-400 font-bold">{new Date(log.timestamp).toLocaleString()}</span>
                     </div>
                     <p className="text-gray-600 italic">"{log.details}"</p>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        );
      default:
        return <div className="p-20 text-center text-gray-300 uppercase font-black tracking-widest italic">Module interface under initialization...</div>;
    }
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
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">A</div>
             <span className="text-xl font-black text-gray-900 tracking-tighter">ADOIZ PRO</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {filteredMenu.map(item => (
            <button 
              key={item.id} 
              onClick={() => { setActiveMenu(item.id); setSelectedUserId(null); setSelectedListingId(null); }}
              className={`w-full text-left px-6 py-4 rounded-2xl text-[11px] font-black uppercase transition-all flex items-center group ${activeMenu === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <i className={`fas ${item.icon} w-6 mr-3 text-sm ${activeMenu === item.id ? 'text-white' : 'text-gray-400 group-hover:text-blue-500'}`}></i>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-8 border-t border-gray-50 space-y-3">
           <button onClick={onBack} className="w-full py-4 bg-gray-50 text-[10px] font-black uppercase text-gray-500 rounded-xl hover:bg-gray-100 transition-all border border-gray-100">Exit Core</button>
           <button onClick={onLogout} className="w-full py-4 bg-rose-50 text-[10px] font-black uppercase text-rose-600 rounded-xl hover:bg-rose-100 transition-all border border-rose-100">Logout</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white border-b border-gray-100 p-8 pb-0 z-20">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
               {selectedUserId ? 'Entity Detail Console' : 
                selectedListingId ? 'Inventory Asset Console' : 
                (filteredMenu.find(m => m.id === activeMenu)?.label || activeMenu)}
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
                className={`flex-shrink-0 px-6 py-3 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 border-b-4 border-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};
