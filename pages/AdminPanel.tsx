import React, { useState, useEffect, useMemo, useRef } from 'react';
import { dbService } from '../services/dbService';
import { 
  User, UserRole, Listing, ListingStatus, WalletTransaction, 
  SystemConfig, City, State, Country, Category, BannerAd, UserStatus,
  Rating
} from '../types';
import { CITIES, STATES } from '../constants';

type MainMenu = 
  | 'DASHBOARD' | 'GEO' | 'USERS' | 'LISTINGS' | 'BANNERS' 
  | 'PRICING' | 'PAYMENTS' | 'COMMUNICATIONS' | 'FEATURES' | 'SYSTEM'
  | 'GEO_CATS' | 'REVENUE';

type UserDetailTab = 'IDENTITY' | 'FINANCIAL' | 'INVENTORY' | 'GEO_ANCHOR' | 'RATINGS';

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
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [cityFilterCountryId, setCityFilterCountryId] = useState('');
  const [cityFilterStateId, setCityFilterStateId] = useState('');
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
  const [detailRatings, setDetailRatings] = useState<Rating[]>([]);
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

  // Resource Link Form State
  const [newResource, setNewResource] = useState({ label: '', url: '', content: '' });

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
    const [u, ads, txns, rtgs] = await Promise.all([
      dbService.getUserById(id),
      dbService.getListingsBySeller(id),
      dbService.getTransactionsByUserId(id),
      dbService.getRatingsForUser(id)
    ]);
    
    if (u) {
      setDetailUser(u);
      setDetailAds(ads);
      setDetailTxns(txns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setDetailRatings(rtgs);
      
      if (u.stateId) {
        const state = STATES.find(s => s.id === u.stateId);
        if (state) {
          setDetailStates(dbService.getStates(state.countryId));
          setDetailCities(dbService.getCities(u.stateId));
        }
      } else {
        setDetailStates([]);
        setDetailCities([]);
      }
    }
    setIsProcessing(false);
  };

  const handleRatingDelete = async (ratingId: string) => {
    if (!window.confirm("Permanently delete this review? This will also affect the seller's average rating.")) return;
    setIsProcessing(true);
    try {
      await dbService.adminDeleteRating(ratingId, user.id);
      notify("Rating removed.", "info");
      if (selectedUserId) await loadUserDetails(selectedUserId);
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRatingEdit = async (ratingId: string) => {
    const newComment = window.prompt("Enter new review text:");
    if (newComment === null) return;
    setIsProcessing(true);
    try {
      await dbService.adminUpdateRating(ratingId, { comment: newComment }, user.id);
      notify("Rating updated.", "success");
      if (selectedUserId) await loadUserDetails(selectedUserId);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
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

  const handleConfigLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, path: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (path === 'logoUrl') {
        setConfig(prev => ({ ...prev, logoUrl: dataUrl }));
      } else if (path === 'branding.pwaIcon') {
        setConfig(prev => ({ ...prev, branding: { ...prev.branding, pwaIcon: dataUrl } }));
      }
    };
    reader.readAsDataURL(file);
  };

  const addResourceLink = () => {
    if (!newResource.label || !newResource.url) return;
    const updatedLinks = [...(config.branding.resourceLinks || []), { ...newResource }];
    setConfig({ ...config, branding: { ...config.branding, resourceLinks: updatedLinks } });
    setNewResource({ label: '', url: '', content: '' });
    notify("Resource link added to local state.", "info");
  };

  const removeResourceLink = (index: number) => {
    const updatedLinks = (config.branding.resourceLinks || []).filter((_, i) => i !== index);
    setConfig({ ...config, branding: { ...config.branding, resourceLinks: updatedLinks } });
    notify("Resource link removed from local state.", "info");
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
      case 'GEO_CATS': return [
        { id: 'location_mgmt', label: 'Location' },
        { id: 'category_mgmt', label: 'Category' }
      ];
      case 'USERS': return [
        { id: 'all-users', label: 'All Users' },
        { id: 'verification', label: 'Verification Queue' }
      ];
      case 'LISTINGS': return [
        { id: 'master', label: 'Master Inventory' },
        { id: 'pending', label: 'Pending Review' }
      ];
      case 'SYSTEM': return [
        { id: 'site', label: 'Site Branding' },
        { id: 'gateways_sys', label: 'Payment & API' },
        { id: 'logs', label: 'Security Logs' }
      ];
      default: return [{ id: 'default', label: 'Management' }];
    }
  }

  const renderDashboard = () => {
    const stats = [
      { label: 'Total Volume', value: users.length, icon: 'fa-users', color: 'bg-blue-500' },
      { label: 'Inventory Size', value: listings.length, icon: 'fa-box', color: 'bg-emerald-500' },
      { label: 'Active Campaigns', value: banners.filter(b => b.status === 'LIVE').length, icon: 'fa-rectangle-ad', color: 'bg-purple-500' },
      { label: 'Global Liquidity', value: `₹${users.reduce((acc, u) => acc + (u.walletBalance || 0), 0).toLocaleString()}`, icon: 'fa-wallet', color: 'bg-amber-500' }
    ];

    if (activeTab === 'platform_meta') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {stats.map(s => (
              <div key={s.label} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-24 h-24 ${s.color} rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${s.color} text-white flex items-center justify-center text-xl shadow-lg shadow-${s.color.split('-')[1]}-100`}>
                    <i className={`fas ${s.icon}`}></i>
                  </div>
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{s.label}</h4>
                </div>
                <p className="text-3xl font-black text-gray-900 tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-8">System Throughput (Last 24h)</h4>
                <div className="h-64 flex items-end justify-between gap-2">
                   {[40, 65, 30, 85, 45, 90, 70, 55, 35, 60, 50, 80].map((h, i) => (
                      <div key={i} className="w-full bg-gray-50 rounded-t-xl group relative">
                         <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-xl transition-all group-hover:bg-blue-600" style={{ height: `${h}%` }}></div>
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{h}% Load</div>
                      </div>
                   ))}
                </div>
             </div>
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Live Traffic Nodes</h4>
                   <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                   </span>
                </div>
                <div className="space-y-6">
                   {['Mumbai', 'Pune', 'Bangalore', 'Delhi'].map((c, i) => (
                      <div key={c} className="flex items-center gap-4">
                         <span className="w-8 text-[10px] font-black text-gray-400 uppercase">0{i+1}</span>
                         <div className="flex-1">
                            <div className="flex justify-between text-[10px] font-black uppercase mb-2"><span>{c}</span><span className="text-blue-600">82% Intensity</span></div>
                            <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-500 rounded-full" style={{ width: `${80 - (i*10)}%` }}></div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'inventory_meta') {
      const premiumCount = listings.filter(l => l.isPremium).length;
      const standardCount = listings.length - premiumCount;
      
      const catStats = categories.map(cat => ({
        name: cat.name,
        count: listings.filter(l => l.category === cat.name).length
      })).sort((a,b) => b.count - a.count);

      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-8">Inventory Logic Mix</h4>
                <div className="space-y-8">
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Premium Assets</p>
                         <p className="text-4xl font-black text-amber-500">{premiumCount}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Standard Assets</p>
                         <p className="text-4xl font-black text-slate-900">{standardCount}</p>
                      </div>
                   </div>
                   <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-amber-500" style={{ width: `${(premiumCount/listings.length)*100}%` }}></div>
                      <div className="h-full bg-slate-900" style={{ width: `${(standardCount/listings.length)*100}%` }}></div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-[10px] font-black uppercase text-gray-500">Premium Yield</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-900"></div><span className="text-[10px] font-black uppercase text-gray-500">Organic Growth</span></div>
                   </div>
                </div>
             </div>
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-8">Segment Distribution</h4>
                <div className="space-y-4">
                   {catStats.slice(0, 5).map(cat => (
                      <div key={cat.name} className="flex items-center justify-between">
                         <span className="text-[11px] font-black uppercase text-gray-900">{cat.name}</span>
                         <div className="flex-1 mx-4 h-1 bg-gray-50 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${(cat.count/listings.length)*100}%` }}></div>
                         </div>
                         <span className="text-[11px] font-black text-gray-400">{cat.count}</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-8">Asset Heatmap by City Node</h4>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {CITIES.map(city => {
                   const count = listings.filter(l => l.cityId === city.id).length;
                   return (
                      <div key={city.id} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex justify-between items-center">
                         <div>
                            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{city.name}</p>
                            <p className="text-xl font-black text-gray-900">{count}</p>
                         </div>
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${count > 5 ? 'bg-blue-600' : 'bg-gray-300'}`}>
                            <i className="fas fa-map-pin"></i>
                         </div>
                      </div>
                   );
                })}
             </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'system_meta') {
      const systemHealth = [
        { label: 'Real-time Uptime', value: '99.98%', color: 'text-emerald-500' },
        { label: 'API Latency', value: '42ms', color: 'text-blue-500' },
        { label: 'DB Connections', value: 'Active', color: 'text-emerald-500' },
        { label: 'Cache Hit Rate', value: '86%', color: 'text-purple-500' }
      ];

      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             {systemHealth.map(s => (
                <div key={s.label} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                   <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-2">{s.label}</p>
                   <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                </div>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
             <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Operational Resource Allocation</h4>
                   <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Global Snapshot</span>
                </div>
                <div className="space-y-8">
                   {[
                      { label: 'CPU Cluster Use', val: 34, color: 'bg-blue-500' },
                      { label: 'Memory Persistence', val: 56, color: 'bg-emerald-500' },
                      { label: 'Network Bandwidth', val: 28, color: 'bg-purple-500' }
                   ].map(r => (
                      <div key={r.label} className="space-y-2">
                         <div className="flex justify-between text-[10px] font-black uppercase">
                            <span className="text-gray-400">{r.label}</span>
                            <span className="text-gray-900">{r.val}% Capacity</span>
                         </div>
                         <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                            <div className={`h-full ${r.color} transition-all duration-1000`} style={{ width: `${r.val}%` }}></div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
             <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-8">Active Logic Toggles</h4>
                <div className="space-y-4">
                   {Object.entries(config.featureToggles).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between border-b border-white/5 pb-3">
                         <span className="text-[10px] font-black text-white/60 uppercase">{k.replace(/([A-Z])/g, ' $1')}</span>
                         <span className={`w-3 h-3 rounded-full ${v ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-rose-500'}`}></span>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderUserDetailInline = () => {
    if (!detailUser) return null;

    return (
      <div className="bg-white w-full rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[600px] animate-in fade-in">
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
             <div className="flex items-center gap-6">
                <img src={detailUser.photo} className="w-16 h-16 rounded-[1.5rem] object-cover border-4 border-white shadow-xl" />
                <div>
                   <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{detailUser.name}</h3>
                   <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Entity ID: {detailUser.id}</p>
                </div>
             </div>
             <button onClick={() => setSelectedUserId(null)} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-200">
                <i className="fas fa-arrow-left"></i> Back to Registry
             </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
             <div className="w-full border-b border-gray-100 bg-gray-50/30 p-4 flex flex-row gap-2 overflow-x-auto hide-scrollbar">
                {[
                  { id: 'IDENTITY', label: 'Identity & Auth', icon: 'fa-id-card' },
                  { id: 'FINANCIAL', label: 'Financial Ledger', icon: 'fa-wallet' },
                  { id: 'INVENTORY', label: 'User Assets', icon: 'fa-box' },
                  { id: 'GEO_ANCHOR', label: 'Geo Anchoring', icon: 'fa-map-location' },
                  { id: 'RATINGS', label: 'Reviews & Feedback', icon: 'fa-star' }
                ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveUserDetailTab(tab.id as any)} 
                    className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeUserDetailTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-gray-400 hover:bg-white hover:text-gray-900'}`}
                  >
                     <i className={`fas ${tab.icon} w-4`}></i> {tab.label}
                  </button>
                ))}
             </div>

             <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                {activeUserDetailTab === 'IDENTITY' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Legal Label</label><input type="text" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={detailUser.name} onChange={e => setDetailUser({...detailUser, name: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Electronic Mail</label><input type="email" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={detailUser.email} onChange={e => setDetailUser({...detailUser, email: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Contact Number</label><input type="text" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={detailUser.mobile || ''} onChange={e => setDetailUser({...detailUser, mobile: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">WhatsApp Number</label><input type="text" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={detailUser.whatsapp || ''} onChange={e => setDetailUser({...detailUser, whatsapp: e.target.value})} /></div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Operational Role</label>
                           <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={detailUser.role} onChange={e => handleUserRoleChange(detailUser.id, e.target.value as any)}>
                              <option value={UserRole.USER}>Standard User</option>
                              <option value={UserRole.MODERATOR}>City Moderator</option>
                              <option value={UserRole.ADMIN}>Platform Administrator</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Entity Protocol</label>
                           <div className="flex gap-4">
                              <button onClick={() => setDetailUser({...detailUser, isVerified: !detailUser.isVerified})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${detailUser.isVerified ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>Verified Badge</button>
                              <button onClick={() => setDetailUser({...detailUser, isSuspended: !detailUser.isSuspended})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${detailUser.isSuspended ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>Suspension Node</button>
                           </div>
                        </div>
                     </div>
                     <button onClick={saveDetailProfile} disabled={isProcessing} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Commit Identity Logic</button>
                  </div>
                )}

                {activeUserDetailTab === 'FINANCIAL' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                     <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Available Liquidity</p>
                           <h4 className="text-4xl font-black">₹{detailUser.walletBalance.toLocaleString()}</h4>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Last Transaction</p>
                           <p className="text-xs font-bold text-slate-400">{detailTxns[0]?.timestamp ? new Date(detailTxns[0].timestamp).toLocaleString() : 'No data'}</p>
                        </div>
                     </div>

                     <form onSubmit={handleWalletAdjustment} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">Manual Capital Adjustment</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Quantum (₹)</label><input required type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={walletForm.amount} onChange={e => setWalletForm({...walletForm, amount: e.target.value})} /></div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-gray-400">Direction</label>
                              <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={walletForm.type} onChange={e => setWalletForm({...walletForm, type: e.target.value as any})}>
                                 <option value="CREDIT">Inbound (Credit)</option>
                                 <option value="DEBIT">Outbound (Debit)</option>
                              </select>
                           </div>
                           <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Protocol Reason</label><input required type="text" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={walletForm.reason} onChange={e => setWalletForm({...walletForm, reason: e.target.value})} placeholder="Admin correction..." /></div>
                        </div>
                        <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100">Execute Capital Operation</button>
                     </form>

                     <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Transaction History</h5>
                        <div className="bg-white rounded-[2.5rem] border border-gray-50 overflow-hidden shadow-sm">
                           <table className="w-full text-left">
                              <thead className="bg-gray-50/50">
                                 <tr className="text-[9px] font-black uppercase text-gray-400">
                                    <th className="px-8 py-4">Timestamp</th>
                                    <th className="px-8 py-4">Descriptor</th>
                                    <th className="px-8 py-4 text-right">Value</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                 {detailTxns.map(tx => (
                                    <tr key={tx.id} className="text-[11px] font-bold">
                                       <td className="px-8 py-4 text-gray-400">{new Date(tx.timestamp).toLocaleString()}</td>
                                       <td className="px-8 py-4 text-gray-900 uppercase">{tx.description}</td>
                                       <td className={`px-8 py-4 text-right ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.type === 'CREDIT' ? '+' : '-'} ₹{tx.amount.toLocaleString()}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
                )}

                {activeUserDetailTab === 'INVENTORY' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {detailAds.map(ad => (
                          <div key={ad.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex gap-6 group">
                             <img src={ad.images[0]} className="w-24 h-24 rounded-2xl object-cover" />
                             <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                   <h5 className="font-black text-gray-900 uppercase text-xs line-clamp-1">{ad.title}</h5>
                                   <p className="text-blue-600 font-black text-sm mt-1">₹{ad.price.toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2">
                                   <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${ad.status === ListingStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{ad.status}</span>
                                   <button onClick={() => { setSelectedListingId(ad.id); }} className="text-gray-400 hover:text-blue-600 ml-auto transition-colors"><i className="fas fa-cog"></i></button>
                                </div>
                             </div>
                          </div>
                        ))}
                        {detailAds.length === 0 && (
                          <div className="col-span-2 text-center py-20 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                             <i className="fas fa-box-open text-gray-200 text-4xl mb-4"></i>
                             <p className="text-[10px] font-black uppercase text-gray-400">Inventory Empty</p>
                          </div>
                        )}
                     </div>
                  </div>
                )}

                {activeUserDetailTab === 'GEO_ANCHOR' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Country Node</label>
                           <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={countries.find(c => detailStates.some(s => s.countryId === c.id))?.id || ''} onChange={e => handleDetailGeoChange('COUNTRY', e.target.value)}>
                              <option value="">Select Domain</option>
                              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-1">State Logic</label>
                           <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={detailUser.stateId} onChange={e => handleDetailGeoChange('STATE', e.target.value)}>
                              <option value="">Select Module</option>
                              {detailStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-1">City Anchor</label>
                           <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={detailUser.cityId} onChange={e => setDetailUser({...detailUser, cityId: e.target.value})}>
                              <option value="">Select Segment</option>
                              {detailCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Manual Address String</label>
                        <textarea rows={4} className="w-full bg-gray-50 border p-6 rounded-3xl font-bold" value={detailUser.address} onChange={e => setDetailUser({...detailUser, address: e.target.value})} />
                     </div>
                     <button onClick={saveDetailProfile} disabled={isProcessing} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Commit Geo Logic</button>
                  </div>
                )}

                {activeUserDetailTab === 'RATINGS' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-10">
                    <div className="flex justify-between items-center px-2">
                      <div>
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Feedback Record Management</h5>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Average: {detailUser.averageRating || 0} Stars ({detailUser.ratingCount || 0} reviews)</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {detailRatings.map(rating => (
                        <div key={rating.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 group">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-black text-xs">
                                {rating.fromUserName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase text-gray-900">{rating.fromUserName}</p>
                                <div className="flex text-[8px] text-yellow-400 mt-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <i key={i} className={`fas fa-star ${i < rating.score ? 'text-yellow-400' : 'text-gray-200'}`}></i>
                                  ))}
                                  <span className="ml-2 text-gray-400 font-bold">{new Date(rating.timestamp).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleRatingEdit(rating.id)}
                                className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                title="Edit Comment"
                              >
                                <i className="fas fa-pen text-[10px]"></i>
                              </button>
                              <button 
                                onClick={() => handleRatingDelete(rating.id)}
                                className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                title="Delete Rating"
                              >
                                <i className="fas fa-trash-alt text-[10px]"></i>
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 italic px-2">"{rating.comment}"</p>
                        </div>
                      ))}
                      {detailRatings.length === 0 && (
                        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                           <i className="fas fa-star-half-alt text-gray-200 text-4xl mb-4"></i>
                           <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">No Feedback Records Found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
             </div>
          </div>
       </div>
    );
  };

  const renderUsersModule = () => {
    if (selectedUserId && detailUser) {
        return renderUserDetailInline();
    }

    const filtered = users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = userFilterRole === 'ALL' || u.role === userFilterRole;
      return matchesSearch && matchesRole;
    });

    if (activeTab === 'all-users') {
      return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
          <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <div className="flex-1 flex items-center gap-4 px-4 bg-gray-50 rounded-2xl">
                <i className="fas fa-search text-gray-300"></i>
                <input type="text" placeholder="Lookup entities by identity or electronic mail..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none py-4 outline-none text-xs font-bold" />
             </div>
             <select value={userFilterRole} onChange={e => setUserFilterRole(e.target.value)} className="bg-white border border-gray-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none">
                <option value="ALL">All Protocols</option>
                <option value={UserRole.ADMIN}>Administrators</option>
                <option value={UserRole.MODERATOR}>Moderators</option>
                <option value={UserRole.USER}>Standard Entities</option>
             </select>
          </div>

          <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[800px]">
                    <thead>
                    <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50">
                        <th className="px-10 py-6">Entity Architecture</th>
                        <th className="px-10 py-6">Operational Role</th>
                        <th className="px-10 py-6">Capital Balance</th>
                        <th className="px-10 py-6 text-right">Data Command</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                    {filtered.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                <img src={u.photo} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                                <div>
                                    <p className="text-sm font-black text-gray-900">{u.name}</p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{u.email}</p>
                                </div>
                                {u.isVerified && <span className="bg-blue-50 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[8px]"><i className="fas fa-check"></i></span>}
                                </div>
                            </td>
                            <td className="px-10 py-6"><span className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase border ${u.role === UserRole.ADMIN ? 'bg-slate-900 text-white border-black' : u.role === UserRole.MODERATOR ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{u.role}</span></td>
                            <td className="px-10 py-6"><span className="text-sm font-black text-gray-900">₹{u.walletBalance.toLocaleString()}</span></td>
                            <td className="px-10 py-6 text-right">
                                <button onClick={() => setSelectedUserId(u.id)} className="bg-gray-50 text-gray-900 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 border border-gray-100">Configure Node</button>
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

  const renderListings = () => {
    const filtered = listings.filter(l => {
      const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = listingFilterStatus === 'ALL' || l.status === listingFilterStatus;
      const matchesCategory = listingFilterCategory === 'ALL' || l.category === listingFilterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    });

    if (activeTab === 'master') {
      return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <div className="flex flex-col lg:flex-row gap-4 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm items-center">
             <div className="flex-1 flex items-center gap-4 px-6 bg-gray-50 rounded-2xl w-full">
                <i className="fas fa-search text-gray-300"></i>
                <input type="text" placeholder="Scan global inventory by product label..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none py-4 outline-none text-xs font-bold" />
             </div>
             <div className="flex gap-4 w-full lg:w-auto">
               <select value={listingFilterStatus} onChange={e => setListingFilterStatus(e.target.value)} className="flex-1 bg-white border border-gray-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase outline-none">
                  <option value="ALL">All States</option>
                  <option value={ListingStatus.PENDING}>Pending</option>
                  <option value={ListingStatus.APPROVED}>Authorized</option>
                  <option value={ListingStatus.REJECTED}>Violations</option>
               </select>
               <select value={listingFilterCategory} onChange={e => setListingFilterCategory(e.target.value)} className="flex-1 bg-white border border-gray-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase outline-none">
                  <option value="ALL">All Segments</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
               </select>
             </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[1000px]">
                    <thead>
                    <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50">
                        <th className="px-10 py-6">Listing Identity</th>
                        <th className="px-10 py-6">Commercial Value</th>
                        <th className="px-10 py-6">Geo Origin</th>
                        <th className="px-10 py-6 text-right">Inventory Logic</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                    {filtered.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                <img src={l.images[0]} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                                <div>
                                    <p className="text-sm font-black text-gray-900 truncate max-w-[200px] uppercase">{l.title}</p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{l.category}</p>
                                </div>
                                {l.isPremium && <span className="bg-amber-400 text-amber-900 w-5 h-5 rounded-lg flex items-center justify-center text-[8px] shadow-sm"><i className="fas fa-crown"></i></span>}
                                </div>
                            </td>
                            <td className="px-10 py-6"><span className="text-sm font-black text-gray-900">₹{l.price.toLocaleString()}</span></td>
                            <td className="px-10 py-6">
                            <p className="text-[10px] font-black text-gray-900 uppercase">{CITIES.find(c => c.id === l.cityId)?.name || 'ROOT'}</p>
                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">UID: {l.sellerId}</p>
                            </td>
                            <td className="px-10 py-6 text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setSelectedListingId(l.id)} className="w-10 h-10 bg-gray-50 text-gray-900 hover:bg-blue-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm border border-gray-100"><i className="fas fa-cog text-xs"></i></button>
                                <button onClick={() => { if(onViewAd) onViewAd(l); }} className="w-10 h-10 bg-gray-50 text-gray-900 hover:bg-emerald-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm border border-gray-100"><i className="fas fa-eye text-xs"></i></button>
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

  const renderListingDetailModal = () => {
    if (!detailListing) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in">
         <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[75vh]">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
               <h3 className="text-xl font-black uppercase text-gray-900">Listing Asset Management</h3>
               <button onClick={() => setSelectedListingId(null)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all shadow-sm border border-gray-100"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-4 space-y-6">
                     <div className="aspect-square rounded-[2rem] overflow-hidden border-4 border-gray-50 shadow-xl">
                        <img src={detailListing.images[0]} className="w-full h-full object-cover" />
                     </div>
                     <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-900 mb-2">Metadata Node</p>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[9px] font-bold"><span>Asset ID</span><span className="font-black text-blue-600">{detailListing.id}</span></div>
                           <div className="flex justify-between text-[9px] font-bold"><span>Traffic Volume</span><span className="font-black text-blue-600">{detailListing.views} Hits</span></div>
                           <div className="flex justify-between text-[9px] font-bold"><span>Creation Delta</span><span className="font-black text-blue-600">{new Date(detailListing.createdAt).toLocaleDateString()}</span></div>
                        </div>
                     </div>
                  </div>
                  <div className="lg:col-span-8 space-y-6">
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black uppercase text-gray-400">Inventory Label</label>
                           <input type="text" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={detailListing.title} onChange={e => setDetailListing({...detailListing, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-gray-400">Market Value (₹)</label>
                              <input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={detailListing.price} onChange={e => setDetailListing({...detailListing, price: Number(e.target.value)})} />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-gray-400">Segment</label>
                              <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={detailListing.category} onChange={e => setDetailListing({...detailListing, category: e.target.value})}>
                                 {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                              </select>
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] font-black uppercase text-gray-400">Logic State</label>
                           <div className="flex gap-2">
                              {[ListingStatus.APPROVED, ListingStatus.PENDING, ListingStatus.REJECTED].map(s => (
                                 <button key={s} onClick={() => setDetailListing({...detailListing, status: s})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${detailListing.status === s ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}>{s}</button>
                              ))}
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] font-black uppercase text-gray-400">Asset Description</label>
                           <textarea rows={5} className="w-full bg-gray-50 border p-6 rounded-3xl font-bold text-sm" value={detailListing.description} onChange={e => setDetailListing({...detailListing, description: e.target.value})} />
                        </div>
                     </div>
                     <div className="flex gap-4 pt-4">
                        <button onClick={handleListingSave} className="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Save Asset Protocol</button>
                        <button onClick={() => handleListingDelete(detailListing.id)} className="w-20 bg-rose-50 text-rose-500 rounded-3xl border border-rose-100 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-xl shadow-rose-100"><i className="fas fa-trash-alt"></i></button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  };

  const renderRevenue = () => {
    if (activeTab === 'pricing') {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Global Pricing Strategy</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Premium Ad Price (₹)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.premiumPrice} onChange={e => setConfig({...config, premiumPrice: Number(e.target.value)})} /></div>
               <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Standard Ad Price (₹)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.standardAdPrice} onChange={e => setConfig({...config, standardAdPrice: Number(e.target.value)})} /></div>
               <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Blue Tick Price (₹)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.blueTickPrice} onChange={e => setConfig({...config, blueTickPrice: Number(e.target.value)})} /></div>
               <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Free Ad Limit</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.freeAdLimit} onChange={e => setConfig({...config, freeAdLimit: Number(e.target.value)})} /></div>
            </div>
            <button onClick={handleConfigCommit} className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl">Commit Pricing Logic</button>
          </div>
        </div>
      );
    }
    if (activeTab === 'banner_ads') {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Banner Ad Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Tier 1 Price (₹)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.bannerAdTierPrices.T1} onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T1: Number(e.target.value)}})} /></div>
                   <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Tier 2 Price (₹)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.bannerAdTierPrices.T2} onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T2: Number(e.target.value)}})} /></div>
                   <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Tier 3 Price (₹)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.bannerAdTierPrices.T3} onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T3: Number(e.target.value)}})} /></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Default Duration (Days)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={config.bannerAdDurationDays} onChange={e => setConfig({...config, bannerAdDurationDays: Number(e.target.value)})} /></div>
                <button onClick={handleConfigCommit} className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl">Commit Banner Protocols</button>
              </div>
            </div>
        )
    }
    if (activeTab === 'adsense') {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
            <div className="flex justify-between items-center border-b border-gray-50 pb-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Google AdSense Module</h4>
                <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Inject third-party programmatic revenue streams</p>
              </div>
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
                <i className="fab fa-google text-xl"></i>
              </div>
            </div>
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase text-gray-400">Master Script Integration</label>
                    <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">Auto-Injection Enabled</span>
                  </div>
                  <textarea 
                    rows={12} 
                    className="w-full bg-gray-50 border border-gray-200 p-6 rounded-[2rem] font-mono text-xs focus:bg-white focus:border-blue-200 transition-all outline-none shadow-inner" 
                    value={config.googleAdsenseCode} 
                    onChange={e => setConfig({...config, googleAdsenseCode: e.target.value})}
                    placeholder="Paste your Google AdSense <script> or Auto-ads code here..."
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 flex gap-4">
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                        <i className="fas fa-shield-check"></i>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-blue-900 uppercase">Security Check</p>
                        <p className="text-[9px] text-blue-700/70 mt-1 leading-relaxed">The platform sanitizes the input for high-level XSS protection while maintaining script integrity.</p>
                     </div>
                  </div>
                  <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50 flex gap-4">
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
                        <i className="fas fa-bolt"></i>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-emerald-900 uppercase">Performance Node</p>
                        <p className="text-[9px] text-emerald-700/70 mt-1 leading-relaxed">Ads are loaded asynchronously to prevent impact on marketplace Core Web Vitals.</p>
                     </div>
                  </div>
               </div>
            </div>
            
            <button 
              onClick={handleConfigCommit} 
              disabled={isProcessing}
              className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Commit AdSense Protocols
            </button>
          </div>
        </div>
      );
    }
    if (activeTab === 'gateways') {
      const gateways = [
        { id: 'razorpay', label: 'Razorpay', icon: 'fa-indian-rupee-sign', region: 'India', fields: [
          { key: 'keyId', label: 'Key ID' },
          { key: 'keySecret', label: 'Key Secret' }
        ]},
        { id: 'paytm', label: 'Paytm', icon: 'fa-wallet', region: 'India', fields: [
          { key: 'merchantId', label: 'Merchant ID' },
          { key: 'merchantKey', label: 'Merchant Key' },
          { key: 'website', label: 'Website URL' }
        ]},
        { id: 'phonepe', label: 'PhonePe', icon: 'fa-mobile-screen', region: 'India', fields: [
          { key: 'merchantId', label: 'Merchant ID' },
          { key: 'saltKey', label: 'Salt Key' },
          { key: 'saltIndex', label: 'Salt Index' }
        ]},
        { id: 'stripe', label: 'Stripe', icon: 'fa-brands fa-stripe', region: 'International', fields: [
          { key: 'publishableKey', label: 'Publishable Key' },
          { key: 'secretKey', label: 'Secret Key' }
        ]},
        { id: 'paypal', label: 'PayPal', icon: 'fa-brands fa-paypal', region: 'International', fields: [
          { key: 'clientId', label: 'Client ID' },
          { key: 'secret', label: 'Secret Key' }
        ]}
      ];

      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
          <div className="grid grid-cols-1 gap-8">
            {gateways.map(gw => (
              <div key={gw.id} className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-gray-50 pb-8">
                   <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-2xl shadow-xl shadow-blue-50 ${config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']]?.active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                         <i className={`fas ${gw.icon}`}></i>
                      </div>
                      <div>
                         <h4 className="text-xl font-black uppercase tracking-tight text-gray-900">{gw.label}</h4>
                         <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${gw.region === 'India' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {gw.region} Node
                         </span>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                      <span className={`text-[10px] font-black uppercase tracking-widest mr-2 ${config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']]?.active ? 'text-blue-600' : 'text-gray-400'}`}>
                         {config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']]?.active ? 'Operational' : 'Offline'}
                      </span>
                      <button 
                        onClick={() => setConfig({
                          ...config, 
                          paymentGateway: {
                            ...config.paymentGateway, 
                            [gw.id]: { ...config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']], active: !config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']]?.active }
                          }
                        })}
                        className={`w-16 h-8 rounded-full relative transition-all duration-300 ${config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']]?.active ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                         <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm ${config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']]?.active ? 'left-9' : 'left-1'}`}></div>
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {gw.fields.map(f => (
                     <div key={f.key} className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{f.label}</label>
                        <input 
                          type="password"
                          className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-blue-200 transition-all"
                          value={(config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']] as any)?.[f.key] || ''}
                          onChange={e => {
                            const updatedGateway = { ...(config.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']] as any), [f.key]: e.target.value };
                            setConfig({
                              ...config,
                              paymentGateway: { ...config.paymentGateway, [gw.id]: updatedGateway }
                            });
                          }}
                          placeholder={`Enter encrypted ${f.label.toLowerCase()}`}
                        />
                     </div>
                   ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[120px] opacity-10"></div>
             <div>
                <h4 className="text-xl font-black text-white uppercase tracking-tight">Deploy Gateway Logic</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Updating protocols will immediately affect all city-locked settlement nodes</p>
             </div>
             <button 
                onClick={handleConfigCommit}
                disabled={isProcessing}
                className="w-full md:w-auto bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all active:scale-[0.98]"
             >
                {isProcessing ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-rocket mr-2"></i>}
                Push Protocol Updates
             </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderGeoCats = () => {
    if (activeTab === 'location_mgmt') {
      const filteredCities = cities.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(citySearchQuery.toLowerCase());
        const matchesState = !cityFilterStateId || c.stateId === cityFilterStateId;
        const state = states.find(s => s.id === c.stateId);
        const matchesCountry = !cityFilterCountryId || (state && state.countryId === cityFilterCountryId);
        return matchesSearch && matchesState && matchesCountry;
      });

      const filteredStatesForFilter = cityFilterCountryId 
        ? states.filter(s => s.countryId === cityFilterCountryId)
        : states;

      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 pb-20">
          {/* 1. City Filter & Search Row */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
             <div className="flex-1 flex items-center gap-4 px-6 bg-gray-50 rounded-2xl w-full">
                <i className="fas fa-search text-gray-300"></i>
                <input 
                  type="text" 
                  placeholder="Lookup cities within system inventory..." 
                  value={citySearchQuery} 
                  onChange={e => setCitySearchQuery(e.target.value)} 
                  className="w-full bg-transparent border-none py-4 outline-none text-xs font-bold" 
                />
             </div>
             <div className="flex gap-4 w-full md:w-auto">
               <select 
                value={cityFilterCountryId} 
                onChange={e => {
                  setCityFilterCountryId(e.target.value);
                  setCityFilterStateId('');
                }} 
                className="flex-1 bg-white border border-gray-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase outline-none min-w-[150px]"
               >
                  <option value="">All Countries</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <select 
                value={cityFilterStateId} 
                onChange={e => setCityFilterStateId(e.target.value)} 
                className="flex-1 bg-white border border-gray-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase outline-none min-w-[150px]"
               >
                  <option value="">All States</option>
                  {filteredStatesForFilter.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
             </div>
          </div>

          {/* 2. City List Table */}
          <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-black uppercase text-gray-400">
                        <th className="px-10 py-6">City Name</th>
                        <th className="px-10 py-6">Operational Tier</th>
                        <th className="px-10 py-6 text-right">Status Control</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                    {filteredCities.map(c => (
                        <tr key={c.id} className="text-sm font-bold">
                            <td className="px-10 py-6">{c.name}</td>
                            <td className="px-10 py-6">
                                <select className="bg-gray-50 border px-3 py-1 rounded-lg text-[10px] font-black" value={cityTiers[c.id] || 'T2'} onChange={e => handleCityTierChange(c.id, e.target.value as any)}>
                                <option value="T1">Tier 1</option>
                                <option value="T2">Tier 2</option>
                                <option value="T3">Tier 3</option>
                                </select>
                            </td>
                            <td className="px-10 py-6 text-right">
                                <button onClick={() => handleCityToggle(c.id, !!c.isActive)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${c.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{c.isActive ? 'Active' : 'Disabled'}</button>
                            </td>
                        </tr>
                    ))}
                    {filteredCities.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-10 py-20 text-center text-gray-400 text-xs italic uppercase">No matching city nodes found.</td>
                      </tr>
                    )}
                    </tbody>
                </table>
             </div>
          </div>

          {/* 3. Forms Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Register City</h5>
                <form onSubmit={handleCityAdd} className="space-y-4">
                   <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={cityAddForm.countryId} onChange={e => {
                      setCityAddForm({...cityAddForm, countryId: e.target.value, stateId: ''});
                      setFormStates(dbService.getStates(e.target.value));
                   }}>
                      <option value="">Select Country</option>
                      {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={cityAddForm.stateId} onChange={e => setCityAddForm({...cityAddForm, stateId: e.target.value})}>
                      <option value="">Select State</option>
                      {formStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                   <input type="text" placeholder="City Name" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={cityAddForm.name} onChange={e => setCityAddForm({...cityAddForm, name: e.target.value})} />
                   <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Add City</button>
                </form>
             </div>
             
             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Register Country</h5>
                <form onSubmit={handleCountryAdd} className="space-y-4">
                   <input type="text" placeholder="Country Name" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={countryAddForm.name} onChange={e => setCountryAddForm({...countryAddForm, name: e.target.value})} />
                   <input type="text" placeholder="ISO Code (e.g. IN)" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={countryAddForm.code} onChange={e => setCountryAddForm({...countryAddForm, code: e.target.value})} />
                   <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Add Country</button>
                </form>
             </div>
             
             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Register State</h5>
                <form onSubmit={handleStateAdd} className="space-y-4">
                   <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={stateAddForm.countryId} onChange={e => setStateAddForm({...stateAddForm, countryId: e.target.value})}>
                      <option value="">Select Country</option>
                      {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <input type="text" placeholder="State Name" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={stateAddForm.name} onChange={e => setStateAddForm({...stateAddForm, name: e.target.value})} />
                   <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Add State</button>
                </form>
             </div>
          </div>
        </div>
      );
    }
    if (activeTab === 'category_mgmt') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">{isEditingCat ? 'Modify Segment' : 'Register New Segment'}</h4>
             <form onSubmit={handleCategoryAction} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <input required type="text" placeholder="Category Name" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
                <input type="text" placeholder="Icon Class (FontAwesome)" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} />
                <button type="submit" className="bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px]">{isEditingCat ? 'Update Segment' : 'Register Segment'}</button>
             </form>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {categories.map(cat => (
                <div key={cat.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-4 group">
                   <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg shadow-blue-50">
                      <i className={`fas ${cat.icon}`}></i>
                   </div>
                   <h5 className="font-black text-gray-900 uppercase text-xs">{cat.name}</h5>
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setIsEditingCat(true); setCatForm(cat); }} className="w-8 h-8 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-lg flex items-center justify-center"><i className="fas fa-pen text-[10px]"></i></button>
                      <button onClick={async () => { if(window.confirm("Delete category?")) { await dbService.deleteCategory(cat.id); loadData(); } }} className="w-8 h-8 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-lg flex items-center justify-center"><i className="fas fa-trash-alt text-[10px]"></i></button>
                   </div>
                </div>
             ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderSystem = () => {
    if (activeTab === 'site') {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Master Brand Identity</h4>
                <div className="space-y-4">
                   <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Platform ID</label><input type="text" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl font-bold" value={config.siteName} onChange={e => setConfig({...config, siteName: e.target.value})} /></div>
                   <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Platform Tagline</label><input type="text" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl font-bold" value={config.branding.siteTagline} onChange={e => setConfig({...config, branding: {...config.branding, siteTagline: e.target.value}})} /></div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Brand Logo Asset</label>
                         <div className="w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex items-center justify-center relative overflow-hidden group">
                            {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-contain p-4" /> : <i className="fas fa-cloud-upload-alt text-2xl text-gray-300"></i>}
                            <input type="file" onChange={e => handleConfigLogoUpload(e, 'logoUrl')} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">PWA Favicon Asset</label>
                         <div className="w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex items-center justify-center relative overflow-hidden group">
                            {config.branding.pwaIcon ? <img src={config.branding.pwaIcon} className="w-full h-full object-contain p-4" /> : <i className="fas fa-cloud-upload-alt text-2xl text-gray-300"></i>}
                            <input type="file" onChange={e => handleConfigLogoUpload(e, 'branding.pwaIcon')} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                      </div>
                   </div>
                </div>
                <button onClick={handleConfigCommit} className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl">Commit Visual Protocols</button>
             </div>

             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Electronic Communication Module</h4>
                <div className="space-y-4">
                   <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">System Support Mail</label><input type="email" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl font-bold" value={config.branding.supportEmail} onChange={e => setConfig({...config, branding: {...config.branding, supportEmail: e.target.value}})} /></div>
                   <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">System Support Phone</label><input type="text" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl font-bold" value={config.branding.supportPhone} onChange={e => setConfig({...config, branding: {...config.branding, supportPhone: e.target.value}})} /></div>
                   <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Corporate HQ Locator</label><textarea rows={2} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl font-bold" value={config.branding.address} onChange={e => setConfig({...config, branding: {...config.branding, address: e.target.value}})} /></div>
                </div>
                <div className="space-y-6 pt-4">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Resource Link Anchors</h5>
                   <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Anchor Label" value={newResource.label} onChange={e => setNewResource({...newResource, label: e.target.value})} className="bg-gray-50 border p-3 rounded-xl font-bold text-[10px]" />
                      <input type="text" placeholder="Target URL" value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} className="bg-gray-50 border p-3 rounded-xl font-bold text-[10px]" />
                      <textarea placeholder="Direct Content Segment (Optional)" value={newResource.content} onChange={e => setNewResource({...newResource, content: e.target.value})} className="col-span-2 bg-gray-50 border p-3 rounded-xl font-bold text-[10px]" />
                      <button onClick={addResourceLink} className="col-span-2 bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest">Register Anchor</button>
                   </div>
                   <div className="space-y-2">
                      {(config.branding.resourceLinks || []).map((link, idx) => (
                         <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                            <span className="text-[10px] font-black text-gray-900 uppercase">{link.label}</span>
                            <button onClick={() => removeResourceLink(idx)} className="text-rose-500 hover:text-rose-700"><i className="fas fa-trash-alt"></i></button>
                         </div>
                      ))}
                   </div>
                </div>
                <button onClick={handleConfigCommit} className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl">Commit Communication Protocols</button>
             </div>
          </div>
        </div>
      );
    }
    if (activeTab === 'logs') {
      return (
        <div className="space-y-6 animate-in fade-in pb-20">
           <div className="bg-slate-900 rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Real-time Platform Audit Log</h4>
                 <span className="text-[9px] font-bold text-slate-500 uppercase">Live Flux Interface</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                 <table className="w-full text-left min-w-[800px]">
                    <thead>
                       <tr className="text-[10px] font-black uppercase text-slate-600 border-b border-slate-800">
                          <th className="px-8 py-5">Delta Time</th>
                          <th className="px-8 py-5">Source Node (IP)</th>
                          <th className="px-8 py-5">System Action</th>
                          <th className="px-8 py-5">Severity Level</th>
                          <th className="px-8 py-5">Operational Details</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                       {[...logs].reverse().slice(0, 50).map(log => (
                          <tr key={log.id} className="font-mono text-[10px] hover:bg-slate-800/50 transition-colors">
                             <td className="px-8 py-4 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                             <td className="px-8 py-4 text-slate-400">{log.ip}</td>
                             <td className="px-8 py-4 text-emerald-500 font-bold uppercase">{log.action}</td>
                             <td className="px-8 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                  log.severity === 'CRITICAL' ? 'bg-rose-500 text-white' :
                                  log.severity === 'HIGH' ? 'bg-orange-500 text-white' :
                                  log.severity === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                                }`}>{log.severity}</span>
                             </td>
                             <td className="px-8 py-4 text-slate-500 italic max-w-xs truncate">{log.details}</td>
                          </tr>
                       ))}
                       {logs.length === 0 && (
                          <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-600 text-xs italic">Audit Stream Synchronizing... No nodes found.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <aside className="w-72 bg-slate-900 text-white flex flex-col sticky top-0 h-screen z-50">
        <div className="p-8 border-b border-slate-800 flex items-center gap-4">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-xl shadow-blue-500/20">A</div>
           <div>
              <h2 className="text-sm font-black uppercase tracking-tighter leading-none">adoiz core</h2>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Master Control V3.1</p>
           </div>
        </div>

        <nav className="flex-1 p-6 space-y-1 overflow-y-auto custom-scrollbar">
           {[
             { id: 'DASHBOARD', label: 'Command Deck', icon: 'fa-gauge-high' },
             { id: 'USERS', label: 'User Registry', icon: 'fa-users-gear' },
             { id: 'LISTINGS', label: 'Market Inventory', icon: 'fa-cubes' },
             { id: 'GEO_CATS', label: 'Geo & Segments', icon: 'fa-map-location-dot' },
             { id: 'REVENUE', label: 'Revenue Engine', icon: 'fa-money-bill-trend-up' },
             { id: 'SYSTEM', label: 'System Logic', icon: 'fa-microchip' }
           ].map(item => (
             <button key={item.id} onClick={() => setActiveMenu(item.id as MainMenu)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMenu === item.id ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/20 translate-x-2' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <i className={`fas ${item.icon} text-sm w-5`}></i> {item.label}
             </button>
           ))}
        </nav>

        <div className="p-6 border-t border-slate-800 space-y-2">
           <button onClick={onGoToModeration} className="w-full flex items-center justify-center gap-3 bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"><i className="fas fa-gavel"></i> Moderate View</button>
           <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 bg-rose-600/10 text-rose-400 border border-rose-600/20 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"><i className="fas fa-power-off"></i> Terminate Session</button>
        </div>
      </aside>

      <main className="flex-1 min-h-screen overflow-x-hidden">
        <header className="bg-white border-b border-gray-100 px-10 py-6 flex justify-between items-center sticky top-0 z-40">
           <div>
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">{activeMenu.replace('_', ' & ')} Module</h1>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{activeMenu}</span>
                 <i className="fas fa-chevron-right text-[8px] text-gray-300"></i>
                 <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{activeTab.replace('_', ' ')}</span>
              </div>
           </div>
           <div className="flex items-center gap-6">
              <div className="text-right hidden md:block">
                 <p className="text-[10px] font-black text-gray-900 uppercase leading-none">Session Authorized</p>
                 <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Root User: {user.name.split(' ')[0]}</p>
              </div>
              <button onClick={onBack} className="bg-gray-50 text-gray-900 w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-gray-100"><i className="fas fa-arrow-right"></i></button>
           </div>
        </header>

        <div className="p-10">
           <div className="flex items-center space-x-2 mb-10 bg-white p-1.5 rounded-[2.5rem] border border-gray-100 shadow-sm w-fit">
              {getTabsForMenu(activeMenu).map(tab => (
                 <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}>{tab.label}</button>
              ))}
           </div>

           <div className="relative">
              {loading && (
                <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-sm z-10 flex items-center justify-center py-20"><i className="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i></div>
              )}
              {activeMenu === 'DASHBOARD' && renderDashboard()}
              {activeMenu === 'REVENUE' && renderRevenue()}
              {activeMenu === 'GEO_CATS' && renderGeoCats()}
              {activeMenu === 'USERS' && renderUsersModule()}
              {activeMenu === 'LISTINGS' && renderListings()}
              {activeMenu === 'SYSTEM' && renderSystem()}
           </div>
        </div>
      </main>

      {renderListingDetailModal()}
    </div>
  );
};
