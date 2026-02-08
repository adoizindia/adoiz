import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { 
  User, UserRole, Listing, ListingStatus, WalletTransaction, 
  SystemConfig, City, State, Country, Category, BannerAd,
  SecurityLog, Rating, SubscriptionPlan
} from '../types';
import { CITIES, STATES } from '../constants';

type MainMenu = 
  | 'DASHBOARD' | 'USERS' | 'LISTINGS' | 'GEO_CATS' | 'REVENUE' | 'SYSTEM';

type UserDetailTab = 'IDENTITY' | 'FINANCIAL' | 'INVENTORY' | 'RATINGS';

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
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);

  // Geo & Cats Data
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Local UI filters for Inventory
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<ListingStatus | 'ALL'>('ALL');

  // Geo Filters for Saved Locations
  const [geoFilterCountry, setGeoFilterCountry] = useState('');
  const [geoFilterState, setGeoFilterState] = useState('');
  const [geoSearchQuery, setGeoSearchQuery] = useState('');

  // Selection & Detail States
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [detailAds, setDetailAds] = useState<Listing[]>([]);
  const [detailTxns, setDetailTxns] = useState<WalletTransaction[]>([]);
  const [walletForm, setWalletForm] = useState({ amount: '', type: 'CREDIT' as 'CREDIT' | 'DEBIT', reason: '' });

  // User Identity Edit Form
  const [userEditForm, setUserEditForm] = useState<Partial<User>>({});
  
  // Listing Edit Form
  const [listingEditForm, setListingEditForm] = useState<Partial<Listing>>({});

  // Forms for Geo/Cats
  const [geoForm, setGeoForm] = useState({ 
    type: 'CITY' as 'COUNTRY' | 'STATE' | 'CITY',
    name: '',
    parentId: '',
    code: ''
  });
  const [catForm, setCatForm] = useState({ name: '', icon: 'fa-box' });

  // Plan Form
  const [planForm, setPlanForm] = useState<Partial<SubscriptionPlan>>({ name: '', price: 0, durationDays: 30, features: [] });
  const [newFeature, setNewFeature] = useState('');

  // Added missing helper to resolve "Cannot find name 'getCityName'" error
  const getCityName = (id: string) => CITIES.find(c => c.id === id)?.name || id;

  // Initial Load
  useEffect(() => {
    loadData();
    const tabs = getTabsForMenu(activeMenu);
    if (tabs.length > 0) setActiveTab(tabs[0].id);
    setSearchQuery('');
  }, [activeMenu]);

  useEffect(() => {
    if (selectedUserId) loadUserDetails(selectedUserId);
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedListingId) loadListingDetails(selectedListingId);
  }, [selectedListingId]);

  const loadData = async () => {
    setLoading(true);
    const [u, l, b, s, txns, ctrs, sts, cts, cats] = await Promise.all([
      dbService.getAllUsers(),
      dbService.getAllListings(),
      dbService.getAllBanners(),
      dbService.getSecurityLogs(),
      dbService.getAllTransactions(),
      dbService.getCountries(),
      dbService.getStates(),
      dbService.getCities(),
      dbService.getCategories()
    ]);
    setUsers(u);
    setListings(l);
    setBanners(b || []);
    setLogs(s);
    setAllTransactions(txns);
    setCountries(ctrs);
    setStates(sts);
    setCities(cts);
    setCategories(cats);
    setLoading(false);
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
      setUserEditForm({ ...u });
      setDetailAds(ads);
      setDetailTxns(txns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }
    setIsProcessing(false);
  };

  const loadListingDetails = async (id: string) => {
    setIsProcessing(true);
    const all = await dbService.getAllListings();
    const found = all.find(item => item.id === id);
    if (found) {
      setDetailListing(found);
      setListingEditForm({ ...found });
    }
    setIsProcessing(false);
  };

  const handleConfigCommit = async () => {
    setIsProcessing(true);
    try {
      await dbService.updateSystemConfig(config);
      notify("Platform settings updated successfully.", "success");
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddPlan = () => {
    if (!planForm.name || !planForm.price) return;
    const newPlan: SubscriptionPlan = {
      id: `plan_${Date.now()}`,
      name: planForm.name!,
      price: planForm.price!,
      durationDays: planForm.durationDays!,
      features: planForm.features || []
    };
    const updatedPlans = [...config.subscriptionPlans, newPlan];
    setConfig({...config, subscriptionPlans: updatedPlans});
    setPlanForm({ name: '', price: 0, durationDays: 30, features: [] });
    notify("New plan added. Click 'Save' to apply changes.", "info");
  };

  const removePlan = (id: string) => {
    setConfig({...config, subscriptionPlans: config.subscriptionPlans.filter(p => p.id !== id)});
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setPlanForm({...planForm, features: [...(planForm.features || []), newFeature.trim()]});
    setNewFeature('');
  };

  const handleWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailUser || !walletForm.amount) return;
    setIsProcessing(true);
    try {
      const updated = await dbService.adminAdjustWallet(detailUser.id, Number(walletForm.amount), walletForm.type, walletForm.reason || 'Admin adjustment', user.id);
      setDetailUser(updated);
      setWalletForm({ amount: '', type: 'CREDIT', reason: '' });
      await loadUserDetails(detailUser.id);
      notify("User wallet updated successfully.", "success");
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // User Identity Update Handler
  const handleUserIdentityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailUser) return;
    setIsProcessing(true);
    try {
      const updated = await dbService.adminUpdateUser(detailUser.id, userEditForm, user.id);
      if (updated) {
        setDetailUser(updated);
        notify("User information updated successfully.", "success");
        loadData();
      }
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCityAssignment = (cityId: string) => {
    const current = userEditForm.managedCityIds || [];
    const updated = current.includes(cityId) 
      ? current.filter(id => id !== cityId)
      : [...current, cityId];
    setUserEditForm({ ...userEditForm, managedCityIds: updated });
  };

  // Inventory Management Handlers
  const handleListingStatusUpdate = async (id: string, status: ListingStatus) => {
    setIsProcessing(true);
    try {
      await dbService.updateListingStatus(id, status, undefined, user.id);
      notify(`Ad ${status.toLowerCase()} successfully.`, "success");
      loadData();
      if (selectedListingId === id) {
        loadListingDetails(id);
      }
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleListingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailListing) return;
    setIsProcessing(true);
    try {
      const updated = await dbService.updateListing(detailListing.id, listingEditForm);
      setDetailListing(updated);
      notify("Ad details updated successfully.", "success");
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleListingDelete = async (id: string) => {
    if (!window.confirm("Delete this ad permanently?")) return;
    setIsProcessing(true);
    try {
      await dbService.deleteListing(id);
      notify("Ad removed permanently.", "error");
      loadData();
      if (selectedListingId === id) setSelectedListingId(null);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // GEO & CATS Handlers
  const handleAddGeo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (geoForm.type === 'CITY') {
        await dbService.addCity({ name: geoForm.name, stateId: geoForm.parentId });
      }
      notify(`${geoForm.type} added successfully.`, "success");
      setGeoForm({ ...geoForm, name: '', code: '' });
      loadData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    notify("New category added to the list.", "info");
    setIsProcessing(false);
  };

  function getTabsForMenu(menu: MainMenu) {
    switch(menu) {
      case 'DASHBOARD': return [{ id: 'platform_meta', label: 'Platform Overview' }];
      case 'USERS': return [{ id: 'all_users', label: 'User List' }];
      case 'LISTINGS': return [{ id: 'inventory', label: 'All Ads' }];
      case 'GEO_CATS': return [
        { id: 'locations', label: 'Locations' },
        { id: 'categories', label: 'Categories' }
      ];
      case 'REVENUE': return [
        { id: 'pricing', label: 'Ad Pricing' }, 
        { id: 'subscribe', label: 'Plans' },
        { id: 'banner_ads', label: 'Banners' },
        { id: 'adsense', label: 'External Ads' }
      ];
      case 'SYSTEM': return [{ id: 'branding', label: 'Design & Text' }, { id: 'logs', label: 'Activity Logs' }];
      default: return [];
    }
  }

  // Filtered Cities logic for horizontal Geo view
  const filteredCitiesList = useMemo(() => {
    return cities.filter(city => {
      const state = states.find(s => s.id === city.stateId);
      const country = state ? countries.find(c => c.id === state.countryId) : null;
      
      const matchesCountry = !geoFilterCountry || (country && country.id === geoFilterCountry);
      const matchesState = !geoFilterState || (state && state.id === geoFilterState);
      const matchesSearch = !geoSearchQuery || city.name.toLowerCase().includes(geoSearchQuery.toLowerCase());
      
      return matchesCountry && matchesState && matchesSearch;
    });
  }, [cities, states, countries, geoFilterCountry, geoFilterState, geoSearchQuery]);

  const availableFilterStates = useMemo(() => {
    if (!geoFilterCountry) return states;
    return states.filter(s => s.countryId === geoFilterCountry);
  }, [states, geoFilterCountry]);

  // Admin Module: Dashboard Overview
  const renderDashboard = () => {
    const stats = [
      { label: 'Total Users', value: users.length, icon: 'fa-users', color: 'bg-blue-500' },
      { label: 'Live Ads', value: listings.filter(l => l.status === ListingStatus.APPROVED).length, icon: 'fa-box', color: 'bg-emerald-500' },
      { label: 'Awaiting Review', value: listings.filter(l => l.status === ListingStatus.PENDING || l.status === ListingStatus.EDIT_PENDING).length, icon: 'fa-clock', color: 'bg-amber-500' },
      { label: 'Total Revenue', value: `₹${allTransactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}`, icon: 'fa-money-bill-wave', color: 'bg-indigo-500' }
    ];

    return (
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
              <div className={`w-14 h-14 ${s.color} text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-gray-200`}><i className={`fas ${s.icon}`}></i></div>
              <div><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{s.label}</p><p className="text-2xl font-black text-gray-900">{s.value}</p></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-black uppercase text-gray-900 mb-6">Recent Platform Activity</h3>
              <div className="space-y-4">
                 {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all">
                       <div className={`w-1.5 h-10 rounded-full ${log.severity === 'CRITICAL' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                       <div><p className="text-xs font-bold text-gray-900">{log.action}</p><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{new Date(log.timestamp).toLocaleString()}</p></div>
                    </div>
                 ))}
              </div>
           </div>
           {onGoToModeration && (
             <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-black uppercase mb-4">Ad Approvals</h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">You have {listings.filter(l => l.status === ListingStatus.PENDING).length} new ads waiting for your approval in the moderation list.</p>
                </div>
                <button onClick={onGoToModeration} className="mt-8 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">Open Approval Center</button>
             </div>
           )}
        </div>
      </div>
    );
  };

  // Admin Module: Master Inventory Control
  const renderInventory = () => {
    let filtered = listings.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.id.toLowerCase().includes(searchQuery.toLowerCase()));
    if (inventoryStatusFilter !== 'ALL') {
      filtered = filtered.filter(l => l.status === inventoryStatusFilter);
    }

    return (
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 border-b border-gray-50 space-y-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input type="text" placeholder="Search ads by name or ID..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
                 {(['ALL', ListingStatus.APPROVED, ListingStatus.PENDING, ListingStatus.REJECTED] as const).map(s => (
                   <button key={s} onClick={() => setInventoryStatusFilter(s)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${inventoryStatusFilter === s ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{s === 'ALL' ? 'All Ads' : s}</button>
                 ))}
              </div>
           </div>
        </div>
        
        <table className="w-full text-left">
           <thead>
              <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50">
                 <th className="px-10 py-6">Ad Info</th>
                 <th className="px-10 py-6">City</th>
                 <th className="px-10 py-6">Seller ID</th>
                 <th className="px-10 py-6">Price</th>
                 <th className="px-10 py-6">Status</th>
                 <th className="px-10 py-6 text-right">Actions</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-50">
              {filtered.map(l => (
                <tr key={l.id} className="text-xs font-bold hover:bg-gray-50 transition-colors">
                   <td className="px-10 py-6">
                      <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setSelectedListingId(l.id)}>
                         <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-50 flex-shrink-0">
                            <img src={l.images[0]} className="w-full h-full object-cover" />
                         </div>
                         <div className="min-w-0">
                            <p className="text-gray-900 truncate max-w-[200px] group-hover:text-blue-600 transition-colors">{l.title}</p>
                            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-0.5">{l.category}</p>
                         </div>
                      </div>
                   </td>
                   <td className="px-10 py-6 text-gray-500 uppercase text-[9px]">{getCityName(l.cityId)}</td>
                   <td className="px-10 py-6 text-gray-400 text-[9px] font-mono">{l.sellerId}</td>
                   <td className="px-10 py-6 text-gray-900">₹{l.price.toLocaleString()}</td>
                   <td className="px-10 py-6">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${l.status === ListingStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : l.status === ListingStatus.PENDING ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>{l.status}</span>
                   </td>
                   <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <button onClick={() => setSelectedListingId(l.id)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center" title="Manage"><i className="fas fa-cog text-[10px]"></i></button>
                         {onViewAd && <button onClick={() => onViewAd(l)} className="w-8 h-8 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center" title="View"><i className="fas fa-eye text-[10px]"></i></button>}
                         {l.status !== ListingStatus.APPROVED && (
                           <button onClick={() => handleListingStatusUpdate(l.id, ListingStatus.APPROVED)} className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center" title="Approve"><i className="fas fa-check text-[10px]"></i></button>
                         )}
                         {l.status !== ListingStatus.REJECTED && (
                           <button onClick={() => handleListingStatusUpdate(l.id, ListingStatus.REJECTED)} className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center" title="Reject"><i className="fas fa-times text-[10px]"></i></button>
                         )}
                         <button onClick={() => handleListingDelete(l.id)} className="w-8 h-8 bg-slate-900 text-slate-400 rounded-lg hover:bg-black hover:text-rose-500 transition-all flex items-center justify-center" title="Remove"><i className="fas fa-trash text-[10px]"></i></button>
                      </div>
                   </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-10 py-20 text-center text-gray-400 font-black uppercase text-xs">No ads found.</td></tr>
              )}
           </tbody>
        </table>
      </div>
    );
  };

  // Admin Module: Ad Management Detail View
  const renderAdManagement = () => {
    if (!detailListing) return <div className="py-20 text-center"><i className="fas fa-circle-notch fa-spin text-4xl text-blue-600"></i></div>;
    
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex items-center justify-between">
            <button onClick={() => setSelectedListingId(null)} className="flex items-center gap-2 text-gray-400 hover:text-blue-600 font-black uppercase text-[10px] tracking-widest transition-all"><i className="fas fa-arrow-left"></i> Back to Inventory</button>
            <div className="flex gap-3">
               <button onClick={() => handleListingStatusUpdate(detailListing.id, ListingStatus.APPROVED)} disabled={detailListing.status === ListingStatus.APPROVED} className="px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-emerald-600 text-white disabled:opacity-50">Approve</button>
               <button onClick={() => handleListingStatusUpdate(detailListing.id, ListingStatus.REJECTED)} disabled={detailListing.status === ListingStatus.REJECTED} className="px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-rose-600 text-white disabled:opacity-50">Reject</button>
               <button onClick={() => handleListingDelete(detailListing.id)} className="px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-slate-900 text-white">Delete Ad</button>
            </div>
         </div>

         <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
            <div className="w-48 h-48 rounded-[2rem] overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
               <img src={detailListing.images[0]} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-4 flex-wrap">
                  <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{detailListing.title}</h2>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${detailListing.status === ListingStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{detailListing.status}</span>
                  {detailListing.isPremium && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"><i className="fas fa-crown mr-1"></i> Premium</span>}
               </div>
               <div className="flex gap-6 mt-4 flex-wrap">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><i className="fas fa-tag mr-1.5 text-blue-600"></i> {detailListing.category}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><i className="fas fa-location-dot mr-1.5 text-rose-500"></i> {getCityName(detailListing.cityId)}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><i className="fas fa-user-circle mr-1.5 text-gray-600"></i> Seller: {detailListing.sellerId}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><i className="fas fa-eye mr-1.5 text-indigo-500"></i> {detailListing.views} Views</span>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
               <h3 className="text-xl font-black uppercase text-gray-900 mb-8">Admin Edit: Product Information</h3>
               <form onSubmit={handleListingUpdate} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Listing Title</label>
                     <input type="text" className="w-full bg-gray-50 border p-4 rounded-xl text-sm font-bold" value={listingEditForm.title || ''} onChange={e => setListingEditForm({...listingEditForm, title: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Price (₹)</label>
                        <input type="number" className="w-full bg-gray-50 border p-4 rounded-xl text-sm font-bold" value={listingEditForm.price || ''} onChange={e => setListingEditForm({...listingEditForm, price: Number(e.target.value)})} />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Category</label>
                        <select className="w-full bg-gray-50 border p-4 rounded-xl text-xs font-bold" value={listingEditForm.category} onChange={e => setListingEditForm({...listingEditForm, category: e.target.value})}>
                           {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Product Type</label>
                        <select className="w-full bg-gray-50 border p-4 rounded-xl text-xs font-bold" value={listingEditForm.productType || 'Universal'} onChange={e => setListingEditForm({...listingEditForm, productType: e.target.value as any})}>
                           <option value="New">New</option>
                           <option value="Used">Used</option>
                           <option value="Universal">Universal</option>
                        </select>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Product Description</label>
                     <textarea className="w-full bg-gray-50 border p-4 rounded-xl text-sm font-bold h-40" value={listingEditForm.description || ''} onChange={e => setListingEditForm({...listingEditForm, description: e.target.value})} />
                  </div>
                  <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">Update Advertisement</button>
               </form>
            </div>
            
            <div className="space-y-10">
               <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black uppercase text-gray-900 mb-6">Moderation Controls</h3>
                  <div className="space-y-4">
                     <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Change Status Instantly</p>
                        <div className="grid grid-cols-2 gap-3">
                           {(['PENDING', 'APPROVED', 'REJECTED', 'DISABLED'] as ListingStatus[]).map(s => (
                              <button key={s} onClick={() => handleListingStatusUpdate(detailListing.id, s)} className={`py-3 rounded-xl text-[8px] font-black uppercase transition-all ${detailListing.status === s ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-400 hover:border-blue-500 hover:text-blue-500'}`}>{s}</button>
                           ))}
                        </div>
                     </div>
                     <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Visibility Settings</p>
                        <button onClick={() => setListingEditForm({...listingEditForm, isPremium: !listingEditForm.isPremium})} className={`w-full py-4 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-3 ${listingEditForm.isPremium ? 'bg-yellow-400 text-yellow-900' : 'bg-white border border-gray-200 text-gray-400'}`}>
                           <i className="fas fa-crown"></i>
                           {listingEditForm.isPremium ? 'Premium Active' : 'Make Premium'}
                        </button>
                     </div>
                  </div>
               </div>

               <div className="bg-slate-900 p-10 rounded-[3rem] text-white">
                  <h3 className="text-xl font-black uppercase mb-6">System Info</h3>
                  <div className="space-y-4">
                     <div><p className="text-[9px] font-black text-slate-500 uppercase">Registered On</p><p className="font-bold text-sm">{new Date(detailListing.createdAt).toLocaleString()}</p></div>
                     <div><p className="text-[9px] font-black text-slate-500 uppercase">System ID</p><p className="font-mono text-xs text-blue-400">{detailListing.id}</p></div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  };

  // Admin Module: Geo Nodes & Taxonomies
  const renderGeoCats = () => {
    if (activeTab === 'locations') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="lg:col-span-2 bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex flex-col gap-6">
                 <h3 className="text-xl font-black uppercase text-gray-900 tracking-tight">Saved Locations</h3>
                 
                 {/* New Filters Row (Horizontal Shift) */}
                 <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full space-y-1.5">
                       <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Search City</label>
                       <div className="relative">
                          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                          <input 
                            type="text" 
                            className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all" 
                            placeholder="Type city name..." 
                            value={geoSearchQuery}
                            onChange={e => setGeoSearchQuery(e.target.value)}
                          />
                       </div>
                    </div>
                    <div className="w-full md:w-48 space-y-1.5">
                       <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Filter Country</label>
                       <select 
                         className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none"
                         value={geoFilterCountry}
                         onChange={e => { setGeoFilterCountry(e.target.value); setGeoFilterState(''); }}
                       >
                          <option value="">All Countries</option>
                          {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                    <div className="w-full md:w-48 space-y-1.5">
                       <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Filter State</label>
                       <select 
                         className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none disabled:opacity-50"
                         disabled={!geoFilterCountry && countries.length > 1}
                         value={geoFilterState}
                         onChange={e => setGeoFilterState(e.target.value)}
                       >
                          <option value="">All States</option>
                          {availableFilterStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                    </div>
                 </div>
              </div>
              
              {/* Horizontal Table for Locations */}
              <div className="flex-1 overflow-x-auto">
                 <table className="w-full text-left min-w-[600px]">
                    <thead>
                       <tr className="text-[9px] font-black uppercase text-gray-400 border-b border-gray-50 bg-gray-50/20">
                          <th className="px-10 py-5">City Name</th>
                          <th className="px-10 py-5">State / Province</th>
                          <th className="px-10 py-5">Country</th>
                          <th className="px-10 py-5 text-right">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {filteredCitiesList.map(city => {
                          const state = states.find(s => s.id === city.stateId);
                          const country = state ? countries.find(c => c.id === state.countryId) : null;
                          return (
                            <tr key={city.id} className="hover:bg-gray-50 transition-colors">
                               <td className="px-10 py-5 text-xs font-bold text-gray-900">{city.name}</td>
                               <td className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-tighter">{state?.name || 'N/A'}</td>
                               <td className="px-10 py-5">
                                  <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                     {country?.name || 'N/A'}
                                  </span>
                               </td>
                               <td className="px-10 py-5 text-right">
                                  <span className="text-emerald-600 text-[8px] font-black uppercase tracking-widest">Active</span>
                               </td>
                            </tr>
                          );
                       })}
                       {filteredCitiesList.length === 0 && (
                         <tr>
                            <td colSpan={4} className="px-10 py-20 text-center text-gray-400 font-black uppercase text-[10px] tracking-widest italic">
                               No locations found matching your filters.
                            </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm h-fit sticky top-8">
              <h3 className="text-xl font-black uppercase text-gray-900 mb-8">Add New Place</h3>
              <form onSubmit={handleAddGeo} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Location Type</label>
                    <div className="grid grid-cols-3 gap-2">
                       {['COUNTRY', 'STATE', 'CITY'].map(type => (
                         <button key={type} type="button" onClick={() => setGeoForm({...geoForm, type: type as any})} className={`py-3 rounded-xl text-[8px] font-black uppercase transition-all ${geoForm.type === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{type}</button>
                       ))}
                    </div>
                 </div>
                 
                 {geoForm.type !== 'COUNTRY' && (
                   <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Select Parent</label>
                      <select required className="w-full bg-gray-50 border p-4 rounded-xl text-xs font-bold" value={geoForm.parentId} onChange={e => setGeoForm({...geoForm, parentId: e.target.value})}>
                         <option value="">Choose Parent</option>
                         {geoForm.type === 'STATE' ? countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>
                 )}

                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Name</label>
                    <input type="text" required className="w-full bg-gray-50 border p-4 rounded-xl text-xs font-bold" value={geoForm.name} onChange={e => setGeoForm({...geoForm, name: e.target.value})} placeholder="e.g. Maharashtra, Mumbai" />
                 </div>

                 <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Add to List</button>
              </form>
           </div>
        </div>
      );
    }

    if (activeTab === 'categories') {
       return (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
               {categories.map(cat => (
                 <div key={cat.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6 group hover:border-blue-200 transition-all">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                       <i className={`fas ${cat.icon}`}></i>
                    </div>
                    <div>
                       <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">{cat.name}</h4>
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{listings.filter(l => l.category === cat.name).length} Ads Listed</p>
                    </div>
                 </div>
               ))}
            </div>

            <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm h-fit sticky top-8">
               <h3 className="text-xl font-black uppercase text-gray-900 mb-8">Manage Categories</h3>
               <form onSubmit={handleAddCategory} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Category Name</label>
                     <input type="text" required className="w-full bg-gray-50 border p-4 rounded-xl text-xs font-bold" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="e.g. Electronics, Rentals" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Icon (FontAwesome)</label>
                     <div className="relative">
                        <i className={`fas ${catForm.icon} absolute left-4 top-1/2 -translate-y-1/2 text-blue-500`}></i>
                        <input type="text" required className="w-full bg-gray-50 border pl-12 pr-4 py-4 rounded-xl text-xs font-bold" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} />
                     </div>
                  </div>
                  <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100">Add Category</button>
               </form>
            </div>
         </div>
       );
    }
    return null;
  };

  // Admin Module: User Registry
  const renderUsers = () => {
    const filtered = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return (
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
           <div className="relative flex-1 max-w-md">
              <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input type="text" placeholder="Find user by name or email..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
           </div>
        </div>
        <table className="w-full text-left">
           <thead>
              <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50">
                <th className="px-10 py-6">User Details</th>
                <th className="px-10 py-6">Role</th>
                <th className="px-10 py-6">Wallet</th>
                <th className="px-10 py-6">Status</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="text-xs font-bold hover:bg-gray-50 transition-colors">
                   <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                         <div className="relative">
                            <img src={u.photo} className="w-10 h-10 rounded-xl object-cover" />
                            {u.isVerified && <div className="absolute -top-1 -right-1 bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm"><i className="fas fa-check text-[6px]"></i></div>}
                         </div>
                         <div><p className="text-gray-900">{u.name}</p><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{u.email}</p></div>
                      </div>
                   </td>
                   <td className="px-10 py-6">
                      <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-slate-900 text-white' : u.role === UserRole.MODERATOR ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                         {u.role}
                      </span>
                   </td>
                   <td className="px-10 py-6 text-gray-900 font-black">₹{u.walletBalance.toLocaleString()}</td>
                   <td className="px-10 py-6">
                      {u.isSuspended ? <span className="text-rose-600 uppercase text-[9px] font-black tracking-widest">Suspended</span> : <span className="text-emerald-600 uppercase text-[9px] font-black tracking-widest">Active</span>}
                   </td>
                   <td className="px-10 py-6 text-right">
                      <button onClick={() => setSelectedUserId(u.id)} className="text-blue-600 hover:text-blue-800 font-black uppercase text-[9px] tracking-widest">Manage User</button>
                   </td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>
    );
  };

  // Admin Module: User Detail Management
  const renderUserDetail = () => {
    if (!detailUser) return <div className="py-20 text-center"><i className="fas fa-circle-notch fa-spin text-4xl text-blue-600"></i></div>;
    
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex items-center justify-between">
            <button onClick={() => setSelectedUserId(null)} className="flex items-center gap-2 text-gray-400 hover:text-blue-600 font-black uppercase text-[10px] tracking-widest transition-all"><i className="fas fa-arrow-left"></i> Back to List</button>
            <div className="flex gap-3">
               <button onClick={() => dbService.adminUpdateUser(detailUser.id, { isSuspended: !detailUser.isSuspended }, user.id).then(u => u && setDetailUser(u))} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${detailUser.isSuspended ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                  {detailUser.isSuspended ? 'Activate User' : 'Suspend User'}
               </button>
            </div>
         </div>

         <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex items-center gap-8">
            <div className="relative">
               <img src={detailUser.photo} className="w-24 h-24 rounded-3xl object-cover shadow-xl border-4 border-white" />
               {detailUser.isVerified && <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-lg"><i className="fas fa-check text-xs"></i></div>}
            </div>
            <div>
               <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{detailUser.name}</h2>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${detailUser.role === UserRole.ADMIN ? 'bg-slate-900 text-white' : 'bg-blue-100 text-blue-600'}`}>{detailUser.role}</span>
               </div>
               <div className="flex gap-4 mt-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><i className="fas fa-envelope mr-1.5"></i> {detailUser.email}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><i className="fas fa-wallet mr-1.5 text-blue-600"></i> ₹{detailUser.walletBalance.toLocaleString()}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><i className="fas fa-calendar mr-1.5"></i> Joined: {new Date().toLocaleDateString()}</span>
               </div>
            </div>
         </div>

         <div className="flex items-center space-x-2 bg-white p-1.5 rounded-[2.5rem] border border-gray-100 shadow-sm w-fit">
            {[
              {id: 'IDENTITY', label: 'Identity & Access'},
              {id: 'FINANCIAL', label: 'Wallet & Ledgers'},
              {id: 'INVENTORY', label: 'Advertisements'}
            ].map(tab => (
               <button key={tab.id} onClick={() => setActiveUserDetailTab(tab.id as any)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeUserDetailTab === tab.id ? 'bg-slate-900 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>{tab.label}</button>
            ))}
         </div>

         {activeUserDetailTab === 'IDENTITY' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black uppercase text-gray-900 mb-8">Personal Information</h3>
                  <form onSubmit={handleUserIdentityUpdate} className="space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Full Identity Name</label>
                           <input type="text" className="w-full bg-gray-50 border p-4 rounded-xl text-sm font-bold" value={userEditForm.name || ''} onChange={e => setUserEditForm({...userEditForm, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Official Email Address</label>
                           <input type="email" className="w-full bg-gray-50 border p-4 rounded-xl text-sm font-bold" value={userEditForm.email || ''} onChange={e => setUserEditForm({...userEditForm, email: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Mobile Contact</label>
                           <input type="text" className="w-full bg-gray-50 border p-4 rounded-xl text-sm font-bold" value={userEditForm.mobile || ''} onChange={e => setUserEditForm({...userEditForm, mobile: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black uppercase text-gray-400 ml-1">WhatsApp Interface</label>
                           <input type="text" className="w-full bg-gray-50 border p-4 rounded-xl text-sm font-bold" value={userEditForm.whatsapp || ''} onChange={e => setUserEditForm({...userEditForm, whatsapp: e.target.value})} />
                        </div>
                        <div className="col-span-2 space-y-2">
                           <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Physical Address / HQ</label>
                           <textarea className="w-full bg-gray-50 border p-4 rounded-xl text-sm font-bold h-24" value={userEditForm.address || ''} onChange={e => setUserEditForm({...userEditForm, address: e.target.value})} />
                        </div>
                     </div>
                     
                     <div className="h-px bg-gray-100 my-8"></div>
                     
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <h4 className="text-xs font-black uppercase text-gray-900">Privilege & Roles</h4>
                           <select className="w-full bg-gray-50 border p-4 rounded-xl text-xs font-bold" value={userEditForm.role} onChange={e => setUserEditForm({...userEditForm, role: e.target.value as UserRole})}>
                              <option value={UserRole.USER}>Standard User</option>
                              <option value={UserRole.MODERATOR}>Regional Moderator</option>
                              <option value={UserRole.ADMIN}>Platform Administrator</option>
                           </select>
                           <p className="text-[9px] text-gray-400 font-medium">Changing roles will grant immediate access to core system tools.</p>
                        </div>
                        <div className="space-y-4">
                           <h4 className="text-xs font-black uppercase text-gray-900">Account Legitimacy</h4>
                           <div onClick={() => setUserEditForm({...userEditForm, isVerified: !userEditForm.isVerified})} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${userEditForm.isVerified ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-100'}`}>
                              <span className="text-[10px] font-black uppercase tracking-widest">{userEditForm.isVerified ? 'Verified Profile' : 'Unverified Profile'}</span>
                              {userEditForm.isVerified ? <i className="fas fa-check-circle text-blue-600"></i> : <i className="far fa-circle text-gray-300"></i>}
                           </div>
                           <p className="text-[9px] text-gray-400 font-medium">Verified users get a blue tick and higher ranking in search algorithms.</p>
                        </div>
                     </div>

                     <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">Synchronize Profiles</button>
                  </form>
               </div>

               <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm h-fit">
                  <h3 className="text-xl font-black uppercase text-gray-900 mb-6">Regional Command</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6 leading-relaxed">Assign specific cities for this account to moderate and manage.</p>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                     {cities.map(city => (
                        <div key={city.id} onClick={() => toggleCityAssignment(city.id)} className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${userEditForm.managedCityIds?.includes(city.id) ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                           <span className="text-xs font-bold uppercase tracking-tight">{city.name}</span>
                           {userEditForm.managedCityIds?.includes(city.id) ? <i className="fas fa-shield-check"></i> : <i className="fas fa-plus text-[10px]"></i>}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}

         {activeUserDetailTab === 'FINANCIAL' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black uppercase text-gray-900 mb-8">Manage User Funds</h3>
                  <form onSubmit={handleWalletAdjustment} className="space-y-6">
                     <div className="flex gap-3">
                        <button type="button" onClick={() => setWalletForm({...walletForm, type: 'CREDIT'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletForm.type === 'CREDIT' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Add (+)</button>
                        <button type="button" onClick={() => setWalletForm({...walletForm, type: 'DEBIT'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletForm.type === 'DEBIT' ? 'bg-rose-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Remove (-)</button>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Amount (₹)</label>
                        <input type="number" required className="w-full bg-gray-50 border p-5 rounded-2xl font-bold" value={walletForm.amount} onChange={e => setWalletForm({...walletForm, amount: e.target.value})} placeholder="0.00" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Reason</label>
                        <input type="text" required className="w-full bg-gray-50 border p-5 rounded-2xl font-bold" value={walletForm.reason} onChange={e => setWalletForm({...walletForm, reason: e.target.value})} placeholder="e.g. Refund, Correction" />
                     </div>
                     <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">Update Balance</button>
                  </form>
               </div>
               <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-8 border-b border-gray-50"><h3 className="text-xl font-black uppercase text-gray-900">Payment History</h3></div>
                  <div className="flex-1 overflow-y-auto max-h-[500px]">
                     <table className="w-full text-left">
                        <tbody className="divide-y divide-gray-50">
                           {detailTxns.map(tx => (
                              <tr key={tx.id} className="text-[10px] font-bold">
                                 <td className="px-8 py-4 text-gray-400">{new Date(tx.timestamp).toLocaleDateString()}</td>
                                 <td className="px-8 py-4 text-gray-900 uppercase">{tx.description}</td>
                                 <td className={`px-8 py-4 text-right font-black ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.type === 'CREDIT' ? '+' : '-'} ₹{tx.amount}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {activeUserDetailTab === 'INVENTORY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {detailAds.map(l => (
                  <div key={l.id} onClick={() => setSelectedListingId(l.id)} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
                     <div className="aspect-square overflow-hidden relative">
                        <img src={l.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute top-4 left-4 flex gap-2">
                           <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${l.status === ListingStatus.APPROVED ? 'bg-emerald-600 text-white' : 'bg-amber-50 text-white'}`}>{l.status}</span>
                        </div>
                     </div>
                     <div className="p-6">
                        <h4 className="font-black text-gray-900 truncate">{l.title}</h4>
                        <p className="text-blue-600 font-black text-xl mt-1">₹{l.price.toLocaleString()}</p>
                     </div>
                  </div>
               ))}
               {detailAds.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-400 font-black uppercase text-xs">This user has zero active advertisements.</div>
               )}
            </div>
         )}
      </div>
    );
  };

  const renderRevenue = () => {
    if (activeTab === 'pricing') {
       return (
          <div className="max-w-4xl space-y-10">
             <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                <h3 className="text-xl font-black uppercase text-gray-900 tracking-tight">Ad Listing Rates</h3>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Premium Ad Price (₹)</label><input type="number" className="w-full bg-gray-50 border p-5 rounded-2xl font-bold" value={config.premiumPrice} onChange={e => setConfig({...config, premiumPrice: Number(e.target.value)})} /></div>
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Free Ad Limit</label><input type="number" className="w-full bg-gray-50 border p-5 rounded-2xl font-bold" value={config.freeAdLimit} onChange={e => setConfig({...config, freeAdLimit: Number(e.target.value)})} /></div>
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Blue Tick Verification (₹)</label><input type="number" className="w-full bg-gray-50 border p-5 rounded-2xl font-bold" value={config.blueTickPrice} onChange={e => setConfig({...config, blueTickPrice: Number(e.target.value)})} /></div>
                </div>
                <div className="pt-6"><button onClick={handleConfigCommit} disabled={isProcessing} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">Save Changes</button></div>
             </div>
          </div>
       );
    }
    if (activeTab === 'subscribe') {
      return (
        <div className="max-w-5xl space-y-10">
           <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-black uppercase text-gray-900 mb-8">Manage Membership Plans</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                 {config.subscriptionPlans.map(plan => (
                    <div key={plan.id} className="p-6 rounded-3xl border border-gray-100 bg-gray-50 relative group">
                       <button onClick={() => removePlan(plan.id)} className="absolute -top-2 -right-2 bg-rose-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-times"></i></button>
                       <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">{plan.name}</h4>
                       <p className="text-2xl font-black text-blue-600 my-2">₹{plan.price}</p>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Duration: {plan.durationDays} Days</p>
                       <ul className="space-y-2">
                          {plan.features.map((f, i) => (
                             <li key={i} className="text-[10px] font-bold text-gray-600 flex items-center gap-2"><i className="fas fa-check text-emerald-500"></i> {f}</li>
                          ))}
                       </ul>
                    </div>
                 ))}
              </div>

              <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100">
                 <h4 className="text-sm font-black uppercase text-blue-900 mb-6">Create New Plan</h4>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <input type="text" placeholder="Plan Name" className="bg-white border p-4 rounded-xl font-bold text-xs" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} />
                    <input type="number" placeholder="Price (₹)" className="bg-white border p-4 rounded-xl font-bold text-xs" value={planForm.price} onChange={e => setPlanForm({...planForm, price: Number(e.target.value)})} />
                    <input type="number" placeholder="Duration (Days)" className="bg-white border p-4 rounded-xl font-bold text-xs" value={planForm.durationDays} onChange={e => setPlanForm({...planForm, durationDays: Number(e.target.value)})} />
                    <div className="flex gap-2">
                       <input type="text" placeholder="Add Feature" className="flex-1 bg-white border p-4 rounded-xl font-bold text-xs" value={newFeature} onChange={e => setNewFeature(e.target.value)} />
                       <button type="button" onClick={addFeature} className="bg-blue-600 text-white px-4 rounded-xl"><i className="fas fa-plus"></i></button>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-2 mb-6">
                    {planForm.features?.map((f, i) => (
                       <span key={i} className="bg-white px-3 py-1 rounded-lg text-[9px] font-bold text-blue-600 border border-blue-100 flex items-center gap-2">{f} <i className="fas fa-times cursor-pointer" onClick={() => setPlanForm({...planForm, features: planForm.features?.filter((_, idx) => idx !== i)})}></i></span>
                    ))}
                 </div>
                 <button onClick={handleAddPlan} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200">Save Plan</button>
              </div>
              <div className="mt-8 text-right"><button onClick={handleConfigCommit} disabled={isProcessing} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Apply All Changes</button></div>
           </div>
        </div>
      );
    }
    if (activeTab === 'banner_ads') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
              <h3 className="text-xl font-black uppercase text-gray-900 tracking-tight">Banner Ad Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tier 1 Cities (Metro) (₹)</label>
                   <input type="number" className="w-full bg-gray-50 border p-5 rounded-2xl font-bold" 
                     value={config.bannerAdTierPrices.T1} 
                     onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T1: Number(e.target.value)}})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tier 2 Cities (Standard) (₹)</label>
                   <input type="number" className="w-full bg-gray-50 border p-5 rounded-2xl font-bold" 
                     value={config.bannerAdTierPrices.T2} 
                     onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T2: Number(e.target.value)}})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tier 3 Cities (Small) (₹)</label>
                   <input type="number" className="w-full bg-gray-50 border p-5 rounded-2xl font-bold" 
                     value={config.bannerAdTierPrices.T3} 
                     onChange={e => setConfig({...config, bannerAdTierPrices: {...config.bannerAdTierPrices, T3: Number(e.target.value)}})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Banner Duration (Days)</label>
                   <input type="number" className="w-full bg-gray-50 border p-5 rounded-2xl font-bold" 
                     value={config.bannerAdDurationDays} 
                     onChange={e => setConfig({...config, bannerAdDurationDays: Number(e.target.value)})} />
                 </div>
              </div>
              <div className="pt-4">
                 <button onClick={handleConfigCommit} disabled={isProcessing} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all">Save Banner Policy</button>
              </div>
           </div>

           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase text-gray-900 tracking-tight">Active Banner Ads</h3>
                 <div className="bg-blue-50 text-blue-600 px-4 py-1 rounded-xl text-[10px] font-black uppercase">{banners.filter(b => b.status === 'LIVE').length} Ads Running</div>
              </div>
              <table className="w-full text-left">
                 <thead>
                    <tr className="text-[10px] font-black uppercase text-gray-400 border-b border-gray-50">
                       <th className="px-10 py-6">Ad Preview</th>
                       <th className="px-10 py-6">City</th>
                       <th className="px-10 py-6">Views / Clicks</th>
                       <th className="px-10 py-6">Status</th>
                       <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {banners.map(b => (
                      <tr key={b.id} className="text-xs font-bold hover:bg-gray-50 transition-colors">
                         <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                               <div className="w-24 h-12 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                                  <img src={b.imageUrl} className="w-full h-full object-cover" />
                               </div>
                               <div>
                                  <p className="text-gray-900 truncate max-w-[200px]">{b.title || 'Untitled'}</p>
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">By: {b.userId}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-10 py-6">
                            <span className="text-[10px] font-black text-gray-900 uppercase">{CITIES.find(c => c.id === b.cityId)?.name || b.cityId}</span>
                         </td>
                         <td className="px-10 py-6">
                            <div className="flex gap-4 text-[9px] font-black uppercase text-gray-400">
                               <span><i className="fas fa-eye mr-1 text-blue-500"></i> {b.views || 0}</span>
                               <span><i className="fas fa-mouse-pointer mr-1 text-emerald-500"></i> {b.clicks || 0}</span>
                            </div>
                         </td>
                         <td className="px-10 py-6">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${b.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600' : b.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{b.status}</span>
                         </td>
                         <td className="px-10 py-6 text-right">
                            <button onClick={() => { if(window.confirm('Remove this banner?')) { notify('Banner removed.', 'info') } }} className="text-rose-500 hover:text-rose-700 font-black uppercase text-[9px] tracking-widest"><i className="fas fa-trash-alt"></i></button>
                         </td>
                      </tr>
                    ))}
                    {banners.length === 0 && (
                      <tr><td colSpan={5} className="px-10 py-20 text-center text-gray-400 font-black uppercase text-xs">No banners in the system.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      );
    }
    if (activeTab === 'adsense') {
      return (
        <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">
                <i className="fab fa-google"></i>
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-gray-900 tracking-tight">Google AdSense Integration</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Manage global external advertisements</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1 flex items-center gap-2">
                  AdSense Code Snippet / ID
                  <i className="fas fa-circle-info text-blue-500 cursor-help" title="Paste your Google AdSense script or auto-ads code here."></i>
                </label>
                <textarea 
                  className="w-full bg-gray-50 border border-gray-100 p-6 rounded-[2rem] font-mono text-xs font-bold h-64 outline-none focus:ring-4 focus:ring-amber-500/5 focus:bg-white focus:border-amber-500 transition-all"
                  placeholder="<!-- Paste your AdSense code here -->"
                  value={config.googleAdsenseCode}
                  onChange={e => setConfig({...config, googleAdsenseCode: e.target.value})}
                />
              </div>
              
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex items-start gap-4">
                <i className="fas fa-lightbulb text-amber-600 mt-1"></i>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-amber-900 uppercase">Pro Tip</p>
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    Make sure to include the full script provided by Google. These ads will typically appear in dedicated slots on the product listing and search result pages.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50">
              <button 
                onClick={handleConfigCommit} 
                disabled={isProcessing} 
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
              >
                {isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
                Deploy AdSense Configuration
              </button>
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
         <div className="p-10 border-b border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-xl">A</div>
            <div><h2 className="text-sm font-black uppercase tracking-tighter">adoiz admin</h2><p className="text-[8px] font-black uppercase text-blue-400 tracking-widest">System Control</p></div>
         </div>
         <nav className="flex-1 p-6 space-y-1 overflow-y-auto hide-scrollbar">
            {[
               { id: 'DASHBOARD', label: 'Dashboard', icon: 'fa-gauge-high' },
               { id: 'USERS', label: 'Users', icon: 'fa-users-gear' },
               { id: 'LISTINGS', label: 'Manage Ads', icon: 'fa-cubes' },
               { id: 'GEO_CATS', label: 'Locations', icon: 'fa-map-location-dot' },
               { id: 'REVENUE', label: 'Payments', icon: 'fa-money-bill-trend-up' },
               { id: 'SYSTEM', label: 'Settings', icon: 'fa-microchip' }
            ].map(item => (
               <button key={item.id} onClick={() => { setActiveMenu(item.id as MainMenu); setSelectedUserId(null); setSelectedListingId(null); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMenu === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
                  <i className={`fas ${item.icon} text-sm w-5`}></i> {item.label}
               </button>
            ))}
         </nav>
         <div className="p-8 border-t border-slate-800">
            <button onClick={onLogout} className="w-full bg-rose-600/10 text-rose-400 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">Sign Out</button>
         </div>
      </aside>

      <main className="flex-1 min-h-screen p-12">
         <header className="flex justify-between items-center mb-12">
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Admin: {activeMenu}</h1>
            <button onClick={onBack} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all"><i className="fas fa-arrow-right"></i></button>
         </header>

         {selectedUserId ? (
            renderUserDetail()
         ) : selectedListingId ? (
            renderAdManagement()
         ) : (
            <>
               <div className="flex items-center space-x-2 mb-12 bg-white p-1.5 rounded-[2.5rem] border border-gray-100 shadow-sm w-fit">
                  {getTabsForMenu(activeMenu).map(tab => (
                     <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-gray-400 hover:bg-gray-50'}`}>{tab.label}</button>
                  ))}
               </div>
               <div className="relative">
                  {loading && <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-sm z-10 flex items-center justify-center py-20"><i className="fas fa-circle-notch fa-spin text-4xl text-blue-600"></i></div>}
                  {activeMenu === 'REVENUE' && renderRevenue()}
                  {activeMenu === 'DASHBOARD' && renderDashboard()}
                  {activeMenu === 'USERS' && renderUsers()}
                  {activeMenu === 'LISTINGS' && renderInventory()}
                  {activeMenu === 'GEO_CATS' && renderGeoCats()}
               </div>
            </>
         )}
      </main>
    </div>
  );
};
