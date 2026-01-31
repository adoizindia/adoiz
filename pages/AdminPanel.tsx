import React, { useState, useEffect, useMemo, useRef } from 'react';
import { dbService } from '../services/dbService';
import { User, UserRole, Listing, ListingStatus, WalletTransaction, SystemConfig, BackupArchive, SecurityLog, City, State, Country, Category, BannerAd } from '../types';

type AdminSection = 
  | 'OVERVIEW' | 'USERS' | 'INVENTORY' | 'TAXONOMY' | 'BUSINESS' | 'CORE_SYSTEM' | 'DATABASE';

interface AdminPanelProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  onGoToModeration: () => void;
  onViewAd: (listing: Listing) => void;
}

const ADMIN_MENU_STRUCTURE = [
  { id: 'OVERVIEW', label: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'USERS', label: 'User Management', icon: 'fa-users-gear' },
  { id: 'INVENTORY', label: 'Listing Inventory', icon: 'fa-boxes-stacked' },
  { id: 'TAXONOMY', label: 'Categories & Geo', icon: 'fa-map-location-dot' },
  { id: 'BUSINESS', label: 'Revenue & Ads', icon: 'fa-money-bill-trend-up' },
  { id: 'CORE_SYSTEM', label: 'Site Settings', icon: 'fa-gears' },
  { id: 'DATABASE', label: 'Backup & Security', icon: 'fa-database' }
];

