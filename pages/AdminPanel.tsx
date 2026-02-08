
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
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<SystemConfig>(dbService.getSystemConfig());
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);

  // Dashboard Filters
  const [revenueFilter, setRevenueFilter] = useState<'ALL' | '7D' | '30D' | '3M' | '12M' | 'RANGE'>('ALL');
  const [revenueDateRange, setRevenueDateRange] = useState({ start: '', end: '' });
  const [trafficFilter, setTrafficFilter] = useState<'ALL' | '7D' | '30D'>('ALL');

  // Selection & Detail States
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailAds, setDetailAds] = useState<Listing[]>([]);
  const [detailTxns, setDetailTxns] = useState<WalletTransaction[]>([]);
  const [detailRatings, setDetailRatings] = useState<Rating[]>([]);
  const [walletForm, setWalletForm] = useState({ amount: '', type: 'CREDIT' as 'CREDIT' | 'DEBIT', reason: '' });

  // Extended User Detail Form States (For Identity Tab)
  const [userDetailForm, setUserDetailForm] = useState({
      countryId: '',
      stateId: '',
      cityId: ''
  });

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
  
  // Detail Geo States (For User Profile Edit)
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

  // Cleanup States
  const [cleanupMonths, setCleanupMonths] = useState<number>(3);
  const [cleanupCityId, setCleanupCityId] = useState<string>('ALL');
  const [cleanupUserType, setCleanupUserType] = useState<'ALL' | 'VERIFIED' | 'PROFESSIONAL'>('ALL');

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
    const [u, l, b, s, cats, cfg, txns] = await Promise.all([
      dbService.getAllUsers(),
      dbService.getAllListings(),
      dbService.getAllBanners(),
      dbService.getSecurityLogs(),
      dbService.getCategories(),
      dbService.getSystemConfig(),
      dbService.getAllTransactions()
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
    setAllTransactions(txns);
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
      
      // Initialize Location Logic for User Details
      let cId = '', sId = '', coId = '';
      
      if (u.cityId) cId = u.cityId;
      if (u.stateId) sId = u.stateId;
      
      // Try to infer country/state if missing from user but available from city/state
      if (cId) {
          const cityObj = CITIES.find(c => c.id === cId);
          if (cityObj && !sId) sId = cityObj.stateId;
      }
      if (sId) {
          const stateObj = STATES.find(s => s.id === sId);
          if (stateObj) coId = stateObj.countryId;
      }

      setUserDetailForm({ countryId: coId, stateId: sId, cityId: cId });
      
      if (coId) setDetailStates(dbService.getStates(coId));
      if (sId) setDetailCities(dbService.getCities(sId));
    }
    setIsProcessing(false);
  };

  // Handlers for User Detail Dropdowns
  const handleUserDetailCountryChange = (countryId: string) => {
      setUserDetailForm({ countryId, stateId: '', cityId: '' });
      setDetailStates(dbService.getStates(countryId));
      setDetailCities([]);
      if (detailUser) setDetailUser({ ...detailUser, stateId: '', cityId: '' });
  };

  const handleUserDetailStateChange = (stateId: string) => {
      setUserDetailForm(prev => ({ ...prev, stateId, cityId: '' }));
      setDetailCities(dbService.getCities(stateId));
      if (detailUser) setDetailUser({ ...detailUser, stateId });
  };

  const handleUserDetailCityChange = (cityId: string) => {
      setUserDetailForm(prev => ({ ...prev, cityId }));
      if (detailUser) setDetailUser({ ...detailUser, cityId });
  };

  const handleRatingDelete = async (ratingId: string) => {
    if (!window.confirm("Permanently delete this review?")) return;
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

  const saveDetailProfile = async () => {
    if (!detailUser) return;
    setIsProcessing(true);
    try {
      await dbService.adminUpdateUser(detailUser.id, detailUser, user.id);
      notify("User profile updated successfully.", "success");
      loadData(); // Refresh main table
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
        { id: 'banner_inventory', label: 'Live Inventory' },
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
        { id: 'cleanup', label: 'Cleanup' },
        { id: 'logs', label: 'Security Logs' }
      ];
      default: return [{ id: 'default', label: 'Management' }];
    }
  }

  const filteredCleanupAds = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - cleanupMonths);

    return listings.filter(l => {
      const listingDate = new Date(l.createdAt);
      const seller = users.find(u => u.id === l.sellerId);
      
      const matchesTime = listingDate < cutoffDate;
      const matchesCity = cleanupCityId === 'ALL' || l.cityId === cleanupCityId;
      
      let matchesUser = true;
      if (cleanupUserType === 'VERIFIED') {
        matchesUser = !!seller?.isVerified;
      } else if (cleanupUserType === 'PROFESSIONAL') {
        matchesUser = seller?.role === UserRole.ADMIN || seller?.role === UserRole.MODERATOR;
      }

      return matchesTime && matchesCity && matchesUser;
    });
  }, [listings, cleanupMonths, cleanupCityId, cleanupUserType, users]);

  const handleExecuteCleanup = async () => {
    if (filteredCleanupAds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${filteredCleanupAds.length} listings from the system? This action is irreversible.`)) return;

    setIsProcessing(true);
    try {
        let count = 0;
        for (const ad of filteredCleanupAds) {
            await dbService.deleteListing(ad.id);
            count++;
        }
        notify(`${count} listings purged successfully.`, "success");
        loadData();
    } catch (err: any) {
        notify(err.message, "error");
    } finally {
        setIsProcessing(false);
    }
  };

  const getCityName = (id: string) => CITIES.find(c => c.id === id)?.name || id;

  const renderDashboard = () => {
    const stats = [
      { label: 'Total Volume', value: users.length, icon: 'fa-users', color: 'bg-blue-500' },
      { label: 'Inventory Size', value: listings.length, icon: 'fa-box', color: 'bg-emerald-500' },
      { label: 'Active Campaigns', value: banners.filter(b => b.status === 'LIVE').length, icon: 'fa-rectangle-ad', color: 'bg-purple-500' },
      { label: 'Global Liquidity', value: `₹${users.reduce((acc, u) => acc + (u.walletBalance || 0), 0).toLocaleString()}`, icon: 'fa-wallet', color: 'bg-amber-500' }
    ];

    if (activeTab === 'platform_meta') {
      // Calculate Filtered Revenue
      const filteredRevenue = allTransactions
        .filter(t => t.type === 'DEBIT')
        .filter(t => {
            const date = new Date(t.timestamp);
            const now = new Date();
            if (revenueFilter === '7D') return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (revenueFilter === '30D') return date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (revenueFilter === '3M') return date >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            if (revenueFilter === '12M') return date >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            if (revenueFilter === 'RANGE' && revenueDateRange.start && revenueDateRange.end) {
                return date >= new Date(revenueDateRange.start) && date <= new Date(revenueDateRange.end);
            }
            return true;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate Filtered Traffic (using creation date as proxy for now since no view log exists)
      const filteredTraffic = listings.filter(l => {
          const date = new Date(l.createdAt);
          const now = new Date();
          if (trafficFilter === '7D') return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (trafficFilter === '30D') return date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return true;
      }).reduce((acc, l) => acc + (l.views || 0), 0);

      const topCities = cities.map(c => {
        const cityUsers = users.filter(u => u.cityId === c.id).length;
        const cityAds = listings.filter(l => l.cityId === c.id).length;
        return { name: c.name, score: cityUsers + cityAds, users: cityUsers, ads: cityAds };
      }).sort((a, b) => b.score - a.score).slice(0, 5);

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Platform Revenue */}
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                   <div>
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Platform Revenue</h4>
                       <p className="text-4xl font-black text-gray-900 tracking-tight">₹{filteredRevenue.toLocaleString()}</p>
                   </div>
                   <div className="flex flex-col gap-2 items-end">
                       <select 
                        className="bg-gray-50 border border-gray-100 rounded-lg text-[9px] font-bold uppercase p-2 outline-none"
                        value={revenueFilter}
                        onChange={e => setRevenueFilter(e.target.value as any)}
                       >
                           <option value="ALL">All Time</option>
                           <option value="7D">7 Days</option>
                           <option value="30D">30 Days</option>
                           <option value="3M">3 Months</option>
                           <option value="12M">12 Months</option>
                           <option value="RANGE">Custom Range</option>
                       </select>
                       {revenueFilter === 'RANGE' && (
                           <div className="flex gap-1">
                               <input type="date" className="bg-gray-50 border border-gray-100 rounded-lg text-[9px] p-1 w-20" value={revenueDateRange.start} onChange={e => setRevenueDateRange({...revenueDateRange, start: e.target.value})} />
                               <input type="date" className="bg-gray-50 border border-gray-100 rounded-lg text-[9px] p-1 w-20" value={revenueDateRange.end} onChange={e => setRevenueDateRange({...revenueDateRange, end: e.target.value})} />
                           </div>
                       )}
                   </div>
                </div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mt-2">Filtered Debit Transactions</p>
                <div className="mt-8 space-y-3">
                   <div className="flex justify-between text-xs font-bold"><span className="text-gray-500">Premium Ads</span><span>{Math.round(filteredRevenue * 0.45).toLocaleString()}</span></div>
                   <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full w-[45%]"></div></div>
                   <div className="flex justify-between text-xs font-bold"><span className="text-gray-500">Banner Ads</span><span>{Math.round(filteredRevenue * 0.35).toLocaleString()}</span></div>
                   <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-500 h-full w-[35%]"></div></div>
                </div>
             </div>

             {/* Top 5 Cities */}
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-6">Top Performing Cities</h4>
                <div className="space-y-4">
                   {topCities.map((city, idx) => (
                      <div key={city.name} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black text-gray-500">{idx + 1}</span>
                            <span className="text-xs font-bold text-gray-900">{city.name}</span>
                         </div>
                         <div className="text-right">
                            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{city.score} Activities</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Traffic & Engagement */}
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-center text-center relative">
                <div className="absolute top-6 right-6">
                    <select 
                        className="bg-gray-50 border border-gray-100 rounded-lg text-[9px] font-bold uppercase p-2 outline-none"
                        value={trafficFilter}
                        onChange={e => setTrafficFilter(e.target.value as any)}
                    >
                        <option value="ALL">All Time</option>
                        <option value="7D">7 Days</option>
                        <option value="30D">30 Days</option>
                    </select>
                </div>
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-600 text-3xl shadow-sm">
                   <i className="fas fa-eye"></i>
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Traffic</h4>
                <p className="text-4xl font-black text-gray-900 tracking-tight">{filteredTraffic.toLocaleString()}</p>
                <p className="text-xs font-bold text-purple-600 mt-2">Listing Views</p>
                <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-2 gap-4">
                   <div>
                      <p className="text-2xl font-black text-gray-900">{Math.round(filteredTraffic / (listings.length || 1))}</p>
                      <p className="text-[8px] font-black uppercase text-gray-400">Avg Views / Ad</p>
                   </div>
                   <div>
                      <p className="text-2xl font-black text-gray-900">{users.filter(u => u.isVerified).length}</p>
                      <p className="text-[8px] font-black uppercase text-gray-400">Verified Users</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      );
    }
    if (activeTab === 'inventory_meta') {
        const premiumCount = listings.filter(l => l.isPremium).length;
        const standardCount = listings.length - premiumCount;
        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-8">Inventory Logic Mix</h4>
                        <div className="flex justify-between items-end">
                            <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Premium</p><p className="text-4xl font-black text-amber-500">{premiumCount}</p></div>
                            <div className="text-right"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Standard</p><p className="text-4xl font-black text-slate-900">{standardCount}</p></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    if (activeTab === 'system_meta') {
        return <div className="p-10 bg-white rounded-[3rem] text-center border border-gray-100 shadow-sm"><p className="font-bold text-gray-400">System is operational. All services running.</p></div>
    }
    return null;
  };

  const renderRevenue = () => {
    if (activeTab === 'pricing') {
      return (
        <div className="space-y-6 max-w-4xl">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-xl font-black uppercase text-gray-900">Base Pricing Configuration</h3>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Premium Ad Cost</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.premiumPrice} onChange={e => setConfig({...config, premiumPrice: Number(e.target.value)})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Premium Duration (Days)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.premiumDurationDays} onChange={e => setConfig({...config, premiumDurationDays: Number(e.target.value)})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Blue Tick Cost</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.blueTickPrice} onChange={e => setConfig({...config, blueTickPrice: Number(e.target.value)})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Blue Tick Duration (Days)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.blueTickDurationDays} onChange={e => setConfig({...config, blueTickDurationDays: Number(e.target.value)})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Standard Ad Cost (Post-Limit)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.standardAdPrice} onChange={e => setConfig({...config, standardAdPrice: Number(e.target.value)})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Free Ad Limit</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.freeAdLimit} onChange={e => setConfig({...config, freeAdLimit: Number(e.target.value)})} /></div>
              </div>
              <div className="text-right"><button onClick={handleConfigCommit} disabled={isProcessing} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all">Update Pricing Model</button></div>
           </div>
        </div>
      );
    }
    if (activeTab === 'banner_ads') {
       return (
        <div className="space-y-6 max-w-4xl">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-xl font-black uppercase text-gray-900">City Sponsorship Rates</h3>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Default Rate</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.bannerAdPrice} onChange={e => setConfig({...config, bannerAdPrice: Number(e.target.value)})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Duration Cycle (Days)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.bannerAdDurationDays} onChange={e => setConfig({...config, bannerAdDurationDays: Number(e.target.value)})} /></div>
              </div>
              <h4 className="text-sm font-black uppercase text-blue-500 mt-4 border-b border-gray-100 pb-2">Tiered Pricing Multipliers</h4>
              <div className="grid grid-cols-3 gap-6">
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Tier 1 (Metro)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.bannerAdTierPrices.T1} onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T1: Number(e.target.value)}})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Tier 2 (Urban)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.bannerAdTierPrices.T2} onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T2: Number(e.target.value)}})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Tier 3 (Town)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={config.bannerAdTierPrices.T3} onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T3: Number(e.target.value)}})} /></div>
              </div>
              <div className="text-right"><button onClick={handleConfigCommit} disabled={isProcessing} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all">Update Sponsorship Rates</button></div>
           </div>
        </div>
       )
    }
    if (activeTab === 'banner_inventory') {
        return (
            <div className="space-y-4">
                {banners.map(b => (
                    <div key={b.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex gap-4 items-center">
                        <img src={b.imageUrl} className="w-32 h-16 object-cover rounded-xl bg-gray-100" />
                        <div className="flex-1">
                            <h5 className="font-black text-gray-900 uppercase">{b.title}</h5>
                            <p className="text-xs text-gray-500">{getCityName(b.cityId)} • {b.status}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-lg font-black text-blue-600">₹{b.amountPaid}</p>
                             <p className="text-[9px] font-black uppercase text-gray-400">Paid</p>
                        </div>
                    </div>
                ))}
                {banners.length === 0 && <p className="text-center text-gray-400 text-xs uppercase font-black py-10">No active inventory.</p>}
            </div>
        )
    }
    return <div className="p-10 text-center text-gray-400 font-bold uppercase text-xs">Module Under Construction</div>
  }

  const renderGeoCats = () => {
      if (activeTab === 'location_mgmt') {
          return (
              <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Countries */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                          <h4 className="text-sm font-black uppercase text-blue-600">1. Countries</h4>
                          <div className="space-y-2 h-48 overflow-y-auto custom-scrollbar pr-2">
                              {countries.map(c => (
                                  <div key={c.id} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-xs font-bold">
                                      <span>{c.name}</span><span className="text-gray-400">{c.code}</span>
                                  </div>
                              ))}
                          </div>
                          <form onSubmit={handleCountryAdd} className="pt-4 border-t border-gray-100 space-y-2">
                              <input type="text" placeholder="Name" className="w-full bg-gray-50 border p-2 rounded-xl text-xs font-bold" value={countryAddForm.name} onChange={e => setCountryAddForm({...countryAddForm, name: e.target.value})} />
                              <input type="text" placeholder="Code (e.g. IN)" className="w-full bg-gray-50 border p-2 rounded-xl text-xs font-bold uppercase" maxLength={2} value={countryAddForm.code} onChange={e => setCountryAddForm({...countryAddForm, code: e.target.value})} />
                              <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white py-2 rounded-xl text-[9px] font-black uppercase">Add Country</button>
                          </form>
                      </div>

                      {/* States */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                          <h4 className="text-sm font-black uppercase text-blue-600">2. States</h4>
                          <div className="space-y-2 h-48 overflow-y-auto custom-scrollbar pr-2">
                              {states.map(s => (
                                  <div key={s.id} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-xs font-bold">
                                      <span>{s.name}</span>
                                  </div>
                              ))}
                          </div>
                          <form onSubmit={handleStateAdd} className="pt-4 border-t border-gray-100 space-y-2">
                              <select className="w-full bg-gray-50 border p-2 rounded-xl text-xs font-bold" value={stateAddForm.countryId} onChange={e => setStateAddForm({...stateAddForm, countryId: e.target.value})}>
                                  <option value="">Select Country</option>
                                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                              <input type="text" placeholder="State Name" className="w-full bg-gray-50 border p-2 rounded-xl text-xs font-bold" value={stateAddForm.name} onChange={e => setStateAddForm({...stateAddForm, name: e.target.value})} />
                              <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white py-2 rounded-xl text-[9px] font-black uppercase">Add State</button>
                          </form>
                      </div>

                      {/* Cities */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                          <h4 className="text-sm font-black uppercase text-blue-600">3. Cities</h4>
                          <div className="space-y-2 h-48 overflow-y-auto custom-scrollbar pr-2">
                              {cities.map(c => (
                                  <div key={c.id} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-xs font-bold group">
                                      <div className="flex items-center gap-2">
                                        <div onClick={() => handleCityToggle(c.id, !!c.isActive)} className={`w-2 h-2 rounded-full cursor-pointer ${c.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                        <span>{c.name}</span>
                                      </div>
                                      <select 
                                        className="bg-white border border-gray-200 rounded text-[9px] font-black uppercase p-1 w-12"
                                        value={cityTiers[c.id] || 'T2'}
                                        onChange={(e) => handleCityTierChange(c.id, e.target.value as any)}
                                      >
                                          <option value="T1">T1</option><option value="T2">T2</option><option value="T3">T3</option>
                                      </select>
                                  </div>
                              ))}
                          </div>
                          <form onSubmit={handleCityAdd} className="pt-4 border-t border-gray-100 space-y-2">
                              <div className="flex gap-2">
                                <select className="w-1/2 bg-gray-50 border p-2 rounded-xl text-[10px] font-bold" value={cityAddForm.countryId} onChange={e => {
                                    setCityAddForm({...cityAddForm, countryId: e.target.value, stateId: ''});
                                    setFormStates(dbService.getStates(e.target.value));
                                }}>
                                    <option value="">Country</option>
                                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select className="w-1/2 bg-gray-50 border p-2 rounded-xl text-[10px] font-bold" value={cityAddForm.stateId} onChange={e => setCityAddForm({...cityAddForm, stateId: e.target.value})}>
                                    <option value="">State</option>
                                    {formStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <input type="text" placeholder="City Name" className="w-2/3 bg-gray-50 border p-2 rounded-xl text-xs font-bold" value={cityAddForm.name} onChange={e => setCityAddForm({...cityAddForm, name: e.target.value})} />
                                <select className="w-1/3 bg-gray-50 border p-2 rounded-xl text-[10px] font-bold" value={cityAddForm.tier} onChange={e => setCityAddForm({...cityAddForm, tier: e.target.value as any})}>
                                    <option value="T1">T1</option><option value="T2">T2</option><option value="T3">T3</option>
                                </select>
                              </div>
                              <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white py-2 rounded-xl text-[9px] font-black uppercase">Add City</button>
                          </form>
                      </div>
                  </div>
              </div>
          )
      }
      if (activeTab === 'category_mgmt') {
          return (
              <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                      <h4 className="text-sm font-black uppercase text-gray-900 mb-6">Taxonomy Management</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                          {categories.map(cat => (
                              <div key={cat.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group hover:bg-white hover:shadow-lg transition-all">
                                  <div className="flex items-center gap-2">
                                      <i className={`fas ${cat.icon} text-gray-400 group-hover:text-blue-500`}></i>
                                      <span className="text-xs font-bold text-gray-700">{cat.name}</span>
                                  </div>
                                  <button onClick={() => { setCatForm(cat); setIsEditingCat(true); }} className="text-gray-300 hover:text-blue-600"><i className="fas fa-pen text-xs"></i></button>
                              </div>
                          ))}
                      </div>
                      <form onSubmit={handleCategoryAction} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex gap-4 items-end">
                          <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-black uppercase text-gray-400">Category Name</label>
                              <input type="text" required className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-bold" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
                          </div>
                          <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-black uppercase text-gray-400">Icon Class (FontAwesome)</label>
                              <input type="text" required className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-bold" placeholder="fa-tag" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} />
                          </div>
                          <div className="flex gap-2">
                              {isEditingCat && <button type="button" onClick={() => { setIsEditingCat(false); setCatForm({id:'',name:'',icon:''}); }} className="px-6 py-3 bg-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase">Cancel</button>}
                              <button type="submit" disabled={isProcessing} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">{isEditingCat ? 'Update' : 'Create'}</button>
                          </div>
                      </form>
                  </div>
              </div>
          )
      }
      return null;
  }

  const renderUsersModule = () => {
    const filteredUsers = users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = userFilterRole === 'ALL' || u.role === userFilterRole;
      const matchVerif = activeTab === 'verification' ? !u.isVerified : true; // Simple logic for queue
      return matchSearch && matchRole && matchVerif;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
                <input type="text" placeholder="Search users by name or email..." className="flex-1 bg-transparent px-4 text-sm font-bold outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <select className="bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase px-4 py-2 outline-none" value={userFilterRole} onChange={e => setUserFilterRole(e.target.value)}>
                    <option value="ALL">All Roles</option>
                    <option value="USER">User</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="ADMIN">Admin</option>
                </select>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">User Identity</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Role</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Status</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Wallet</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-blue-50/50 transition-colors group">
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={u.photo} className="w-8 h-8 rounded-full bg-gray-200" />
                                        <div>
                                            <p className="text-xs font-black text-gray-900">{u.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-4"><span className="text-[9px] font-black uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-600">{u.role}</span></td>
                                <td className="px-8 py-4">
                                    {u.isSuspended ? <span className="text-rose-500 font-black text-[9px] uppercase">Suspended</span> : (u.isVerified ? <span className="text-blue-500 font-black text-[9px] uppercase">Verified</span> : <span className="text-gray-400 font-black text-[9px] uppercase">Active</span>)}
                                </td>
                                <td className="px-8 py-4 font-mono font-bold text-xs">₹{u.walletBalance.toLocaleString()}</td>
                                <td className="px-8 py-4 text-right">
                                    <button onClick={() => setSelectedUserId(u.id)} className="text-gray-300 hover:text-blue-600 font-black text-[10px] uppercase border border-gray-200 hover:border-blue-200 px-3 py-1 rounded-lg transition-all">Manage</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && <div className="p-10 text-center text-gray-400 font-bold uppercase text-xs">No users found matching criteria.</div>}
            </div>
        </div>
    );
  }

  const renderListings = () => {
      const filteredListings = listings.filter(l => {
          const matchStatus = listingFilterStatus === 'ALL' || l.status === listingFilterStatus;
          const matchCat = listingFilterCategory === 'ALL' || l.category === listingFilterCategory;
          const matchTab = activeTab === 'pending' ? (l.status === 'PENDING' || l.status === 'EDIT_PENDING') : true;
          return matchStatus && matchCat && matchTab;
      });

      return (
          <div className="space-y-6">
              <div className="flex gap-4 bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
                  <select className="bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase px-4 py-2 outline-none" value={listingFilterCategory} onChange={e => setListingFilterCategory(e.target.value)}>
                      <option value="ALL">All Categories</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  {activeTab === 'master' && (
                      <select className="bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase px-4 py-2 outline-none" value={listingFilterStatus} onChange={e => setListingFilterStatus(e.target.value)}>
                          <option value="ALL">All Statuses</option>
                          <option value="APPROVED">Live</option>
                          <option value="PENDING">Pending</option>
                          <option value="REJECTED">Rejected</option>
                          <option value="DISABLED">Disabled</option>
                      </select>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredListings.map(l => (
                      <div key={l.id} className="bg-white p-4 rounded-[2rem] border border-gray-100 hover:shadow-xl transition-all group flex flex-col">
                          <div className="relative h-40 rounded-2xl overflow-hidden mb-4">
                              <img src={l.images[0]} className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">{l.status}</div>
                              {l.isPremium && <div className="absolute bottom-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded text-[8px] font-black uppercase"><i className="fas fa-crown"></i></div>}
                          </div>
                          <h4 className="font-black text-gray-900 text-sm line-clamp-1">{l.title}</h4>
                          <p className="text-xs font-bold text-gray-500 mt-1">₹{l.price.toLocaleString()}</p>
                          <div className="mt-4 flex gap-2">
                              <button onClick={() => { setSelectedListingId(l.id); setDetailListing(l); }} className="flex-1 bg-gray-50 hover:bg-blue-50 text-blue-600 py-2 rounded-xl text-[9px] font-black uppercase transition-colors">Inspect</button>
                              <button onClick={() => { if(onViewAd) onViewAd(l); }} className="w-10 bg-gray-50 hover:bg-gray-100 text-gray-400 py-2 rounded-xl text-[9px] font-black uppercase transition-colors"><i className="fas fa-external-link-alt"></i></button>
                          </div>
                      </div>
                  ))}
                  {filteredListings.length === 0 && <div className="col-span-3 text-center py-10 text-gray-400 text-xs font-bold uppercase">No inventory matches filter.</div>}
              </div>
          </div>
      )
  }

  const renderSystem = () => {
    if (activeTab === 'logs') {
        return (
            <div className="bg-black text-green-400 p-8 rounded-[2rem] font-mono text-xs h-[600px] overflow-y-auto shadow-2xl">
                {logs.length === 0 ? <p className="opacity-50">// System logs are empty.</p> : logs.map(log => (
                    <div key={log.id} className="mb-2 border-b border-green-900/30 pb-2">
                        <span className="opacity-50">[{new Date(log.timestamp).toISOString()}]</span> <span className="text-blue-400">[{log.severity}]</span> {log.action} - {log.details} <span className="opacity-30">@{log.ip}</span>
                    </div>
                ))}
            </div>
        )
    }
    if (activeTab === 'cleanup') {
        return (
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm text-center">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 text-3xl"><i className="fas fa-broom"></i></div>
                    <h3 className="text-xl font-black text-gray-900 uppercase">System Maintenance Purge</h3>
                    <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">Permanently remove listing assets that exceed retention policies.</p>
                    
                    <div className="mt-8 space-y-4 text-left">
                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Retention Period (Months)</label><input type="number" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" value={cleanupMonths} onChange={e => setCleanupMonths(Number(e.target.value))} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">City Scope</label>
                            <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-xs" value={cleanupCityId} onChange={e => setCleanupCityId(e.target.value)}>
                                <option value="ALL">All Cities</option>
                                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Target User Type</label>
                            <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-xs" value={cleanupUserType} onChange={e => setCleanupUserType(e.target.value as any)}>
                                <option value="ALL">All Users</option>
                                <option value="VERIFIED">Verified Only</option>
                                <option value="PROFESSIONAL">Admins/Mods Only</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <p className="text-rose-700 font-bold text-xs">Matching Inventory: {filteredCleanupAds.length} Listings</p>
                    </div>

                    <button onClick={handleExecuteCleanup} disabled={isProcessing || filteredCleanupAds.length === 0} className="w-full mt-6 bg-rose-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all">Execute Purge Sequence</button>
                </div>
            </div>
        )
    }
    if (activeTab === 'site') {
        return (
            <div className="max-w-4xl mx-auto bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                 <h4 className="text-sm font-black uppercase text-gray-900 border-b border-gray-100 pb-4">Brand Assets</h4>
                 <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Site Identity</label>
                         <input type="text" className="w-full bg-gray-50 border p-3 rounded-xl text-sm font-bold" value={config.siteName} onChange={e => setConfig({...config, siteName: e.target.value})} />
                         <input type="text" className="w-full bg-gray-50 border p-3 rounded-xl text-sm font-bold" value={config.branding.siteTagline} onChange={e => setConfig({...config, branding: {...config.branding, siteTagline: e.target.value}})} placeholder="Tagline" />
                     </div>
                     <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Contact</label>
                         <input type="text" className="w-full bg-gray-50 border p-3 rounded-xl text-sm font-bold" value={config.branding.supportEmail} onChange={e => setConfig({...config, branding: {...config.branding, supportEmail: e.target.value}})} placeholder="Email" />
                         <input type="text" className="w-full bg-gray-50 border p-3 rounded-xl text-sm font-bold" value={config.branding.supportPhone} onChange={e => setConfig({...config, branding: {...config.branding, supportPhone: e.target.value}})} placeholder="Phone" />
                     </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Logos</label>
                    <div className="flex gap-4">
                        <div className="flex-1 relative h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group">
                             {config.logoUrl ? <img src={config.logoUrl} className="h-full object-contain" /> : <span className="text-gray-400 text-xs font-bold uppercase">Main Logo</span>}
                             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleConfigLogoUpload(e, 'logoUrl')} />
                        </div>
                        <div className="flex-1 relative h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group">
                             {config.branding.pwaIcon ? <img src={config.branding.pwaIcon} className="h-full object-contain" /> : <span className="text-gray-400 text-xs font-bold uppercase">App Icon</span>}
                             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleConfigLogoUpload(e, 'branding.pwaIcon')} />
                        </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Footer Resource Links</label>
                    <div className="space-y-2">
                        {(config.branding.resourceLinks || []).map((link, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <span className="bg-gray-100 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 flex-1">{link.label}</span>
                                <button onClick={() => removeResourceLink(i)} className="text-rose-500 hover:text-rose-700 px-2"><i className="fas fa-trash"></i></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                        <input type="text" placeholder="Label" className="w-1/3 bg-gray-50 border p-2 rounded-xl text-xs font-bold" value={newResource.label} onChange={e => setNewResource({...newResource, label: e.target.value})} />
                        <input type="text" placeholder="URL (# for internal)" className="w-1/3 bg-gray-50 border p-2 rounded-xl text-xs font-bold" value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} />
                        <button onClick={addResourceLink} className="w-1/3 bg-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase hover:bg-gray-300">Add Link</button>
                    </div>
                    <textarea placeholder="Page Content (Markdown supported for internal pages)" className="w-full bg-gray-50 border p-3 rounded-xl text-xs font-medium h-24" value={newResource.content || ''} onChange={e => setNewResource({...newResource, content: e.target.value})} />
                 </div>

                 <button onClick={handleConfigCommit} disabled={isProcessing} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Save Configuration</button>
            </div>
        )
    }
    return null;
  }

  const renderListingDetailModal = () => {
    if (!detailListing || !selectedListingId) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 h-[90vh] flex flex-col">
                 <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                     <div>
                         <h3 className="text-2xl font-black text-gray-900">Listing Inspector</h3>
                         <p className="text-xs text-gray-400 font-bold uppercase mt-1">ID: {detailListing.id}</p>
                     </div>
                     <button onClick={() => setSelectedListingId(null)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-gray-400 hover:text-rose-500 transition-colors"><i className="fas fa-times"></i></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          {/* Media Preview Section */}
                          <div className="space-y-6">
                              <label className="text-[10px] font-black uppercase text-gray-400">Media Assets</label>
                              <div className="grid grid-cols-2 gap-4">
                                  {detailListing.images.map((img, i) => (
                                      <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm group relative">
                                          <img src={img} className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                      </div>
                                  ))}
                              </div>
                              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                                  <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black uppercase text-gray-400">Views Counter</span>
                                      <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{detailListing.views} Impressions</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black uppercase text-gray-400">Submission Date</span>
                                      <span className="text-xs font-bold text-gray-700">{new Date(detailListing.createdAt).toLocaleString()}</span>
                                  </div>
                              </div>
                          </div>

                          {/* Data Form Section */}
                          <div className="space-y-6">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-gray-400">Listing Title</label>
                                  <input type="text" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none focus:bg-white transition-all" value={detailListing.title} onChange={e => setDetailListing({...detailListing, title: e.target.value})} />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black uppercase text-gray-400">Asset Price (₹)</label>
                                      <input type="number" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-sm outline-none focus:bg-white transition-all" value={detailListing.price} onChange={e => setDetailListing({...detailListing, price: Number(e.target.value)})} />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black uppercase text-gray-400">Ad Status</label>
                                      <select className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-black uppercase text-[10px] outline-none focus:bg-white transition-all" value={detailListing.status} onChange={e => setDetailListing({...detailListing, status: e.target.value as ListingStatus})}>
                                          <option value="APPROVED">Live / Approved</option>
                                          <option value="PENDING">Pending Review</option>
                                          <option value="EDIT_PENDING">Edit Review</option>
                                          <option value="REJECTED">Rejected</option>
                                          <option value="DISABLED">Disabled</option>
                                      </select>
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black uppercase text-gray-400">Category Tag</label>
                                      <select className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailListing.category} onChange={e => setDetailListing({...detailListing, category: e.target.value})}>
                                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                      </select>
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black uppercase text-gray-400">Product Condition</label>
                                      <select className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailListing.productType || 'Universal'} onChange={e => setDetailListing({...detailListing, productType: e.target.value as any})}>
                                          <option value="New">New / Fresh</option>
                                          <option value="Used">Pre-owned / Used</option>
                                          <option value="Universal">Service / Universal</option>
                                      </select>
                                  </div>
                              </div>

                              <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-gray-400">Marketplace Location (City)</label>
                                  <select className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:bg-white transition-all" value={detailListing.cityId} onChange={e => setDetailListing({...detailListing, cityId: e.target.value})}>
                                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                              </div>

                              <div className="space-y-1">
                                  <label className="text-[10px] font-black uppercase text-gray-400">Asset Narrative / Description</label>
                                  <textarea rows={4} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-medium text-sm outline-none focus:bg-white transition-all" value={detailListing.description} onChange={e => setDetailListing({...detailListing, description: e.target.value})} />
                              </div>

                              <div className="pt-4 flex items-center gap-6 bg-amber-50 p-6 rounded-3xl border border-amber-100">
                                 <div onClick={() => setDetailListing({...detailListing, isPremium: !detailListing.isPremium})} className={`w-14 h-8 rounded-full flex items-center px-1 cursor-pointer transition-colors ${detailListing.isPremium ? 'bg-amber-400' : 'bg-gray-300'}`}>
                                     <div className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform ${detailListing.isPremium ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                 </div>
                                 <div>
                                     <p className="text-xs font-black text-gray-900 uppercase">Premium Placement</p>
                                     <p className="text-[9px] text-amber-700 font-bold uppercase">{detailListing.isPremium ? 'High Visibility Active' : 'Standard Placement'}</p>
                                 </div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex justify-end gap-4 pt-8 border-t border-gray-100">
                          <button onClick={() => handleListingDelete(detailListing.id)} className="bg-rose-50 text-rose-600 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 hover:text-white transition-all">Destroy Asset</button>
                          <button onClick={handleListingSave} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-black transition-all">Commit Changes</button>
                      </div>
                 </div>
             </div>
        </div>
    );
  }

  // --- REPLACED MODAL WITH FULL PAGE VIEW ---
  const renderUserDetailView = () => {
      if (!detailUser || !selectedUserId) return null;
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
             {/* Header */}
             <div className="flex items-center gap-6 mb-8">
                 <button onClick={() => setSelectedUserId(null)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-gray-400 hover:text-blue-600 transition-colors border border-gray-100"><i className="fas fa-arrow-left"></i></button>
                 <div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">User Profile Manager</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase mt-1 tracking-widest">ID: {detailUser.id}</p>
                 </div>
             </div>

             <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                 {/* Top User Info Card */}
                 <div className="p-10 border-b border-gray-100 flex flex-col md:flex-row items-center gap-8 bg-gray-50/30">
                     <img src={detailUser.photo} className="w-24 h-24 rounded-[2rem] bg-gray-200 object-cover shadow-lg" />
                     <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-black text-gray-900">{detailUser.name}</h3>
                        <p className="text-xs text-gray-500 font-bold uppercase mt-1 tracking-widest">{detailUser.email}</p>
                        <div className="flex gap-2 mt-4 justify-center md:justify-start">
                            {detailUser.isVerified && <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[9px] font-black uppercase"><i className="fas fa-check-circle mr-1"></i> Verified</span>}
                            {detailUser.isSuspended && <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black uppercase"><i className="fas fa-ban mr-1"></i> Suspended</span>}
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[9px] font-black uppercase">Role: {detailUser.role}</span>
                        </div>
                     </div>
                 </div>

                 {/* Tabs */}
                 <div className="flex border-b border-gray-100 px-10 overflow-x-auto">
                     {['IDENTITY', 'FINANCIAL', 'INVENTORY', 'RATINGS'].map(tab => (
                         <button key={tab} onClick={() => setActiveUserDetailTab(tab as any)} className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeUserDetailTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{tab}</button>
                     ))}
                 </div>

                 <div className="p-10 bg-white">
                     {activeUserDetailTab === 'IDENTITY' && (
                         <div className="max-w-4xl mx-auto space-y-10">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 {/* Basic Info */}
                                 <div className="space-y-6">
                                     <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 border-b border-blue-50 pb-2">Basic Information</h4>
                                     <div className="space-y-4">
                                         <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Full Name</label><input type="text" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={detailUser.name} onChange={e => setDetailUser({...detailUser, name: e.target.value})} /></div>
                                         <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Email Address</label><input type="email" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={detailUser.email} onChange={e => setDetailUser({...detailUser, email: e.target.value})} /></div>
                                         <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">System Role</label>
                                            <select className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={detailUser.role} onChange={e => setDetailUser({...detailUser, role: e.target.value as any})}>
                                                <option value="USER">User</option><option value="MODERATOR">Moderator</option><option value="ADMIN">Admin</option>
                                            </select>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Contact & Location */}
                                 <div className="space-y-6">
                                     <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 border-b border-blue-50 pb-2">Contact & Location</h4>
                                     <div className="grid grid-cols-2 gap-4">
                                         <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Mobile</label><input type="text" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={detailUser.mobile || ''} onChange={e => setDetailUser({...detailUser, mobile: e.target.value})} /></div>
                                         <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">WhatsApp</label><input type="text" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={detailUser.whatsapp || ''} onChange={e => setDetailUser({...detailUser, whatsapp: e.target.value})} /></div>
                                     </div>
                                     <div className="grid grid-cols-3 gap-4">
                                         <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400">Country</label>
                                            <select className="w-full bg-gray-50 border p-3 rounded-2xl font-bold text-xs" value={userDetailForm.countryId} onChange={e => handleUserDetailCountryChange(e.target.value)}>
                                                <option value="">Select</option>{countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                         </div>
                                         <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400">State</label>
                                            <select className="w-full bg-gray-50 border p-3 rounded-2xl font-bold text-xs" value={userDetailForm.stateId} onChange={e => handleUserDetailStateChange(e.target.value)}>
                                                <option value="">Select</option>{detailStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                         </div>
                                         <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400">City</label>
                                            <select className="w-full bg-gray-50 border p-3 rounded-2xl font-bold text-xs" value={userDetailForm.cityId} onChange={e => handleUserDetailCityChange(e.target.value)}>
                                                <option value="">Select</option>{detailCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                         </div>
                                     </div>
                                     <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400">Address</label><textarea rows={2} className="w-full bg-gray-50 border p-4 rounded-2xl font-bold text-sm" value={detailUser.address || ''} onChange={e => setDetailUser({...detailUser, address: e.target.value})} /></div>
                                 </div>
                             </div>

                             {/* Actions & Toggles */}
                             <div className="pt-8 border-t border-gray-100">
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Account Actions</h4>
                                 <div className="flex flex-wrap items-center gap-8">
                                     
                                     {/* Verification Toggle */}
                                     <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 pr-8">
                                         <div onClick={() => setDetailUser({...detailUser, isVerified: !detailUser.isVerified})} className={`w-14 h-8 rounded-full flex items-center px-1 cursor-pointer transition-colors ${detailUser.isVerified ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                             <div className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform ${detailUser.isVerified ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                         </div>
                                         <div>
                                             <p className="text-xs font-black text-gray-900">Verification Status</p>
                                             <p className="text-[9px] text-gray-400 uppercase font-bold">{detailUser.isVerified ? 'Verified Account' : 'Unverified'}</p>
                                         </div>
                                     </div>

                                     {/* Suspension Toggle */}
                                     <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 pr-8">
                                         <div onClick={() => setDetailUser({...detailUser, isSuspended: !detailUser.isSuspended})} className={`w-14 h-8 rounded-full flex items-center px-1 cursor-pointer transition-colors ${detailUser.isSuspended ? 'bg-rose-600' : 'bg-gray-300'}`}>
                                             <div className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform ${detailUser.isSuspended ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                         </div>
                                         <div>
                                             <p className="text-xs font-black text-gray-900">Account Suspension</p>
                                             <p className="text-[9px] text-gray-400 uppercase font-bold">{detailUser.isSuspended ? 'Account Suspended' : 'Active Account'}</p>
                                         </div>
                                     </div>

                                     <div className="flex-1 text-right">
                                         <button onClick={saveDetailProfile} disabled={isProcessing} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl">Save Changes</button>
                                     </div>
                                 </div>
                                 <p className="text-[9px] text-gray-400 mt-4 italic">* Suspending an account will automatically disable all active listings. Reactivating will restore them.</p>
                             </div>
                         </div>
                     )}
                     {activeUserDetailTab === 'FINANCIAL' && (
                         <div className="space-y-8 max-w-4xl mx-auto">
                             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex justify-between items-center">
                                 <div><p className="text-[10px] font-black uppercase text-gray-400">Wallet Balance</p><p className="text-4xl font-black text-gray-900 mt-1">₹{detailUser.walletBalance.toLocaleString()}</p></div>
                                 <div className="space-y-2">
                                     <div className="flex gap-2">
                                         <input type="number" placeholder="Amount" className="w-32 bg-gray-50 border p-3 rounded-xl text-sm font-bold" value={walletForm.amount} onChange={e => setWalletForm({...walletForm, amount: e.target.value})} />
                                         <select className="bg-gray-50 border p-3 rounded-xl text-sm font-bold" value={walletForm.type} onChange={e => setWalletForm({...walletForm, type: e.target.value as any})}><option value="CREDIT">Credit</option><option value="DEBIT">Debit</option></select>
                                     </div>
                                     <input type="text" placeholder="Reason" className="w-full bg-gray-50 border p-3 rounded-xl text-xs" value={walletForm.reason} onChange={e => setWalletForm({...walletForm, reason: e.target.value})} />
                                     <button onClick={handleWalletAdjustment} className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase">Execute Adjustment</button>
                                 </div>
                             </div>
                             <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Transaction History</h4>
                             <table className="w-full text-left bg-gray-50 rounded-[2rem] overflow-hidden border border-gray-100">
                                 <tbody className="divide-y divide-gray-200">
                                     {detailTxns.map(tx => (
                                         <tr key={tx.id} className="text-xs hover:bg-white transition-colors">
                                             <td className="p-6 text-gray-500 font-bold">{new Date(tx.timestamp).toLocaleDateString()}</td>
                                             <td className="p-6 font-bold text-gray-900">{tx.description}</td>
                                             <td className={`p-6 font-mono font-black text-right ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.type === 'CREDIT' ? '+' : '-'} {tx.amount}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     )}
                     {activeUserDetailTab === 'INVENTORY' && (
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                             {detailAds.map(ad => (
                                 <div key={ad.id} onClick={() => setSelectedListingId(ad.id)} className="bg-white p-4 rounded-[2rem] border border-gray-100 flex gap-4 cursor-pointer hover:shadow-xl transition-all group">
                                     <img src={ad.images[0]} className="w-20 h-20 rounded-2xl object-cover bg-gray-100" />
                                     <div className="flex flex-col justify-center">
                                         <h5 className="font-black text-gray-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">{ad.title}</h5>
                                         <p className="text-xs text-gray-500 font-bold mt-1">₹{ad.price.toLocaleString()}</p>
                                         <span className={`text-[8px] font-black uppercase mt-2 px-2 py-0.5 rounded w-fit ${ad.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{ad.status}</span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                     {activeUserDetailTab === 'RATINGS' && (
                         <div className="space-y-4 max-w-3xl mx-auto">
                             {detailRatings.map(r => (
                                 <div key={r.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 relative group hover:shadow-md transition-all">
                                     <div className="flex justify-between mb-2">
                                         <span className="font-black text-xs text-gray-900 uppercase">{r.fromUserName}</span>
                                         <div className="text-yellow-400 text-xs">{'★'.repeat(Math.round(r.score))}</div>
                                     </div>
                                     <p className="text-sm text-gray-600 italic leading-relaxed">"{r.comment}"</p>
                                     <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                         <button onClick={() => handleRatingEdit(r.id)} className="text-blue-500 hover:text-blue-700 bg-blue-50 w-8 h-8 rounded-full flex items-center justify-center"><i className="fas fa-pen text-xs"></i></button>
                                         <button onClick={() => handleRatingDelete(r.id)} className="text-rose-500 hover:text-rose-700 bg-rose-50 w-8 h-8 rounded-full flex items-center justify-center"><i className="fas fa-trash text-xs"></i></button>
                                     </div>
                                 </div>
                             ))}
                             {detailRatings.length === 0 && <p className="text-center text-gray-400 text-xs font-bold uppercase tracking-widest py-10">No ratings available.</p>}
                         </div>
                     )}
                 </div>
             </div>
        </div>
      );
  }

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
             <button key={item.id} onClick={() => { setActiveMenu(item.id as MainMenu); setSelectedUserId(null); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMenu === item.id ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/20 translate-x-2' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
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
           {/* If selectedUserId is set, show the Detail Page View, otherwise show the standard dashboard content */}
           {selectedUserId ? (
               renderUserDetailView()
           ) : (
               <>
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
               </>
           )}
        </div>
      </main>

      {renderListingDetailModal()}
      {/* NOTE: renderUserDetailModal is removed as we switched to full page view 'renderUserDetailView' */}
    </div>
  );
};
