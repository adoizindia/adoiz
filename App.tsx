
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, City, Listing, UserRole, Chat } from './types';
import { BottomNav } from './components/layout/BottomNav';
import { Navbar } from './components/layout/Navbar';
import { SearchBar } from './components/layout/SearchBar';
import { Footer } from './components/layout/Footer';
import { CityPicker } from './pages/CityPicker';
import { Home } from './pages/Home';
import { ProductDetail } from './pages/ProductDetail';
import { Dashboard } from './pages/Dashboard';
import { PostAd } from './pages/PostAd';
import { ListingFeed } from './pages/ListingFeed';
import { Inbox } from './pages/Inbox';
import { ChatRoom } from './pages/ChatRoom';
import { Auth } from './pages/Auth';
import { ModerationPanel } from './pages/ModerationPanel';
import { AdminPanel } from './pages/AdminPanel';
import { CITIES } from './constants';
import { dbService } from './services/dbService';

type ViewState = 'HOME' | 'DETAIL' | 'DASHBOARD' | 'POST_AD' | 'EDIT_AD' | 'LISTINGS' | 'MESSAGES' | 'CHAT_ROOM' | 'MODERATION' | 'ADMIN_PANEL' | 'AUTH';

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null); 
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [listingToEdit, setListingToEdit] = useState<Listing | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<User | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const config = useMemo(() => dbService.getSystemConfig(), [view]);

  useEffect(() => {
    const handler = (e: any) => showToast(e.detail.message, e.detail.type);
    window.addEventListener('adoiz-notify', handler);
    
    // Handle PWA Installation Prompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('adoiz-notify', handler);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, [showToast]);

  const handleSocialAuth = async (email: string, name: string, photo: string, provider: 'google' | 'facebook') => {
    const allUsers = await dbService.getAllUsers();
    let found = allUsers.find(u => u.email === email);
    if (!found) {
      found = await dbService.registerUser({ email, name, role: UserRole.USER, socialProvider: provider, photo: photo });
      showToast("Account created successfully!", "success");
    }
    if (found.isSuspended) {
      showToast("Account suspended.", "error");
      return;
    }
    handleLoginSuccess(found);
  };

  useEffect(() => {
    const currentConfig = dbService.getSystemConfig();
    const g = (window as any).google;
    if (g) {
      g.accounts.id.initialize({
        client_id: currentConfig.socialLogin.googleClientId || 'YOUR_GOOGLE_ID',
        callback: (res: any) => {
            const base64Url = res.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            handleSocialAuth(payload.email, payload.name, payload.picture, 'google');
        },
      });
    }
  }, [config.socialLogin.googleClientId]);

  useEffect(() => {
    const currentConfig = dbService.getSystemConfig();
    setIsMaintenance(currentConfig.maintenanceMode && user?.role !== UserRole.ADMIN);
  }, [user, config.maintenanceMode]);

  useEffect(() => {
    if (user) {
      if (user.cityId) {
        const city = CITIES.find(c => c.id === user.cityId);
        if (city) setCurrentCity(city);
      }
    } else {
      const storedCityId = localStorage.getItem('adoiz_guest_city_id');
      if (storedCityId) {
        const city = CITIES.find(c => c.id === storedCityId);
        if (city) setCurrentCity(city);
      }
    }
  }, [user]);

  const loadUserListings = useCallback(async () => {
    if (user) {
      const mine = await dbService.getListingsBySeller(user.id);
      setUserListings([...mine]);
    }
  }, [user]);

  useEffect(() => {
    if (view === 'DASHBOARD') loadUserListings();
  }, [view, loadUserListings]);

  const handleCitySelect = (city: City) => {
    setCurrentCity(city);
    if (!user) localStorage.setItem('adoiz_guest_city_id', city.id);
    showToast(`City changed to ${city.name}`, "info");
    if (['DETAIL', 'POST_AD', 'EDIT_AD'].includes(view)) setView('HOME');
  };

  const handleListingClick = async (listing: Listing) => {
    await dbService.recordView(listing.id);
    const seller = await dbService.getUserById(listing.sellerId);
    setSelectedListing(listing);
    setSelectedSeller(seller);
    setView('DETAIL');
  };

  const handleContactSeller = async (listing: Listing, seller: User) => {
    if (!user) { setView('AUTH'); return; }
    if (user.id === seller.id) { showToast("You cannot chat with yourself.", "info"); return; }
    
    const chat = await dbService.getOrCreateChat(user.id, seller.id, listing, seller.name);
    
    // Check if chat is new (no messages) and send an automated context message
    const messages = await dbService.getMessages(chat.id);
    if (messages.length === 0) {
      await dbService.sendMessage(chat.id, user.id, `Hi! I'm interested in your ad: "${listing.title}". Is it still available?`);
    }

    setSelectedChat(chat);
    setView('CHAT_ROOM');
  };

  const handleLoginSuccess = (u: User) => {
    setUser(u);
    showToast(`Welcome back, ${u.name}!`, "success");
    if (u.role === UserRole.ADMIN) setView('ADMIN_PANEL');
    else if (u.role === UserRole.MODERATOR) setView('MODERATION');
    else setView('HOME');
  };

  const handleLogout = () => { 
    setUser(null); 
    setView('HOME'); 
    showToast("Logged out successfully.", "info");
  };

  const handleNavigationChange = (tab: string) => {
    if (tab === 'home') setView('HOME');
    else if (tab === 'list') { setSearchQuery(''); setActiveCategory('All'); setView('LISTINGS'); }
    else if (tab === 'auth') setView('AUTH');
    else if (tab === 'profile') setView(user ? 'DASHBOARD' : 'AUTH');
    else if (tab === 'sell') setView(user ? 'POST_AD' : 'AUTH');
    else if (tab === 'message') setView(user ? 'MESSAGES' : 'AUTH');
  };

  const mapViewStateToTab = (): string => {
    if (view === 'HOME') return 'home';
    if (['LISTINGS', 'DETAIL'].includes(view)) return 'list';
    if (['MESSAGES', 'CHAT_ROOM'].includes(view)) return 'message';
    if (['POST_AD', 'EDIT_AD'].includes(view)) return 'sell';
    if (['DASHBOARD', 'ADMIN_PANEL', 'MODERATION'].includes(view)) return 'profile';
    return '';
  };

  const renderView = () => {
    if (isMaintenance) return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 text-center">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6"><i className="fas fa-tools text-amber-600 text-4xl"></i></div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">Maintenance</h2>
        <button onClick={() => setView('AUTH')} className="mt-8 text-blue-600 font-bold uppercase text-xs tracking-widest hover:underline">Admin Login</button>
      </div>
    );

    if (!currentCity && view !== 'AUTH') return <CityPicker onSelect={handleCitySelect} />;

    switch (view) {
      case 'AUTH': return <Auth onLogin={handleLoginSuccess} onGoogleLogin={() => (window as any).google?.accounts.id.prompt()} onFacebookLogin={() => (window as any).FB?.login()} />;
      case 'HOME': return <Home city={currentCity!} onSearch={q => { setSearchQuery(q); setView('LISTINGS'); }} onCategorySelect={c => { setActiveCategory(c); setSearchQuery(''); setView('LISTINGS'); }} onListingClick={handleListingClick} onSelectCity={() => setCurrentCity(null)} />;
      case 'LISTINGS': return <ListingFeed city={currentCity!} onListingClick={handleListingClick} onSelectCity={() => setCurrentCity(null)} searchQuery={searchQuery} category={activeCategory} onSearchChange={setSearchQuery} onCategoryChange={setActiveCategory} />;
      case 'DETAIL': return selectedListing && selectedSeller ? <ProductDetail user={user} listing={selectedListing} seller={selectedSeller} onBack={() => setView('LISTINGS')} onContactSeller={handleContactSeller} onListingClick={handleListingClick} /> : null;
      case 'DASHBOARD': return user ? <Dashboard user={user} listings={userListings} onEdit={l => { setListingToEdit(l); setView('EDIT_AD'); }} onDelete={async id => { if (window.confirm("Delete this listing permanently?")) { await dbService.deleteListing(id); loadUserListings(); showToast("Listing deleted successfully.", "error"); } }} onBoost={async id => { await dbService.upgradeListingToPremium(id, user.id); loadUserListings(); showToast("Upgraded to Premium!", "success"); }} onPostNew={() => setView('POST_AD')} onAddFunds={async a => { const u = await dbService.rechargeWallet(user.id, a); if (u) { setUser(u); showToast(`Wallet recharged with ₹${a}`, "success"); } }} onUpdateUser={u => setUser(u)} onLogout={handleLogout} onAdminPanel={() => setView('ADMIN_PANEL')} onModerationPanel={() => setView('MODERATION')} /> : null;
      case 'POST_AD': return user ? <PostAd user={user} city={currentCity!} onUpdateUser={u => setUser(u)} onSuccess={() => { setView('DASHBOARD'); showToast("Ad posted successfully!", "success"); }} onCancel={() => setView('DASHBOARD')} /> : null;
      case 'EDIT_AD': return user && listingToEdit ? <PostAd user={user} city={currentCity!} onUpdateUser={u => setUser(u)} editListing={listingToEdit} onSuccess={() => { setView('DASHBOARD'); showToast("Ad updated successfully!", "success"); }} onCancel={() => setView('DASHBOARD')} /> : null;
      case 'MESSAGES': return user ? <Inbox user={user} onSelectChat={c => { setSelectedChat(c); setView('CHAT_ROOM'); }} /> : null;
      case 'CHAT_ROOM': return user && selectedChat ? <ChatRoom user={user} chat={selectedChat} onBack={() => setView('MESSAGES')} /> : null;
      case 'MODERATION': return user ? <ModerationPanel user={user} onBack={() => setView('DASHBOARD')} /> : null;
      case 'ADMIN_PANEL': return user ? <AdminPanel user={user} onBack={() => setView('DASHBOARD')} onLogout={handleLogout} onGoToModeration={() => setView('MODERATION')} onViewAd={handleListingClick} /> : null;
      default: return null;
    }
  };

  const showNavbar = view !== 'AUTH' && view !== 'ADMIN_PANEL' && !isMaintenance;
  const isFrontView = view !== 'ADMIN_PANEL';

  return (
    <div className={`h-screen bg-gray-50 flex flex-col overflow-hidden ${isFrontView ? 'front-view' : ''}`}>
      {showNavbar && <Navbar user={user} city={currentCity} activeTab={mapViewStateToTab()} setActiveTab={handleNavigationChange} onLogout={handleLogout} onSelectCity={() => setCurrentCity(null)} />}
      {showNavbar && <SearchBar city={currentCity} onSearch={q => { setSearchQuery(q); setView('LISTINGS'); }} searchQuery={searchQuery} />}
      <main className={`flex-1 overflow-y-auto ${showNavbar ? 'pb-20 md:pb-0' : ''}`}>
        {renderView()}
        {showNavbar && <Footer />}
      </main>
      {showNavbar && <BottomNav activeTab={mapViewStateToTab()} setActiveTab={handleNavigationChange} />}
      
      {/* Global Toast Container */}
      <div className="fixed bottom-24 md:bottom-10 right-4 md:right-10 z-[1000] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto min-w-[280px] p-5 rounded-[1.5rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-500 ${toast.type === 'error' ? 'bg-rose-600 text-white' : toast.type === 'info' ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'}`}>
             <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
               <i className={`fas ${toast.type === 'error' ? 'fa-circle-exclamation' : toast.type === 'info' ? 'fa-circle-info' : 'fa-circle-check'}`}></i>
             </div>
             <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