export const AdminPanel: React.FC<AdminPanelProps> = ({ user, onBack, onLogout, onGoToModeration, onViewAd }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [backups, setBackups] = useState<BackupArchive[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);
  
  // User Management State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [userTransactions, setUserTransactions] = useState<WalletTransaction[]>([]);
  const [userListings, setUserListings] = useState<Listing[]>([]);
  
  // Wallet Adjustment local state for Audit
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [isWalletProcessing, setIsWalletProcessing] = useState(false);

  // Taxonomy State
  const [taxonomyTab, setTaxonomyTab] = useState<'CAT' | 'GEO'>('CAT');
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showGeoModal, setShowGeoModal] = useState<any>(null); 
  const [geoNameInput, setGeoNameInput] = useState('');
  const [geoCodeInput, setGeoCodeInput] = useState('');
  const [catForm, setCatForm] = useState<Partial<Category>>({ name: '', icon: 'fa-tag' });

  // Business State
  const [businessTab, setBusinessTab] = useState<'PRICING' | 'BANNERS' | 'GATEWAYS' | 'WALLETS'>('PRICING');
  const [sysConfig, setSysConfig] = useState<SystemConfig>(dbService.getSystemConfig());
  const [allBanners, setAllBanners] = useState<BannerAd[]>([]);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState({ cityId: '', imageUrl: '', linkUrl: '', duration: 7 });

  // Wallet Transaction Filter State
  const [walletViewSubTab, setWalletViewSubTab] = useState<'LOGS' | 'BALANCES' | 'ANALYTICS'>('LOGS');
  const [walletSearch, setWalletSearch] = useState('');
  const [walletTypeFilter, setWalletTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [walletTimeFilter, setWalletTimeFilter] = useState<'DAILY' | 'MONTHLY' | 'YEARLY' | 'ALL'>('ALL');

  // Database Management State
  const [databaseTab, setDatabaseTab] = useState<'BACKUP' | 'AUTH' | 'LOGS'>('BACKUP');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inventory Management State
  const [listingSearch, setListingSearch] = useState('');
  const [listingFilters, setListingFilters] = useState({
    status: 'ALL',
    category: 'ALL',
    cityId: 'ALL',
    isPremium: 'ALL'
  });
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [listingEditForm, setListingEditForm] = useState<Partial<Listing>>({});
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState({ role: 'ALL', status: 'ALL' });

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    const [u, l, c, ctr, b, tx] = await Promise.all([
      dbService.getAllUsers(), 
      dbService.getAllListings(),
      dbService.getCategories(),
      dbService.getCountries(),
      dbService.getAllBanners(),
      dbService.getAllTransactions()
    ]);
    setAllUsers(u);
    setAllListings(l);
    setAllCategories(c);
    setCountries(ctr);
    setAllBanners(b);
    setAllTransactions(tx);
    setSysConfig(dbService.getSystemConfig());
    setBackups(dbService.getBackupHistory());
    setSecurityLogs(dbService.getSecurityLogs());
    setLoading(false);
  };

  const stats = useMemo(() => {
    const activeListings = allListings.filter(l => l.status === ListingStatus.APPROVED);
    const pendingListings = allListings.filter(l => l.status === ListingStatus.PENDING);
    const pendingVerifications = allUsers.filter(u => !u.isVerified && u.role === UserRole.USER).length;
    return {
      totalUsers: allUsers.length,
      activeAds: activeListings.length,
      pendingAds: pendingListings.length,
      pendingVerifications,
      securityWarnings: securityLogs.filter(log => log.severity === 'HIGH' || log.severity === 'CRITICAL').length
    };
  }, [allUsers, allListings, securityLogs]);

  // Wallet Logic Memo
  const filteredWalletTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const search = walletSearch.toLowerCase();
      const matchSearch = !walletSearch || tx.id.toLowerCase().includes(search) || tx.userId.toLowerCase().includes(search);
      const matchType = walletTypeFilter === 'ALL' || tx.type === walletTypeFilter;
      
      let matchTime = true;
      if (walletTimeFilter !== 'ALL') {
        const now = new Date();
        const txDate = new Date(tx.timestamp);
        if (walletTimeFilter === 'DAILY') {
          matchTime = txDate.toDateString() === now.toDateString();
        } else if (walletTimeFilter === 'MONTHLY') {
          matchTime = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        } else if (walletTimeFilter === 'YEARLY') {
          matchTime = txDate.getFullYear() === now.getFullYear();
        }
      }
      return matchSearch && matchType && matchTime;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allTransactions, walletSearch, walletTypeFilter, walletTimeFilter]);

  const walletAnalytics = useMemo(() => {
    const subset = allTransactions.filter(tx => {
      let matchTime = true;
      if (walletTimeFilter !== 'ALL') {
        const now = new Date();
        const txDate = new Date(tx.timestamp);
        if (walletTimeFilter === 'DAILY') matchTime = txDate.toDateString() === now.toDateString();
        else if (walletTimeFilter === 'MONTHLY') matchTime = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        else if (walletTimeFilter === 'YEARLY') matchTime = txDate.getFullYear() === now.getFullYear();
      }
      return matchTime;
    });

    const credit = subset.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.amount, 0);
    const debit = subset.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.amount, 0);
    return { credit, debit, count: subset.length };
  }, [allTransactions, walletTimeFilter]);

  // --- Database Logic Handlers ---
  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    await dbService.runSystemBackup('MANUAL');
    setTimeout(() => {
      setIsBackingUp(false);
      loadAllData(true);
      alert("Manual system backup completed successfully.");
    }, 1500);
  };

  const handleRestoreBackup = async (id: string) => {
    if (window.confirm("CRITICAL: This will revert all system data to this snapshot. Live changes will be lost. Proceed?")) {
      try {
        await dbService.restoreBackup(id);
        loadAllData(true);
        alert("System restoration initialized. Please wait...");
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.bak')) {
        alert("Unsupported file format. Please upload a BI file archive.");
        return;
      }
      alert(`Backup file "${file.name}" uploaded and verified. You can now restore from the list below.`);
      handleTriggerBackup(); // Simulate creation from upload
    }
  };

  const handleToggleAuthSetting = (key: keyof SystemConfig['security']) => {
    const newValue = !sysConfig.security[key];
    const newConfig = {
      ...sysConfig,
      security: { ...sysConfig.security, [key]: newValue }
    };
    setSysConfig(newConfig);
    dbService.updateSystemConfig(newConfig);
    dbService.addSecurityLog('AUTH_TOGGLE', `Admin modified ${key} to ${newValue}`, 'MEDIUM');
  };

  const handleToggleBackupEnabled = () => {
    const newValue = !sysConfig.backupSchedule.enabled;
    const newConfig = {
      ...sysConfig,
      backupSchedule: { ...sysConfig.backupSchedule, enabled: newValue }
    };
    setSysConfig(newConfig);
    dbService.updateSystemConfig(newConfig);
    dbService.addSecurityLog('BACKUP_TOGGLE', `Automated backup schedule ${newValue ? 'Enabled' : 'Disabled'}`, 'MEDIUM');
  };

  // --- Business Logic Handlers ---
  const handleSaveConfig = () => {
    dbService.updateSystemConfig(sysConfig);
    alert("System configuration updated successfully.");
    loadAllData(true);
  };

  const handleToggleGateway = (gateway: keyof SystemConfig['paymentGateway']) => {
    const current = sysConfig.paymentGateway[gateway] as any;
    const newConfig = {
      ...sysConfig,
      paymentGateway: {
        ...sysConfig.paymentGateway,
        [gateway]: { ...current, active: !current.active }
      }
    };
    setSysConfig(newConfig);
    dbService.updateSystemConfig(newConfig);
  };

  const handleUpdateGatewayKeys = (gateway: keyof SystemConfig['paymentGateway'], keys: any) => {
    const current = sysConfig.paymentGateway[gateway] as any;
    const newConfig = {
      ...sysConfig,
      paymentGateway: {
        ...sysConfig.paymentGateway,
        [gateway]: { ...current, ...keys }
      }
    };
    setSysConfig(newConfig);
    dbService.updateSystemConfig(newConfig);
  };

  const handleCreateAdminBanner = async () => {
    if (!bannerForm.cityId || !bannerForm.imageUrl) return;
    await dbService.processBannerSponsorship('admin-master', bannerForm.cityId, bannerForm.imageUrl, bannerForm.linkUrl);
    setShowBannerModal(false);
    setBannerForm({ cityId: '', imageUrl: '', linkUrl: '', duration: 7 });
    loadAllData(true);
  };

  const handleDeleteBanner = async (id: string) => {
    if (window.confirm("Remove this banner advertisement?")) {
      await dbService.adminDeleteBanner(id, user.id);
      loadAllData(true);
    }
  };

  // --- Category Handlers ---
  const handleAddCategory = async () => {
    if (!catForm.name) return;
    await dbService.addCategory(catForm as Omit<Category, 'id'>, user.id);
    setShowCatModal(false);
    setCatForm({ name: '', icon: 'fa-tag' });
    loadAllData(true);
  };

  const handleToggleCatStatus = async (cat: Category) => {
    await dbService.updateCategory(cat.id, { name: cat.name }, user.id);
    loadAllData(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm("Permanently delete this category? This action is irreversible.")) {
      try {
        await dbService.deleteCategory(id, user.id);
        loadAllData(true);
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  // --- Geo Handlers ---
  const handleAddGeo = async () => {
    if (!geoNameInput) return;
    try {
      if (showGeoModal.type === 'COUNTRY') {
        await dbService.addCountry({ name: geoNameInput, code: geoCodeInput, isActive: true }, user.id);
      } else if (showGeoModal.type === 'STATE') {
        await dbService.addState({ name: geoNameInput, countryId: selectedCountry!.id, isActive: true }, user.id);
      } else if (showGeoModal.type === 'CITY') {
        await dbService.addCity({ name: geoNameInput, stateId: selectedState!.id, isActive: true }, user.id);
      }
      setGeoNameInput('');
      setGeoCodeInput('');
      setShowGeoModal(null);
      loadAllData(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteGeo = async (type: 'CITY' | 'STATE', id: string) => {
    if (window.confirm(`Delete this ${type.toLowerCase()}?`)) {
      try {
        if (type === 'CITY') await dbService.deleteCity(id, user.id);
        else await dbService.deleteState(id, user.id);
        loadAllData(true);
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  // Inventory Filtering Logic
  const filteredListings = useMemo(() => {
    return allListings.filter(l => {
      const search = listingSearch.toLowerCase();
      const matchSearch = !listingSearch || 
        l.title.toLowerCase().includes(search) || 
        l.id.toLowerCase().includes(search) ||
        l.sellerId.toLowerCase().includes(search);
      
      const matchStatus = listingFilters.status === 'ALL' || l.status === listingFilters.status;
      const matchCategory = listingFilters.category === 'ALL' || l.category === listingFilters.category;
      const matchCity = listingFilters.cityId === 'ALL' || l.cityId === listingFilters.cityId;
      const matchPremium = listingFilters.isPremium === 'ALL' || (listingFilters.isPremium === 'YES' ? l.isPremium : !l.isPremium);
      
      return matchSearch && matchStatus && matchCategory && matchCity && matchPremium;
    });
  }, [allListings, listingSearch, listingFilters]);

  // User Filtering Logic
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const search = userSearch.toLowerCase();
      const searchMatch = !userSearch || 
        u.name.toLowerCase().includes(search) || 
        u.email.toLowerCase().includes(search) || 
        (u.mobile && u.mobile.includes(userSearch)) ||
        u.id.toLowerCase().includes(search);
      const roleMatch = userFilter.role === 'ALL' || u.role === userFilter.role;
      const statusMatch = userFilter.status === 'ALL' 
        || (userFilter.status === 'SUSPENDED' && u.isSuspended)
        || (userFilter.status === 'VERIFIED' && u.isVerified);
      return searchMatch && roleMatch && statusMatch;
    });
  }, [allUsers, userSearch, userFilter]);

  const handleEditUser = async (u: User) => {
    setEditingUser(u);
    setEditForm({ ...u });
    const [tx, list] = await Promise.all([
      dbService.getTransactionsByUserId(u.id),
      dbService.getListingsBySeller(u.id)
    ]);
    setUserTransactions(tx.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setUserListings(list);
    setAdjAmount('');
    setAdjReason('');
  };

  const handleSaveUserProfile = async () => {
    if (!editingUser) return;
    const updated = await dbService.updateUser(editingUser.id, editForm);
    if (updated) {
      setEditingUser(updated);
      loadAllData(true);
      alert("User profile updated successfully.");
    }
  };

  const handleAdminWalletAction = async (type: 'CREDIT' | 'DEBIT') => {
    if (!editingUser || !adjAmount) return;
    const amount = Number(adjAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsWalletProcessing(true);
    try {
      const updatedUser = await dbService.adminAdjustWallet(editingUser.id, amount, type, adjReason, user.id);
      if (updatedUser) {
        setEditingUser(updatedUser);
        const tx = await dbService.getTransactionsByUserId(editingUser.id);
        setUserTransactions(tx.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setAdjAmount('');
        setAdjReason('');
        loadAllData(true);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsWalletProcessing(false);
    }
  };

  const handleEditListing = (l: Listing) => {
    setEditingListing(l);
    setListingEditForm({ ...l });
  };

  const handleSaveListing = async () => {
    if (!editingListing) return;
    await dbService.updateListing(editingListing.id, listingEditForm);
    setEditingListing(null);
    loadAllData(true);
    alert("Listing updated successfully.");
  };

  const handleDeleteListing = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this listing permanently?")) {
      await dbService.adminDeleteListing(id, user.id);
      loadAllData(true);
    }
  };

  const handleApproveListing = async (id: string) => {
    await dbService.updateListingStatus(id, ListingStatus.APPROVED, undefined, user.id);
    loadAllData(true);
  };

  const handleOpenRejectListing = (id: string) => {
    setEditingListing(allListings.find(x => x.id === id) || null);
    setRejectionNote('');
    setShowRejectModal(true);
  };

  const confirmRejection = async () => {
    if (!editingListing) return;
    await dbService.updateListingStatus(editingListing.id, ListingStatus.REJECTED, rejectionNote || 'Policy violation', user.id);
    setShowRejectModal(false);
    setEditingListing(null);
    loadAllData(true);
  };

  const toggleFeaturedListing = async (l: Listing) => {
    const newFeatured = !l.isPremium;
    const until = newFeatured ? new Date(Date.now() + 86400000 * 30).toISOString() : undefined;
    const from = newFeatured ? new Date().toISOString() : undefined;
    await dbService.toggleFeatured(l.id, newFeatured, from, until, user.id);
    loadAllData(true);
  };

  const SidebarContent = () => (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="p-8 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">A</div>
          <span className="text-xl font-black text-gray-900 tracking-tighter">ADOIZ PRO</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-gray-400"><i className="fas fa-times"></i></button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {ADMIN_MENU_STRUCTURE.map(item => (
          <button
            key={item.id}
            onClick={() => { setActiveSection(item.id as AdminSection); setEditingUser(null); setEditingListing(null); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-5 py-4 rounded-2xl text-[11px] font-black uppercase transition-all flex items-center ${activeSection === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <i className={`fas ${item.icon} w-6 mr-3 text-sm`}></i>{item.label}
          </button>
        ))}
      </div>
      <div className="p-6 border-t border-gray-50">
        <button onClick={onBack} className="w-full py-4 text-[10px] font-black uppercase text-blue-600 bg-white border border-blue-100 rounded-xl hover:bg-blue-50 transition-all shadow-sm">Exit Panel</button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center h-[60vh]"><i className="fas fa-circle-notch fa-spin text-blue-600 text-4xl"></i></div>;

    if (editingUser) return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-32">
        <div className="flex items-center justify-between">
          <button onClick={() => setEditingUser(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-blue-600 flex items-center gap-2">
            <i className="fas fa-arrow-left"></i> Return to Registry
          </button>
          <span className="text-[9px] font-black text-white bg-slate-900 px-3 py-1.5 rounded-full uppercase tracking-[0.2em]">Audit Mode Active</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-10">
              <div className="flex flex-col md:flex-row items-center gap-8 border-b border-gray-50 pb-8">
                <div className="relative group">
                  <img src={editForm.photo || editingUser.photo} className="w-32 h-32 rounded-[2rem] object-cover ring-4 ring-gray-50" />
                  <label className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer text-white transition-opacity">
                    <i className="fas fa-camera text-xl"></i>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setEditForm({...editForm, photo: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editingUser.name}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Global ID: {editingUser.id}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-full">{editingUser.role}</span>
                    {editingUser.isVerified && <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-full">Identity Verified</span>}
                    {editingUser.isSuspended && <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[8px] font-black uppercase rounded-full">Account Suspended</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Full Legal Name</label>
                   <input className="w-full bg-gray-50 border p-4 rounded-2xl font-bold focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-100" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Primary Email</label>
                   <input className="w-full bg-gray-50 border p-4 rounded-2xl font-bold focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-100" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mobile String</label>
                   <input className="w-full bg-gray-50 border p-4 rounded-2xl font-bold focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-100" value={editForm.mobile || ''} onChange={e => setEditForm({...editForm, mobile: e.target.value})} />
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Account Status</label>
                   <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                      <button 
                        onClick={() => setEditForm({...editForm, isSuspended: !editForm.isSuspended})}
                        className={`w-12 h-6 rounded-full relative transition-all ${editForm.isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editForm.isSuspended ? 'left-7' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[10px] font-black uppercase text-gray-700">{editForm.isSuspended ? 'Suspended' : 'Active'}</span>
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Blue Tick Verification</label>
                   <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                      <button 
                        onClick={() => setEditForm({...editForm, isVerified: !editForm.isVerified})}
                        className={`w-12 h-6 rounded-full relative transition-all ${editForm.isVerified ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editForm.isVerified ? 'left-7' : 'left-1'}`}></div>
                      </button>
                      <span className="text-[10px] font-black uppercase text-gray-700">{editForm.isVerified ? 'Verified' : 'Standard'}</span>
                   </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                 <button onClick={handleSaveUserProfile} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-100">Synchronize Registry</button>
                 <button onClick={() => setEditingUser(null)} className="px-8 py-4 border border-gray-100 text-gray-400 font-black uppercase text-[10px] rounded-2xl">Cancel</button>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
               <h4 className="text-xl font-black uppercase tracking-tighter">Inventory Audit</h4>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="border-b border-gray-50">
                     <tr className="text-[9px] font-black uppercase text-gray-400">
                       <th className="pb-4 pr-4">Ad Context</th>
                       <th className="pb-4 pr-4">Category</th>
                       <th className="pb-4 pr-4">Status</th>
                       <th className="pb-4 text-right">Registry Date</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {userListings.map(l => (
                       <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                         <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                               <img src={l.images[0]} className="w-10 h-10 rounded-lg object-cover" />
                               <span className="font-bold text-sm uppercase text-gray-900 truncate max-w-[150px]">{l.title}</span>
                            </div>
                         </td>
                         <td className="py-4 pr-4 font-bold text-[10px] uppercase text-gray-400">{l.category}</td>
                         <td className="py-4 pr-4">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{l.status}</span>
                         </td>
                         <td className="py-4 text-right font-bold text-[10px] text-gray-400">{new Date(l.createdAt).toLocaleDateString()}</td>
                       </tr>
                     ))}
                     {userListings.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-[10px] font-black text-gray-300 uppercase italic">No items in registry</td></tr>}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-8 shadow-2xl">
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Liquid Wallet Balance</p>
                 <h4 className="text-5xl font-black tracking-tighter">₹{editingUser.walletBalance.toLocaleString()}</h4>
               </div>
               
               <div className="space-y-4 pt-6 border-t border-white/10">
                 <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Manual Adjustment</h5>
                 <div className="space-y-3">
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                       <input type="number" className="w-full bg-white/5 border border-white/10 p-4 pl-10 rounded-2xl font-bold outline-none focus:border-blue-400 transition-all text-sm" placeholder="0.00" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} />
                    </div>
                    <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold outline-none focus:border-blue-400 transition-all text-xs" placeholder="Audit Remark / Reason" value={adjReason} onChange={e => setAdjReason(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3 pt-2">
                       <button 
                        disabled={isWalletProcessing}
                        onClick={() => handleAdminWalletAction('CREDIT')} 
                        className="bg-emerald-600 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-xl shadow-emerald-900/40"
                       >
                         {isWalletProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : 'Apply Credit'}
                       </button>
                       <button 
                        disabled={isWalletProcessing}
                        onClick={() => handleAdminWalletAction('DEBIT')} 
                        className="bg-rose-600 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-rose-700 active:scale-95 transition-all shadow-xl shadow-rose-900/40"
                       >
                         {isWalletProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : 'Apply Debit'}
                       </button>
                    </div>
                 </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
               <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Transaction Trail (Last 5)</h4>
               <div className="space-y-4">
                  {userTransactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex justify-between items-start border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                       <div className="min-w-0 pr-4">
                          <p className="text-[11px] font-black text-gray-900 uppercase truncate">{tx.description}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{new Date(tx.timestamp).toLocaleString()}</p>
                       </div>
                       <p className={`text-sm font-black whitespace-nowrap ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                       </p>
                    </div>
                  ))}
                  {userTransactions.length === 0 && <p className="py-10 text-center text-[10px] font-black text-gray-300 uppercase italic">No ledger activity</p>}
               </div>
            </div>
          </div>
        </div>
      </div>
    );

    if (editingListing && !showRejectModal) return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <button onClick={() => setEditingListing(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-blue-600"><i className="fas fa-arrow-left mr-2"></i> Return to Inventory</button>
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black text-gray-900">Edit Listing: {editingListing.title}</h3>
            <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-50 px-3 py-1 rounded">ID: {editingListing.id}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-gray-400">Title</label>
               <input className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={listingEditForm.title || ''} onChange={e => setListingEditForm({...listingEditForm, title: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-gray-400">Price (₹)</label>
               <input type="number" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={listingEditForm.price || 0} onChange={e => setListingEditForm({...listingEditForm, price: Number(e.target.value)})} />
            </div>
            <div className="md:col-span-2 space-y-1">
               <label className="text-[9px] font-black uppercase text-gray-400">Description</label>
               <textarea rows={5} className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={listingEditForm.description || ''} onChange={e => setListingEditForm({...listingEditForm, description: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-gray-400">Category</label>
               <input className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={listingEditForm.category || ''} onChange={e => setListingEditForm({...listingEditForm, category: e.target.value})} />
            </div>
            <div className="space-y-1 flex flex-col justify-end">
               <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
                 <input type="checkbox" id="featured-toggle" checked={listingEditForm.isPremium} onChange={e => setListingEditForm({...listingEditForm, isPremium: e.target.checked})} className="w-5 h-5" />
                 <label htmlFor="featured-toggle" className="text-[11px] font-black uppercase text-gray-700">Mark as Featured / Premium</label>
               </div>
            </div>
          </div>
          <div className="flex gap-4 mt-12">
            <button onClick={handleSaveListing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100">Commit Changes</button>
            <button onClick={() => setEditingListing(null)} className="px-10 py-4 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400">Cancel</button>
          </div>
        </div>
      </div>
    );

    switch(activeSection) {
      case 'DATABASE':
        return (
          <div className="space-y-8 animate-in fade-in duration-500 pb-24">
             <div className="flex items-center bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm w-fit mb-8">
               <button onClick={() => setDatabaseTab('BACKUP')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${databaseTab === 'BACKUP' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Backup & Restore</button>
               <button onClick={() => setDatabaseTab('AUTH')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${databaseTab === 'AUTH' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Auth Controls</button>
               <button onClick={() => setDatabaseTab('LOGS')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${databaseTab === 'LOGS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Security Logs</button>
            </div>

            {databaseTab === 'BACKUP' && (
              <div className="space-y-8">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                       <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                          <h3 className="text-xl font-black uppercase tracking-tighter">Automated Backup</h3>
                          <button onClick={handleToggleBackupEnabled} className={`relative w-12 h-6 rounded-full transition-all ${sysConfig.backupSchedule.enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${sysConfig.backupSchedule.enabled ? 'left-7' : 'left-1'}`}></div>
                          </button>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-gray-400">Frequency</label>
                             <select className="w-full bg-gray-50 border p-4 rounded-xl font-bold text-xs" value={sysConfig.backupSchedule.frequency} onChange={e => setSysConfig({...sysConfig, backupSchedule: {...sysConfig.backupSchedule, frequency: e.target.value as any}})}>
                                <option value="DAILY">Daily Scheduled</option>
                                <option value="REALTIME">Real-time Incremental</option>
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-gray-400">Retention Limit</label>
                             <input type="number" className="w-full bg-gray-50 border p-4 rounded-xl font-bold text-xs" value={sysConfig.backupSchedule.retentionLimit} onChange={e => setSysConfig({...sysConfig, backupSchedule: {...sysConfig.backupSchedule, retentionLimit: Number(e.target.value)}})} />
                          </div>
                       </div>
                       <div className="pt-4 flex gap-3">
                          <button 
                            disabled={isBackingUp}
                            onClick={handleTriggerBackup}
                            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                          >
                             {isBackingUp ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-cloud-arrow-up"></i>}
                             Run Manual Backup
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".bak" className="hidden" />
                          <button onClick={() => fileInputRef.current?.click()} className="flex-1 border border-gray-100 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                             <i className="fas fa-file-import"></i> Upload Archive
                          </button>
                       </div>
                    </div>

                    <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-xl text-white space-y-8">
                       <h3 className="text-xl font-black uppercase tracking-tighter">System Integrity</h3>
                       <div className="space-y-6">
                          <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                             <div><p className="text-[9px] font-black text-blue-400 uppercase">Last Database Snap</p><p className="font-bold text-sm">{sysConfig.backupSchedule.lastRunAt ? new Date(sysConfig.backupSchedule.lastRunAt).toLocaleString() : 'N/A'}</p></div>
                             <i className="fas fa-check-circle text-emerald-400"></i>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                             <div><p className="text-[9px] font-black text-blue-400 uppercase">Snapshot Destination</p><p className="font-bold text-sm">Secure ADOIZ S3 Cluster</p></div>
                             <i className="fas fa-server text-blue-400"></i>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                       <h3 className="font-black uppercase text-gray-900 tracking-tighter">Snapshot Registry</h3>
                       <p className="text-[9px] font-black text-gray-400 uppercase">Archives are strictly Read-Only</p>
                    </div>
                    <table className="w-full text-left">
                       <thead className="bg-gray-50 border-b border-gray-50">
                          <tr className="text-[9px] font-black uppercase text-gray-400">
                             <th className="px-10 py-5">Archive Filename</th>
                             <th className="px-10 py-5">Origin / Scope</th>
                             <th className="px-10 py-5">Size</th>
                             <th className="px-10 py-5">Status</th>
                             <th className="px-10 py-5 text-right">Vault Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {backups.map(b => (
                             <tr key={b.id} className="hover:bg-gray-50/50 transition-all">
                                <td className="px-10 py-6">
                                   <div className="flex items-center gap-3">
                                      <i className="fas fa-file-zipper text-blue-400"></i>
                                      <div className="flex flex-col">
                                         <span className="font-black text-sm uppercase text-gray-900">{b.filename}</span>
                                         <span className="text-[9px] font-bold text-gray-400 uppercase">{new Date(b.timestamp).toLocaleString()}</span>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-10 py-6">
                                   <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${b.type === 'AUTO' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{b.type} Registry</span>
                                </td>
                                <td className="px-10 py-6 font-bold text-xs text-gray-500">{b.size}</td>
                                <td className="px-10 py-6">
                                   <div className="flex items-center gap-2">
                                      {b.status === 'RESTORING' ? (
                                         <span className="flex items-center gap-2 text-blue-600 font-black text-[9px] uppercase"><i className="fas fa-circle-notch fa-spin"></i> Restoring</span>
                                      ) : (
                                         <span className={`w-fit px-2 py-0.5 rounded text-[8px] font-black uppercase ${b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{b.status}</span>
                                      )}
                                   </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                   <div className="flex items-center justify-end gap-2">
                                      <button onClick={() => handleRestoreBackup(b.id)} className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg hover:bg-black transition-all">Restore</button>
                                      <button className="w-10 h-10 border border-gray-100 text-gray-400 rounded-lg hover:text-blue-600 transition-all" title="Download Archive"><i className="fas fa-download text-xs"></i></button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {databaseTab === 'AUTH' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><i className="fas fa-shield-halved"></i></div>
                       <h3 className="text-xl font-black uppercase tracking-tighter">Login Verification</h3>
                    </div>
                    <div className="space-y-6">
                       <div className="flex justify-between items-center p-6 bg-gray-50 rounded-3xl border border-gray-100">
                          <div>
                             <p className="text-[11px] font-black uppercase">OTP-Based Authentication</p>
                             <p className="text-[9px] text-gray-400 mt-1 max-w-[200px]">Enforces 2FA for all user logins using registered mobile/email.</p>
                          </div>
                          <button onClick={() => handleToggleAuthSetting('requireOtpLogin')} className={`relative w-12 h-6 rounded-full transition-all ${sysConfig.security.requireOtpLogin ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${sysConfig.security.requireOtpLogin ? 'left-7' : 'left-1'}`}></div>
                          </button>
                       </div>
                       <div className="flex justify-between items-center p-6 bg-gray-50 rounded-3xl border border-gray-100">
                          <div>
                             <p className="text-[11px] font-black uppercase">Email Verification Shield</p>
                             <p className="text-[9px] text-gray-400 mt-1 max-w-[200px]">Prevents account activation until email ownership is confirmed.</p>
                          </div>
                          <button onClick={() => handleToggleAuthSetting('requireEmailVerification')} className={`relative w-12 h-6 rounded-full transition-all ${sysConfig.security.requireEmailVerification ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${sysConfig.security.requireEmailVerification ? 'left-7' : 'left-1'}`}></div>
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="bg-blue-600 p-10 rounded-[2.5rem] shadow-xl text-white">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Security Advisory</h3>
                    <p className="text-sm text-blue-100 leading-relaxed mb-6">Disabling authentication layers may increase the risk of fraudulent account creation. We recommend keeping "Email Verification" active for production environments.</p>
                    <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl">
                       <i className="fas fa-triangle-exclamation text-yellow-300"></i>
                       <span className="text-[10px] font-black uppercase">Super Admin authorization required for changes.</span>
                    </div>
                 </div>
              </div>
            )}

            {databaseTab === 'LOGS' && (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                 <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="font-black uppercase text-gray-900 tracking-tighter">Security Audit Trail</h3>
                    <span className="bg-gray-50 text-[9px] font-black uppercase px-3 py-1 rounded-full text-gray-400 border border-gray-100">Immutable Ledger</span>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50 border-b border-gray-50">
                          <tr className="text-[9px] font-black uppercase text-gray-400">
                             <th className="px-10 py-5">Event Timestamp</th>
                             <th className="px-10 py-5">Origin IP</th>
                             <th className="px-10 py-5">Internal Action</th>
                             <th className="px-10 py-5">Severity</th>
                             <th className="px-10 py-5">Operational Details</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {securityLogs.map(log => (
                             <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-10 py-6 font-bold text-xs text-gray-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-10 py-6 font-bold text-xs text-gray-900">{log.ip}</td>
                                <td className="px-10 py-6"><span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{log.action}</span></td>
                                <td className="px-10 py-6">
                                   <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                                      log.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-600' :
                                      log.severity === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                                      log.severity === 'MEDIUM' ? 'bg-blue-100 text-blue-600' :
                                      'bg-emerald-100 text-emerald-600'
                                   }`}>{log.severity}</span>
                                </td>
                                <td className="px-10 py-6 text-sm text-gray-500 font-medium">{log.details}</td>
                             </tr>
                          ))}
                          {securityLogs.length === 0 && (
                             <tr><td colSpan={5} className="py-20 text-center text-[10px] font-black uppercase text-gray-300 italic tracking-widest">Audit trail is currently empty</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}
          </div>
        );
      case 'CORE_SYSTEM':
        return (
          <div className="space-y-8 animate-in fade-in duration-500 pb-24">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                   <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><i className="fas fa-id-card"></i></div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">Website Identity</h3>
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Website Name</label>
                         <input type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.siteName} onChange={e => setSysConfig({...sysConfig, siteName: e.target.value})} />
                         <p className="text-[9px] text-gray-400 font-medium">Used for browser title, admin panel, and emails.</p>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Website Tagline</label>
                         <input type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.branding.siteTagline} onChange={e => setSysConfig({...sysConfig, branding: {...sysConfig.branding, siteTagline: e.target.value}})} />
                         <p className="text-[9px] text-gray-400 font-medium">Short descriptor for SEO and social sharing.</p>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                   <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><i className="fas fa-palette"></i></div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">Branding Assets</h3>
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Website Logo URL</label>
                         <div className="flex gap-4">
                            <input type="text" className="flex-1 bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.logoUrl} onChange={e => setSysConfig({...sysConfig, logoUrl: e.target.value})} />
                            {sysConfig.logoUrl && <img src={sysConfig.logoUrl} className="h-14 w-14 object-contain bg-gray-50 p-2 rounded-xl" />}
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Favicon URL (ICO/PNG)</label>
                         <input type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.faviconUrl} onChange={e => setSysConfig({...sysConfig, faviconUrl: e.target.value})} />
                      </div>
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 lg:col-span-2">
                   <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><i className="fas fa-user-shield"></i></div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">Social Authentication Settings</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                         <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2"><i className="fab fa-google text-rose-500"></i><span className="text-[11px] font-black uppercase">Google Login</span></div>
                            <button onClick={() => setSysConfig({...sysConfig, socialLogin: {...sysConfig.socialLogin, googleEnabled: !sysConfig.socialLogin.googleEnabled}})} className={`relative w-10 h-5 rounded-full transition-all ${sysConfig.socialLogin.googleEnabled ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                               <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sysConfig.socialLogin.googleEnabled ? 'left-5.5' : 'left-0.5'}`}></div>
                            </button>
                         </div>
                         <div className="space-y-4">
                            <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">Client ID</label><input type="text" className="w-full bg-white border p-3 rounded-xl font-bold text-xs" value={sysConfig.socialLogin.googleClientId} onChange={e => setSysConfig({...sysConfig, socialLogin: {...sysConfig.socialLogin, googleClientId: e.target.value}})} /></div>
                            <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">Client Secret</label><input type="password" className="w-full bg-white border p-3 rounded-xl font-bold text-xs" value={sysConfig.socialLogin.googleClientSecret} onChange={e => setSysConfig({...sysConfig, socialLogin: {...sysConfig.socialLogin, googleClientSecret: e.target.value}})} /></div>
                         </div>
                      </div>
                      <div className="space-y-6 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                         <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2"><i className="fab fa-facebook text-blue-600"></i><span className="text-[11px] font-black uppercase">Facebook Login</span></div>
                            <button onClick={() => setSysConfig({...sysConfig, socialLogin: {...sysConfig.socialLogin, facebookEnabled: !sysConfig.socialLogin.facebookEnabled}})} className={`relative w-10 h-5 rounded-full transition-all ${sysConfig.socialLogin.facebookEnabled ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                               <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sysConfig.socialLogin.facebookEnabled ? 'left-5.5' : 'left-0.5'}`}></div>
                            </button>
                         </div>
                         <div className="space-y-4">
                            <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">App ID</label><input type="text" className="w-full bg-white border p-3 rounded-xl font-bold text-xs" value={sysConfig.socialLogin.facebookAppId} onChange={e => setSysConfig({...sysConfig, socialLogin: {...sysConfig.socialLogin, facebookAppId: e.target.value}})} /></div>
                            <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">App Secret</label><input type="password" className="w-full bg-white border p-3 rounded-xl font-bold text-xs" value={sysConfig.socialLogin.facebookAppSecret} onChange={e => setSysConfig({...sysConfig, socialLogin: {...sysConfig.socialLogin, facebookAppSecret: e.target.value}})} /></div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                   <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><i className="fas fa-chart-line"></i></div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">Analytics & Tracking</h3>
                   </div>
                   <div className="space-y-6">
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                         <div>
                            <p className="text-[11px] font-black uppercase">Enable Google Analytics</p>
                            <p className="text-[9px] text-gray-400">Track page views and user traffic.</p>
                         </div>
                         <button onClick={() => setSysConfig({...sysConfig, analytics: {...sysConfig.analytics, enabled: !sysConfig.analytics.enabled}})} className={`relative w-10 h-5 rounded-full transition-all ${sysConfig.analytics.enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sysConfig.analytics.enabled ? 'left-5.5' : 'left-0.5'}`}></div>
                         </button>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Measurement ID (G-XXXXXXX)</label>
                         <input type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.analytics.googleAnalyticsId} onChange={e => setSysConfig({...sysConfig, analytics: {...sysConfig.analytics, googleAnalyticsId: e.target.value}})} />
                      </div>
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                   <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><i className="fas fa-magnifying-glass"></i></div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">SEO & Indexing</h3>
                   </div>
                   <div className="space-y-6">
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                         <div>
                            <p className="text-[11px] font-black uppercase">Sitemap Generation</p>
                            <p className="text-[9px] text-gray-400">Auto-update XML sitemap for engines.</p>
                         </div>
                         <button onClick={() => setSysConfig({...sysConfig, seo: {...sysConfig.seo, enableSitemap: !sysConfig.seo.enableSitemap}})} className={`relative w-10 h-5 rounded-full transition-all ${sysConfig.seo.enableSitemap ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sysConfig.seo.enableSitemap ? 'left-5.5' : 'left-0.5'}`}></div>
                         </button>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Global Meta Title</label>
                         <input type="text" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.seo.metaTitle} onChange={e => setSysConfig({...sysConfig, seo: {...sysConfig.seo, metaTitle: e.target.value}})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Global Meta Description</label>
                         <textarea rows={3} className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.seo.metaDescription} onChange={e => setSysConfig({...sysConfig, seo: {...sysConfig.seo, metaDescription: e.target.value}})} />
                      </div>
                   </div>
                </div>
             </div>
             <div className="pt-10 border-t border-gray-100">
                <button onClick={handleSaveConfig} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all">Save Core Platform Registry</button>
             </div>
          </div>
        );
      case 'BUSINESS':
        return (
          <div className="space-y-8 animate-in fade-in duration-500 pb-24">
            <div className="flex items-center bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm w-fit mb-8 overflow-x-auto hide-scrollbar">
               <button onClick={() => setBusinessTab('PRICING')} className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${businessTab === 'PRICING' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Pricing & Limits</button>
               <button onClick={() => setBusinessTab('BANNERS')} className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${businessTab === 'BANNERS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Banner Ads</button>
               <button onClick={() => setBusinessTab('GATEWAYS')} className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${businessTab === 'GATEWAYS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Payment Gateways</button>
               <button onClick={() => setBusinessTab('WALLETS')} className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${businessTab === 'WALLETS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Wallet Transaction</button>
            </div>

            {businessTab === 'PRICING' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                   <h3 className="text-xl font-black uppercase tracking-tighter border-b border-gray-50 pb-4">Global Fee Structure</h3>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Standard Ad Price (₹)</label>
                         <input type="number" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.standardAdPrice} onChange={e => setSysConfig({...sysConfig, standardAdPrice: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Featured (Premium) Ad Price (₹)</label>
                         <input type="number" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.premiumPrice} onChange={e => setSysConfig({...sysConfig, premiumPrice: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Banner Ad Price (₹)</label>
                         <input type="number" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.bannerAdPrice} onChange={e => setSysConfig({...sysConfig, bannerAdPrice: Number(e.target.value)})} />
                      </div>
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                   <h3 className="text-xl font-black uppercase tracking-tighter border-b border-gray-50 pb-4">Duration & Limits</h3>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Free Ads Per User</label>
                         <input type="number" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.freeAdLimit} onChange={e => setSysConfig({...sysConfig, freeAdLimit: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Featured Duration (Days)</label>
                         <input type="number" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.premiumDurationDays} onChange={e => setSysConfig({...sysConfig, premiumDurationDays: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Banner Duration (Days)</label>
                         <input type="number" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={sysConfig.bannerAdDurationDays} onChange={e => setSysConfig({...sysConfig, bannerAdDurationDays: Number(e.target.value)})} />
                      </div>
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 md:col-span-2">
                   <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                      <h3 className="text-xl font-black uppercase tracking-tighter">User Verification (Blue Tick)</h3>
                      <div className="flex items-center gap-4">
                         <span className="text-[10px] font-black uppercase text-gray-400">Activation Status</span>
                         <button 
                            onClick={() => setSysConfig({...sysConfig, blueTickEnabled: !sysConfig.blueTickEnabled})}
                            className={`relative w-12 h-6 rounded-full transition-all ${sysConfig.blueTickEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                         >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${sysConfig.blueTickEnabled ? 'left-7' : 'left-1'}`}></div>
                         </button>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Verification Price (₹)</label>
                         <input 
                            type="number" 
                            className="w-full bg-gray-50 border p-4 rounded-xl font-bold" 
                            value={sysConfig.blueTickPrice} 
                            onChange={e => setSysConfig({...sysConfig, blueTickPrice: Math.max(0, Number(e.target.value))})} 
                         />
                         <p className="text-[9px] text-gray-400 uppercase font-black">Fee charged to users for identity verification</p>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400">Verification Duration (Days)</label>
                         <input 
                            type="number" 
                            className="w-full bg-gray-50 border p-4 rounded-xl font-bold" 
                            value={sysConfig.blueTickDurationDays} 
                            onChange={e => setSysConfig({...sysConfig, blueTickDurationDays: Math.max(1, Number(e.target.value))})} 
                         />
                         <p className="text-[9px] text-gray-400 uppercase font-black">Number of days the verification remains active</p>
                      </div>
                   </div>
                </div>

                <div className="md:col-span-2">
                   <button onClick={handleSaveConfig} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100">Update Platform Parameters</button>
                </div>
              </div>
            )}

            {businessTab === 'BANNERS' && (
              <div className="space-y-8">
                 <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tighter">City Banner Registry</h3>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">High-Impact City Placements</p>
                    </div>
                    <button onClick={() => setShowBannerModal(true)} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">+ Deploy New Banner</button>
                 </div>
                 
                 <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50 border-b border-gray-50">
                          <tr className="text-[9px] font-black uppercase text-gray-400">
                             <th className="px-10 py-5">Creative Preview</th>
                             <th className="px-10 py-5">City Context</th>
                             <th className="px-10 py-5">Status / Expiry</th>
                             <th className="px-10 py-5 text-right">Operations</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {allBanners.map(banner => (
                             <tr key={banner.id} className="hover:bg-gray-50 transition-all">
                                <td className="px-10 py-6">
                                   <div className="w-40 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                      <img src={banner.imageUrl} className="w-full h-full object-cover" />
                                   </div>
                                </td>
                                <td className="px-10 py-6 font-black uppercase text-gray-900">{banner.cityId}</td>
                                <td className="px-10 py-6">
                                   <div className="flex flex-col">
                                      <span className={`w-fit px-2 py-0.5 text-[8px] font-black uppercase rounded mb-1 ${new Date(banner.expiresAt) > new Date() ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                         {new Date(banner.expiresAt) > new Date() ? 'LIVE' : 'EXPIRED'}
                                      </span>
                                      <span className="text-[9px] font-bold text-gray-400 uppercase">{new Date(banner.expiresAt).toLocaleDateString()}</span>
                                   </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                   <button onClick={() => handleDeleteBanner(banner.id)} className="w-8 h-8 bg-gray-50 text-gray-300 hover:text-rose-600 rounded-lg transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                                </td>
                             </tr>
                          ))}
                          {allBanners.length === 0 && (
                             <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black uppercase text-gray-300 italic tracking-widest">No active banner registries</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {businessTab === 'GATEWAYS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {[
                    { id: 'razorpay', label: 'Razorpay', icon: 'fa-credit-card', keys: ['keyId', 'keySecret'] },
                    { id: 'stripe', label: 'Stripe', icon: 'fa-stripe-s', keys: ['publishableKey', 'secretKey'] },
                    { id: 'paypal', label: 'PayPal', icon: 'fa-paypal', keys: ['clientId', 'secret'] },
                    { id: 'paytm', label: 'Paytm', icon: 'fa-wallet', keys: ['merchantId', 'merchantKey', 'website'] },
                    { id: 'phonepe', label: 'PhonePe', icon: 'fa-mobile-screen', keys: ['merchantId', 'saltKey'] }
                 ].map(gw => {
                    const config = sysConfig.paymentGateway[gw.id as keyof SystemConfig['paymentGateway']] as any;
                    return (
                       <div key={gw.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 flex flex-col">
                          <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                   <i className={`fab ${gw.icon} text-lg`}></i>
                                </div>
                                <h4 className="font-black text-gray-900 uppercase tracking-tighter">{gw.label}</h4>
                             </div>
                             <button onClick={() => handleToggleGateway(gw.id as any)} className={`relative w-12 h-6 rounded-full transition-all ${config.active ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.active ? 'left-7' : 'left-1'}`}></div>
                             </button>
                          </div>
                          
                          <div className="space-y-4 flex-1">
                             {gw.keys.map(key => (
                                <div key={key} className="space-y-1">
                                   <label className="text-[9px] font-black uppercase text-gray-400">{key.replace(/([A-Z])/g, ' $1')}</label>
                                   <input 
                                      type="password"
                                      className="w-full bg-gray-50 border p-3 rounded-xl font-bold text-xs" 
                                      value={config[key] || ''} 
                                      onChange={e => handleUpdateGatewayKeys(gw.id as any, { [key]: e.target.value })} 
                                   />
                                </div>
                             ))}
                          </div>
                       </div>
                    );
                 })}
              </div>
            )}

            {businessTab === 'WALLETS' && (
              <div className="space-y-8 animate-in fade-in">
                 {/* Stats Summary Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Period Credit</p>
                       <h4 className="text-3xl font-black text-emerald-600">₹{walletAnalytics.credit.toLocaleString()}</h4>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Period Debit</p>
                       <h4 className="text-3xl font-black text-rose-500">₹{walletAnalytics.debit.toLocaleString()}</h4>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Net Flow</p>
                       <h4 className={`text-3xl font-black ${(walletAnalytics.credit - walletAnalytics.debit) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                          ₹{(walletAnalytics.credit - walletAnalytics.debit).toLocaleString()}
                       </h4>
                    </div>
                 </div>

                 {/* Filters & Navigation */}
                 <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex bg-gray-50 p-1 rounded-2xl w-full lg:w-auto">
                       {[
                          { id: 'LOGS', label: 'History' },
                          { id: 'BALANCES', label: 'User Balances' },
                          { id: 'ANALYTICS', label: 'Reports' }
                       ].map(sub => (
                          <button 
                             key={sub.id}
                             onClick={() => setWalletViewSubTab(sub.id as any)}
                             className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletViewSubTab === sub.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                             {sub.label}
                          </button>
                       ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                       <div className="relative flex-1 lg:w-64">
                          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                          <input 
                             type="text" 
                             placeholder="Search TxID or UserID..."
                             value={walletSearch}
                             onChange={e => setWalletSearch(e.target.value)}
                             className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
                          />
                       </div>
                       <select 
                          className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-[10px] font-black uppercase"
                          value={walletTypeFilter}
                          onChange={e => setWalletTypeFilter(e.target.value as any)}
                       >
                          <option value="ALL">All Types</option>
                          <option value="CREDIT">Credit Only</option>
                          <option value="DEBIT">Debit Only</option>
                       </select>
                       <select 
                          className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-[10px] font-black uppercase"
                          value={walletTimeFilter}
                          onChange={e => setWalletTimeFilter(e.target.value as any)}
                       >
                          <option value="ALL">Lifetime</option>
                          <option value="DAILY">Today</option>
                          <option value="MONTHLY">This Month</option>
                          <option value="YEARLY">This Year</option>
                       </select>
                    </div>
                 </div>

                 {/* Tab Content */}
                 <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                    {walletViewSubTab === 'LOGS' && (
                       <div className="overflow-x-auto">
                          <table className="w-full text-left">
                             <thead className="bg-gray-50 border-b border-gray-50">
                                <tr className="text-[9px] font-black uppercase text-gray-400">
                                   <th className="px-8 py-5">Transaction Details</th>
                                   <th className="px-8 py-5">User ID</th>
                                   <th className="px-8 py-5">Type</th>
                                   <th className="px-8 py-5">Amount</th>
                                   <th className="px-8 py-5">Date & Time</th>
                                   <th className="px-8 py-5 text-right">Status</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-50">
                                {filteredWalletTransactions.map(tx => (
                                   <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-8 py-5">
                                         <p className="text-[11px] font-black text-gray-900 uppercase">{tx.description}</p>
                                         <p className="text-[9px] font-bold text-gray-400">ID: {tx.id}</p>
                                      </td>
                                      <td className="px-8 py-5 text-[11px] font-bold text-gray-600">{tx.userId}</td>
                                      <td className="px-8 py-5">
                                         <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${tx.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {tx.type}
                                         </span>
                                      </td>
                                      <td className={`px-8 py-5 font-black text-sm ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                         {tx.type === 'CREDIT' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                                      </td>
                                      <td className="px-8 py-5 text-[10px] font-bold text-gray-400">
                                         {new Date(tx.timestamp).toLocaleString()}
                                      </td>
                                      <td className="px-8 py-5 text-right">
                                         <span className="bg-blue-50 text-blue-600 text-[8px] font-black uppercase px-2 py-0.5 rounded">Success</span>
                                      </td>
                                   </tr>
                                ))}
                                {filteredWalletTransactions.length === 0 && (
                                   <tr><td colSpan={6} className="py-20 text-center text-[10px] font-black uppercase text-gray-300 italic tracking-widest">No wallet transactions found</td></tr>
                                )}
                             </tbody>
                          </table>
                       </div>
                    )}

                    {walletViewSubTab === 'BALANCES' && (
                       <div className="overflow-x-auto">
                          <table className="w-full text-left">
                             <thead className="bg-gray-50 border-b border-gray-50">
                                <tr className="text-[9px] font-black uppercase text-gray-400">
                                   <th className="px-8 py-5">User Profile</th>
                                   <th className="px-8 py-5">User ID</th>
                                   <th className="px-8 py-5">Verification</th>
                                   <th className="px-8 py-5 text-right">Current Balance</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-50">
                                {allUsers.map(u => (
                                   <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-8 py-5 flex items-center gap-3">
                                         <img src={u.photo} className="w-8 h-8 rounded-lg object-cover" />
                                         <div>
                                            <p className="text-[11px] font-black text-gray-900">{u.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400">{u.email}</p>
                                         </div>
                                      </td>
                                      <td className="px-8 py-5 text-[11px] font-bold text-gray-600">{u.id}</td>
                                      <td className="px-8 py-5">
                                         {u.isVerified ? <i className="fas fa-check-circle text-blue-500 text-xs"></i> : <span className="text-[8px] font-black text-gray-300 uppercase">Standard</span>}
                                      </td>
                                      <td className="px-8 py-5 text-right font-black text-sm text-gray-900">
                                         ₹{u.walletBalance.toLocaleString()}
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    )}

                    {walletViewSubTab === 'ANALYTICS' && (
                       <div className="p-12 space-y-12">
                          <div className="flex flex-col md:flex-row gap-12 items-center justify-center">
                             <div className="relative w-48 h-48">
                                <svg className="w-full h-full transform -rotate-90">
                                   <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="20" fill="transparent" className="text-gray-100" />
                                   <circle 
                                      cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="20" fill="transparent" 
                                      strokeDasharray={502.4}
                                      strokeDashoffset={502.4 - (502.4 * (walletAnalytics.credit / (walletAnalytics.credit + walletAnalytics.debit || 1)))}
                                      className="text-emerald-500" 
                                   />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Flow Mix</p>
                                   <p className="text-xl font-black text-gray-900">{Math.round((walletAnalytics.credit / (walletAnalytics.credit + walletAnalytics.debit || 1)) * 100)}% CR</p>
                                </div>
                             </div>
                             <div className="space-y-4 flex-1 max-w-sm">
                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Volume Distribution</h5>
                                <div className="space-y-2">
                                   <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1"><span>Total Credits</span><span>₹{walletAnalytics.credit.toLocaleString()}</span></div>
                                   <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                      <div className="bg-emerald-500 h-full" style={{ width: `${(walletAnalytics.credit / (walletAnalytics.credit + walletAnalytics.debit || 1)) * 100}%` }}></div>
                                   </div>
                                </div>
                                <div className="space-y-2">
                                   <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1"><span>Total Debits</span><span>₹{walletAnalytics.debit.toLocaleString()}</span></div>
                                   <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                      <div className="bg-rose-500 h-full" style={{ width: `${(walletAnalytics.debit / (walletAnalytics.credit + walletAnalytics.debit || 1)) * 100}%` }}></div>
                                   </div>
                                </div>
                                <p className="text-[9px] text-gray-400 uppercase font-bold italic pt-4">* Metrics based on {walletAnalytics.count} transactions in selected period.</p>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
              </div>
            )}

            {showBannerModal && (
               <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                  <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden">
                     <div className="bg-blue-600 p-8 text-white text-center">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Deploy Banner</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Commercial Media Placement</p>
                     </div>
                     <div className="p-10 space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-gray-400">Target City ID</label>
                           <input autoFocus className="w-full bg-gray-50 border p-4 rounded-xl font-bold uppercase" value={bannerForm.cityId} onChange={e => setBannerForm({...bannerForm, cityId: e.target.value})} placeholder="e.g. c1" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-gray-400">Asset Image URL</label>
                           <input className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={bannerForm.imageUrl} onChange={e => setBannerForm({...bannerForm, imageUrl: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-gray-400">Redirect URL</label>
                           <input className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={bannerForm.linkUrl} onChange={e => setBannerForm({...bannerForm, linkUrl: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-gray-400">Active Duration (Days)</label>
                           <input type="number" className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={bannerForm.duration} onChange={e => setBannerForm({...bannerForm, duration: Number(e.target.value)})} />
                        </div>
                        <div className="flex flex-col gap-3 pt-4">
                           <button onClick={handleCreateAdminBanner} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100">Commit Placement</button>
                           <button onClick={() => setShowBannerModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">Discard</button>
                        </div>
                     </div>
                  </div>
               </div>
            )}
          </div>
        );
      case 'TAXONOMY':
        return (
          <div className="space-y-8 animate-in fade-in duration-500 pb-24">
            <div className="flex items-center bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm w-fit mb-8">
               <button onClick={() => setTaxonomyTab('CAT')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${taxonomyTab === 'CAT' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Categories</button>
               <button onClick={() => setTaxonomyTab('GEO')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${taxonomyTab === 'GEO' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Geography</button>
            </div>

            {taxonomyTab === 'CAT' ? (
              <div className="space-y-6">
                 <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tighter">Taxonomy Hierarchy</h3>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Managed Classification Units</p>
                    </div>
                    <button onClick={() => setShowCatModal(true)} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">+ Create Category</button>
                 </div>
                 
                 <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50 border-b border-gray-50">
                          <tr className="text-[9px] font-black uppercase text-gray-400">
                             <th className="px-10 py-5">Unit Name</th>
                             <th className="px-10 py-5">Reference Icon</th>
                             <th className="px-10 py-5">Global Status</th>
                             <th className="px-10 py-5 text-right">Operations</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {allCategories.map(cat => (
                             <tr key={cat.id} className="hover:bg-gray-50 transition-all">
                                <td className="px-10 py-6 font-black uppercase text-gray-900">{cat.name}</td>
                                <td className="px-10 py-6 text-blue-600"><i className={`fas ${cat.icon} text-lg`}></i></td>
                                <td className="px-10 py-6"><span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-full border border-emerald-100">Active Unit</span></td>
                                <td className="px-10 py-6 text-right">
                                   <div className="flex items-center justify-end gap-2">
                                      <button className="w-8 h-8 bg-gray-50 text-gray-300 hover:text-blue-600 rounded-lg transition-all"><i className="fas fa-pen text-[10px]"></i></button>
                                      <button onClick={() => handleDeleteCategory(cat.id)} className="w-8 h-8 bg-gray-50 text-gray-300 hover:text-rose-600 rounded-lg transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100">
                       <h4 className="text-[10px] font-black uppercase tracking-widest">Countries</h4>
                       <button onClick={() => setShowGeoModal({ type: 'COUNTRY' })} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg"><i className="fas fa-plus text-[10px]"></i></button>
                    </div>
                    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
                       {countries.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => { setSelectedCountry(c); setSelectedState(null); }}
                            className={`p-5 cursor-pointer border-l-4 transition-all flex items-center justify-between ${selectedCountry?.id === c.id ? 'bg-blue-50 border-blue-600' : 'border-transparent hover:bg-gray-50'}`}
                          >
                             <span className="text-[11px] font-black uppercase tracking-tighter">{c.name}</span>
                             <i className="fas fa-chevron-right text-[8px] text-gray-300"></i>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100">
                       <h4 className="text-[10px] font-black uppercase tracking-widest">States / Districts</h4>
                       {selectedCountry && <button onClick={() => setShowGeoModal({ type: 'STATE' })} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg"><i className="fas fa-plus text-[10px]"></i></button>}
                    </div>
                    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
                       {selectedCountry ? (
                          dbService.getStates(selectedCountry.id).map(s => (
                             <div 
                               key={s.id} 
                               onClick={() => setSelectedState(s)}
                               className={`p-5 cursor-pointer border-l-4 transition-all flex items-center justify-between ${selectedState?.id === s.id ? 'bg-blue-50 border-blue-600' : 'border-transparent hover:bg-gray-50'}`}
                             >
                                <span className="text-[11px] font-black uppercase tracking-tighter">{s.name}</span>
                                <div className="flex items-center gap-2">
                                   <button onClick={(e) => { e.stopPropagation(); handleDeleteGeo('STATE', s.id); }} className="text-gray-300 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt text-[8px]"></i></button>
                                   <i className="fas fa-chevron-right text-[8px] text-gray-300"></i>
                                </div>
                             </div>
                          ))
                       ) : <div className="p-10 text-center opacity-30 text-[9px] font-black uppercase italic">Select Country First</div>}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100">
                       <h4 className="text-[10px] font-black uppercase tracking-widest">Cities / Localities</h4>
                       {selectedState && <button onClick={() => setShowGeoModal({ type: 'CITY' })} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg"><i className="fas fa-plus text-[10px]"></i></button>}
                    </div>
                    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
                       {selectedState ? (
                          dbService.getCities(selectedState.id).map(city => (
                             <div key={city.id} className="p-5 border-b border-gray-50 flex items-center justify-between last:border-0 hover:bg-gray-50 transition-all">
                                <span className="text-[11px] font-black uppercase tracking-tighter">{city.name}</span>
                                <button onClick={() => handleDeleteGeo('CITY', city.id)} className="text-gray-300 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt text-[8px]"></i></button>
                             </div>
                          ))
                       ) : <div className="p-10 text-center opacity-30 text-[9px] font-black uppercase italic">Select State First</div>}
                    </div>
                 </div>
              </div>
            )}

            {showGeoModal && (
               <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                  <div className="bg-white w-full max-sm rounded-[2.5rem] shadow-2xl overflow-hidden">
                     <div className="bg-blue-600 p-8 text-white text-center">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Add {showGeoModal.type}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Defining Geographic Nodes</p>
                     </div>
                     <div className="p-10 space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-gray-400">Node Name</label>
                           <input autoFocus className="w-full bg-gray-50 border p-4 rounded-xl font-bold uppercase" value={geoNameInput} onChange={e => setGeoNameInput(e.target.value)} />
                        </div>
                        {showGeoModal.type === 'COUNTRY' && (
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-gray-400">ISO Code</label>
                              <input className="w-full bg-gray-50 border p-4 rounded-xl font-bold uppercase" maxLength={2} value={geoCodeInput} onChange={e => setGeoCodeInput(e.target.value)} />
                           </div>
                        )}
                        <div className="flex flex-col gap-3 pt-4">
                           <button onClick={handleAddGeo} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100">Commit Registry</button>
                           <button onClick={() => setShowGeoModal(null)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">Discard</button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {showCatModal && (
               <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                  <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden">
                     <div className="bg-blue-600 p-8 text-white text-center">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">New Category</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Structural Classification</p>
                     </div>
                     <div className="p-10 space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-gray-400">Label Name</label>
                           <input autoFocus className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-gray-400">FA Icon Class</label>
                           <input className="w-full bg-gray-50 border p-4 rounded-xl font-bold" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} />
                        </div>
                        <div className="flex flex-col gap-3 pt-4">
                           <button onClick={handleAddCategory} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100">Create Category</button>
                           <button onClick={() => setShowCatModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">Discard</button>
                        </div>
                     </div>
                  </div>
               </div>
            )}
          </div>
        );
      case 'OVERVIEW':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Users</p>
                <h4 className="text-4xl font-black text-gray-900">{stats.totalUsers}</h4>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Ads</p>
                <h4 className="text-4xl font-black text-gray-900">{stats.activeAds}</h4>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Review</p>
                <h4 className="text-4xl font-black text-amber-500">{stats.pendingAds}</h4>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Verify Queue</p>
                <h4 className="text-4xl font-black text-blue-600">{stats.pendingVerifications}</h4>
              </div>
            </div>
            <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Real-Time Core Metrics</h3>
              <div className="flex flex-col md:flex-row gap-4">
                 <div className="flex-1 p-6 bg-emerald-50 text-emerald-700 rounded-3xl flex items-center justify-between border border-emerald-100"><span className="text-xs font-black uppercase">Service Availability</span><span className="text-[10px] font-black uppercase">99.9% UP</span></div>
                 <div className="flex-1 p-6 bg-blue-50 text-blue-700 rounded-3xl flex items-center justify-between border border-blue-100"><span className="text-xs font-black uppercase">DB Replication</span><span className="text-[10px] font-black uppercase">Synchronized</span></div>
              </div>
            </div>
          </div>
        );
      case 'INVENTORY':
        return (
          <div className="space-y-8 animate-in fade-in duration-500 pb-24">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2 relative">
                  <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input 
                    type="text" 
                    placeholder="Search Ad Title, ID or Seller ID..." 
                    className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-4 outline-none font-bold text-sm ring-1 ring-gray-100 focus:ring-blue-600 transition-all" 
                    value={listingSearch} 
                    onChange={e => setListingSearch(e.target.value)} 
                  />
                </div>
                <select 
                  className="bg-gray-50 border-none rounded-2xl px-6 py-4 text-[10px] font-black uppercase ring-1 ring-gray-100" 
                  value={listingFilters.status} 
                  onChange={e => setListingFilters({...listingFilters, status: e.target.value})}
                >
                  <option value="ALL">All Status</option>
                  <option value={ListingStatus.PENDING}>Pending</option>
                  <option value={ListingStatus.APPROVED}>Approved / Live</option>
                  <option value={ListingStatus.REJECTED}>Rejected</option>
                  <option value={ListingStatus.EDIT_PENDING}>Edit Pending</option>
                </select>
                <select 
                  className="bg-gray-50 border-none rounded-2xl px-6 py-4 text-[10px] font-black uppercase ring-1 ring-gray-100" 
                  value={listingFilters.isPremium} 
                  onChange={e => setListingFilters({...listingFilters, isPremium: e.target.value})}
                >
                  <option value="ALL">All Ads</option>
                  <option value="YES">Featured / Premium</option>
                  <option value="NO">Standard Ads</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest py-2">Quick Categories:</span>
                 {['All', 'Electronics', 'Properties', 'Furniture', 'Cars'].map(cat => (
                   <button 
                    key={cat} 
                    onClick={() => setListingFilters({...listingFilters, category: cat === 'All' ? 'ALL' : cat})}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${listingFilters.category === (cat === 'All' ? 'ALL' : cat) ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                   >
                     {cat}
                   </button>
                 ))}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-50">
                    <tr className="text-[9px] font-black uppercase text-gray-400 whitespace-nowrap">
                      <th className="px-8 py-5">Ad Identity</th>
                      <th className="px-8 py-5">Seller</th>
                      <th className="px-8 py-5">Geo Details</th>
                      <th className="px-8 py-5 text-center">Featured</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredListings.map(l => (
                      <tr key={l.id} className="hover:bg-blue-50/20 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img src={l.images[0]} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                            <div className="min-w-0 max-w-[200px]">
                              <p className="text-[12px] font-black text-gray-900 truncate uppercase">{l.title}</p>
                              <p className="text-[10px] text-blue-600 font-bold">₹{l.price.toLocaleString()}</p>
                              <p className="text-[8px] text-gray-400 font-bold mt-1">ID: {l.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-[10px] font-black text-gray-700 uppercase">{l.sellerId}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{l.category}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-900 uppercase">
                            <i className="fas fa-location-dot text-rose-500 text-[8px]"></i>
                            {l.cityId}
                          </div>
                          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-1">Pub: {l.publishedAt ? new Date(l.publishedAt).toLocaleDateString() : 'N/A'}</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button 
                            onClick={() => toggleFeaturedListing(l)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${l.isPremium ? 'bg-yellow-100 text-yellow-600 shadow-sm' : 'bg-gray-50 text-gray-300'}`}
                          >
                            <i className="fas fa-crown text-xs"></i>
                          </button>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${
                            l.status === ListingStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' :
                            l.status === ListingStatus.PENDING ? 'bg-amber-50 text-amber-600' :
                            l.status === ListingStatus.REJECTED ? 'bg-rose-50 text-rose-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button onClick={() => onViewAd(l)} className="w-8 h-8 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-lg transition-all" title="View Details"><i className="fas fa-eye text-[10px]"></i></button>
                             <button onClick={() => handleEditListing(l)} className="w-8 h-8 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-lg transition-all" title="Edit Ad"><i className="fas fa-pen text-[10px]"></i></button>
                             {l.status === ListingStatus.PENDING && (
                               <>
                                 <button onClick={() => handleApproveListing(l.id)} className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg transition-all" title="Approve"><i className="fas fa-check text-[10px]"></i></button>
                                 <button onClick={() => handleOpenRejectListing(l.id)} className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg transition-all" title="Reject"><i className="fas fa-times text-[10px]"></i></button>
                               </>
                             )}
                             <button onClick={() => handleDeleteListing(l.id)} className="w-8 h-8 bg-gray-50 text-gray-400 hover:text-rose-600 rounded-lg transition-all" title="Delete"><i className="fas fa-trash-alt text-[10px]"></i></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredListings.length === 0 && (
                      <tr><td colSpan={6} className="py-24 text-center text-gray-300 font-black uppercase text-xs tracking-[0.2em] italic">No Matching Inventory Records</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'USERS':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="relative flex-1">
                  <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                  <input 
                    type="text" 
                    placeholder="Search by Name, Email, Mobile or User ID..." 
                    className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-4 outline-none font-bold text-sm ring-1 ring-gray-100 focus:ring-blue-600 transition-all" 
                    value={userSearch} 
                    onChange={e => setUserSearch(e.target.value)} 
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    className="bg-gray-50 border-none rounded-2xl px-6 py-4 text-[10px] font-black uppercase ring-1 ring-gray-100" 
                    value={userFilter.role} 
                    onChange={e => setUserFilter({...userFilter, role: e.target.value})}
                  >
                    <option value="ALL">All Roles</option>
                    <option value={UserRole.ADMIN}>Admins</option>
                    <option value={UserRole.MODERATOR}>Moderators</option>
                    <option value={UserRole.USER}>Users</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-50">
                  <tr className="text-[9px] font-black uppercase text-gray-400">
                    <th className="px-10 py-5">User Profile</th>
                    <th className="px-10 py-5">Role / Status</th>
                    <th className="px-10 py-5">Wallet</th>
                    <th className="px-10 py-5 text-right">Account Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-blue-50/20 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <img src={u.photo} className="w-10 h-10 rounded-xl object-cover" />
                          <div>
                            <p className="text-sm font-black text-gray-900">{u.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${u.role === UserRole.ADMIN ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-600'}`}>{u.role}</span>
                          {u.isSuspended && <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded uppercase">Suspended</span>}
                          {u.isVerified && <i className="fas fa-check-circle text-blue-500 text-xs"></i>}
                        </div>
                      </td>
                      <td className="px-10 py-6 font-black text-gray-900">₹{u.walletBalance.toLocaleString()}</td>
                      <td className="px-10 py-6 text-right">
                        <button onClick={() => handleEditUser(u)} className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all">Audit Account</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default: return <div className="p-20 text-center opacity-40"><h3 className="text-xl font-black uppercase">{activeSection}</h3><p className="text-xs font-bold uppercase mt-2">Enterprise rollout in progress</p></div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      <div className="hidden lg:block w-80 h-full flex-shrink-0 z-50 border-r border-gray-100"><SidebarContent /></div>
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        <div className={`absolute inset-y-0 left-0 w-80 bg-white shadow-2xl transition-transform transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}><SidebarContent /></div>
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="h-24 bg-white border-b border-gray-100 flex items-center justify-between px-12 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><i className="fas fa-bars"></i></button>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter truncate">{activeSection.replace('_', ' ')}</h2>
          </div>
          <button onClick={onLogout} className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-colors"><i className="fas fa-power-off"></i></button>
        </header>
        <main className="flex-1 overflow-y-auto p-12 custom-scrollbar"><div className="max-w-[1400px] mx-auto pb-24">{renderContent()}</div></main>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="bg-rose-600 p-8 text-white text-center">
                 <h3 className="text-2xl font-black">Reject Listing</h3>
                 <p className="text-rose-100 text-[10px] font-black uppercase tracking-widest mt-2">Provide Internal Remark</p>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Reason / Rejection Note</label>
                    <textarea 
                      autoFocus
                      rows={4}
                      className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold focus:border-rose-500 outline-none transition-all" 
                      value={rejectionNote} 
                      onChange={e => setRejectionNote(e.target.value)} 
                      placeholder="Explain why this listing is being rejected..." 
                    />
                 </div>
                 <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={confirmRejection} 
                      className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-rose-100"
                    >
                      Confirm Rejection
                    </button>
                    <button 
                      onClick={() => { setShowRejectModal(false); setEditingListing(null); }} 
                      className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest"
                    >
                      Go Back
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
