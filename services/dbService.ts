
import { 
  User, Listing, Category, BannerAd, 
  WalletTransaction, SystemConfig, City, State, Country,
  ListingStatus, UserRole, Chat, Message, SecurityLog,
  Rating, SubscriptionPlan, UserSubscription, AdReport, SupportTicket
} from '../types';
import { MOCK_LISTINGS, MOCK_USER, CITIES, STATES } from '../constants';

// In a real production app, this would come from process.env.API_URL
const API_BASE_URL = 'http://localhost:5000/api'; 

class DbService {
  // Helper for API calls with mock fallback
  private async request(endpoint: string, options: RequestInit = {}, fallbackData?: any) {
    const token = localStorage.getItem('adoiz_auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Something went wrong');
      }
      return await response.json();
    } catch (err: any) {
      // If the backend is not running (Failed to fetch), we use the fallback mock data
      if (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        return fallbackData;
      }
      // Log other types of errors
      console.error(`API Error (${endpoint}):`, err.message);
      throw err;
    }
  }

  // --- System Config ---
  getSystemConfig(): SystemConfig {
    const saved = localStorage.getItem('adoiz_config');
    return saved ? JSON.parse(saved) : this.getDefaultConfig();
  }

  private getDefaultConfig(): SystemConfig {
    return {
      siteName: 'adoiz',
      logoUrl: '',
      faviconUrl: '',
      maintenanceMode: false,
      premiumPrice: 500,
      premiumDurationDays: 30,
      standardAdPrice: 0,
      freeAdLimit: 1,
      blueTickPrice: 2000,
      blueTickDurationDays: 365,
      blueTickEnabled: true,
      bannerAdPrice: 1000,
      bannerAdDurationDays: 7,
      bannerAdTierPrices: { T1: 2000, T2: 1000, T3: 500 },
      googleAdsenseCode: '',
      cityTierMapping: {},
      subscriptionPlans: [
        { id: 'plan_basic', name: 'Basic Trader', price: 199, durationDays: 30, features: ['Unlimited Standard Ads', 'Basic Support'] },
        { id: 'plan_pro', name: 'Pro Merchant', price: 499, durationDays: 30, features: ['Unlimited Standard Ads', '2 Premium Boosts'], isPopular: true },
        { id: 'plan_enterprise', name: 'Enterprise Elite', price: 4999, durationDays: 365, features: ['Unlimited Everything', '10 Premium Boosts'] }
      ],
      featureToggles: { ads: true, banners: true, wallet: true, verification: true, guestBrowsing: true, cityLock: true },
      adminUrl: '/admin',
      adminUsername: 'admin',
      branding: {
        siteTagline: 'Enterprise Subscription Marketplace',
        footerText: '© 2024 adoiz Technologies',
        primaryColor: '#1a73e8',
        secondaryColor: '#fbbc05',
        supportEmail: 'support@adoiz.com',
        supportPhone: '+91 1234567890',
        address: 'Mumbai, India',
        social: { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' },
        resourceLinks: [{ label: 'Safety Center', url: '#' }]
      },
      socialLogin: { googleClientId: '', facebookAppId: '' },
      otpConfig: {
        email: { enabled: false, smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpSecure: true },
        sms: { enabled: false, provider: 'MSG91', apiKey: '', senderId: '' }
      },
      paymentGateway: { razorpay: { active: true, keyId: '', keySecret: '' }, upiId: 'adoiz@upi' }
    };
  }

  async updateSystemConfig(newConfig: Partial<SystemConfig>): Promise<void> {
    localStorage.setItem('adoiz_config', JSON.stringify({ ...this.getSystemConfig(), ...newConfig }));
  }

  // --- Locations ---
  async getCountries(): Promise<Country[]> {
    return this.request('/locations/countries', {}, [{ id: 'ctr1', name: 'India', code: 'IN', isActive: true }]);
  }

  async getStates(countryId?: string): Promise<State[]> {
    return this.request(`/locations/states?countryId=${countryId}`, {}, STATES);
  }

  async getCities(stateId?: string): Promise<City[]> {
    const fallback = stateId ? CITIES.filter(c => c.stateId === stateId) : CITIES;
    return this.request(`/locations/cities?stateId=${stateId}`, {}, fallback);
  }

  async addCity(c: Partial<City>): Promise<City> {
    return this.request('/locations/cities', { method: 'POST', body: JSON.stringify(c) }, { id: 'new-city', ...c } as City);
  }

  // --- Categories ---
  async getCategories(): Promise<Category[]> {
    const fallback = [
      { id: 'cat1', name: 'Electronics', icon: 'fa-laptop' },
      { id: 'cat2', name: 'Cars', icon: 'fa-car' },
      { id: 'cat3', name: 'Properties', icon: 'fa-building' },
      { id: 'cat4', name: 'Furniture', icon: 'fa-couch' },
      { id: 'cat5', name: 'Jobs', icon: 'fa-briefcase' }
    ];
    return this.request('/categories', {}, fallback);
  }

  // --- Auth & Users ---
  async getAllUsers(): Promise<User[]> { 
    return this.request('/admin/users', {}, [MOCK_USER, { ...MOCK_USER, id: 'admin-master', role: UserRole.ADMIN, name: 'Admin User' }]); 
  }
  
  async getUserById(id: string): Promise<User | null> {
    return this.request(`/users/${id}`, {}, MOCK_USER);
  }

  async registerUser(u: Partial<User>): Promise<User> {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(u) }, { ...MOCK_USER, ...u } as User);
  }

  async adminUpdateUser(id: string, data: Partial<User>, adminId: string): Promise<User | null> {
    return this.request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, { ...MOCK_USER, ...data } as User);
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<User | null> {
    return this.request(`/users/${userId}/profile`, { method: 'PATCH', body: JSON.stringify(data) }, { ...MOCK_USER, ...data } as User);
  }

  // --- Wallet & Subscriptions ---
  async rechargeWallet(userId: string, amount: number): Promise<User | null> {
    const updated = { ...MOCK_USER, walletBalance: MOCK_USER.walletBalance + amount };
    return this.request('/wallet/recharge', { method: 'POST', body: JSON.stringify({ amount }) }, updated);
  }

  async subscribeUser(userId: string, planId: string): Promise<User | null> {
    return this.request('/subscriptions/activate', { method: 'POST', body: JSON.stringify({ planId }) }, MOCK_USER);
  }

  async adminAdjustWallet(userId: string, amount: number, type: 'CREDIT' | 'DEBIT', reason: string, adminId: string): Promise<User> {
    return this.request(`/admin/wallet/${userId}`, { method: 'POST', body: JSON.stringify({ amount, type, reason }) }, MOCK_USER);
  }

  async getTransactionsByUserId(userId: string): Promise<WalletTransaction[]> {
    return this.request('/wallet/history', {}, []);
  }

  // --- Listings ---
  async getListingsByCity(cityId: string, searchQuery: string = '', category: string = 'All'): Promise<Listing[]> {
    let fallback = MOCK_LISTINGS.filter(l => l.cityId === cityId);
    if (category !== 'All') fallback = fallback.filter(l => l.category === category);
    if (searchQuery) fallback = fallback.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return this.request(`/listings?cityId=${cityId}&search=${searchQuery}&category=${category}`, {}, fallback);
  }

  async getListingsBySeller(sellerId: string): Promise<Listing[]> {
    const fallback = MOCK_LISTINGS.filter(l => l.sellerId === sellerId);
    return this.request(`/listings/seller/${sellerId}`, {}, fallback);
  }
  
  async createListing(l: Partial<Listing>): Promise<Listing> {
    return this.request('/listings', { method: 'POST', body: JSON.stringify(l) }, { id: `l-${Date.now()}`, ...l } as Listing);
  }

  async updateListing(id: string, data: Partial<Listing>): Promise<Listing> {
    return this.request(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, { id, ...data } as Listing);
  }

  async deleteListing(id: string): Promise<void> { 
    return this.request(`/listings/${id}`, { method: 'DELETE' }, undefined);
  }

  async recordView(id: string): Promise<void> { 
    return this.request(`/listings/${id}/view`, { method: 'POST' }, undefined);
  }

  async upgradeListingToPremium(listingId: string, userId: string): Promise<void> {
    return this.request(`/listings/${listingId}/boost`, { method: 'POST' }, undefined);
  }

  async updateListingStatus(id: string, status: ListingStatus, reason?: string, adminId?: string): Promise<Listing> {
    return this.request(`/admin/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }, { id, status } as Listing);
  }

  // --- Banners ---
  async getActiveBanners(cityId: string): Promise<BannerAd[]> {
    const fallback = [
      { id: 'b1', userId: 'u1', cityId, title: 'Summer Sale', imageUrl: 'https://picsum.photos/seed/ads1/1600/400', linkUrl: '#', status: 'LIVE', createdAt: new Date().toISOString(), views: 1500, clicks: 120 }
    ] as BannerAd[];
    return this.request(`/banners?cityId=${cityId}`, {}, fallback);
  }

  async getUserBanners(userId: string): Promise<BannerAd[]> {
    return this.request('/banners/my-ads', {}, []);
  }

  async createBannerAd(ad: Partial<BannerAd>): Promise<BannerAd> {
    return this.request('/banners', { method: 'POST', body: JSON.stringify(ad) }, { id: `b-${Date.now()}`, ...ad, views: 0, clicks: 0 } as BannerAd);
  }

  async adminUpdateBannerStatus(id: string, status: BannerAd['status'], reason?: string, adminId?: string): Promise<BannerAd> {
    return this.request(`/admin/banners/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }, { id, status } as BannerAd);
  }

  async recordBannerView(id: string): Promise<void> {
    return this.request(`/banners/${id}/view`, { method: 'POST' }, undefined);
  }

  async recordBannerClick(id: string): Promise<void> {
    return this.request(`/banners/${id}/click`, { method: 'POST' }, undefined);
  }

  // --- Moderation Queue ---
  async getModerationQueue(cityIds: string[]): Promise<Listing[]> { 
    const fallback = MOCK_LISTINGS.filter(l => l.status === ListingStatus.PENDING);
    return this.request('/admin/moderation/listings', {}, fallback); 
  }
  async getModerationBanners(cityIds: string[]): Promise<BannerAd[]> { return this.request('/admin/moderation/banners', {}, []); }
  async getModerationReports(cityIds: string[]): Promise<AdReport[]> { return this.request('/admin/moderation/reports', {}, []); }
  async getModerationTickets(cityIds: string[]): Promise<SupportTicket[]> { return this.request('/admin/moderation/tickets', {}, []); }
  
  async resolveAdReport(reportId: string, status: 'RESOLVED' | 'DISMISSED'): Promise<AdReport> {
    return this.request(`/admin/moderation/reports/${reportId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, { id: reportId, status } as AdReport);
  }
  async resolveTicket(ticketId: string): Promise<SupportTicket> {
    return this.request(`/admin/moderation/tickets/${ticketId}/resolve`, { method: 'PATCH' }, { id: ticketId, status: 'RESOLVED' } as SupportTicket);
  }

  // --- Chats ---
  async getChatsForUser(userId: string): Promise<Chat[]> { return this.request('/chats', {}, []); }
  async getMessages(chatId: string): Promise<Message[]> { return this.request(`/chats/${chatId}/messages`, {}, []); }
  
  async sendMessage(chatId: string, senderId: string, text: string): Promise<Message> {
    return this.request(`/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }, { id: `m-${Date.now()}`, text } as Message);
  }

  async getOrCreateChat(userId: string, sellerId: string, listing: Listing, sellerName: string): Promise<Chat> {
    return this.request('/chats/init', { method: 'POST', body: JSON.stringify({ sellerId, listingId: listing.id }) }, { id: 'c-new', otherPartyName: sellerName, listingTitle: listing.title } as Chat);
  }

  // --- Reports & Ratings ---
  async createAdReport(report: Partial<AdReport>): Promise<AdReport> {
    return this.request('/reports', { method: 'POST', body: JSON.stringify(report) }, { id: 'r-new', ...report } as AdReport);
  }

  async submitRating(fromUser: User, toUserId: string, score: number, comment: string): Promise<Rating> {
    return this.request(`/users/${toUserId}/rate`, { method: 'POST', body: JSON.stringify({ score, comment }) }, { id: 'rt-new', score, comment } as Rating);
  }

  async getRatingsForUser(userId: string): Promise<Rating[]> {
    return this.request(`/users/${userId}/ratings`, {}, []);
  }

  async getSearchSuggestions(cityId: string, query: string): Promise<string[]> {
    return this.request(`/search/suggestions?cityId=${cityId}&q=${query}`, {}, []);
  }

  async getAllTransactions(): Promise<WalletTransaction[]> { return this.request('/admin/transactions', {}, []); }
  async getSecurityLogs(): Promise<SecurityLog[]> { return this.request('/admin/logs', {}, []); }
  async getAllListings(): Promise<Listing[]> { return this.request('/admin/all-listings', {}, MOCK_LISTINGS); }
  async getAllBanners(): Promise<BannerAd[]> { return this.request('/admin/all-banners', {}, []); }
}

export const dbService = new DbService();
