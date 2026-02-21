
import { 
  User, Listing, Category, BannerAd, 
  WalletTransaction, SystemConfig, City, State, Country,
  ListingStatus, UserRole, Chat, Message, SecurityLog,
  Rating, SubscriptionPlan, UserSubscription, AdReport, SupportTicket
} from '../types';
import { MOCK_LISTINGS, MOCK_USER, ADDITIONAL_MOCK_USERS, CITIES, STATES } from '../constants';

// In a real production app, this would come from process.env.API_URL
const API_BASE_URL = 'http://localhost:5000/api'; 

class DbService {
  // In-memory store for mock data persistence
  private _users: User[] = [MOCK_USER, ...ADDITIONAL_MOCK_USERS];
  private _listings: Listing[] = [...MOCK_LISTINGS];
  private _banners: BannerAd[] = [];
  private _chats: Chat[] = [];
  private _messages: Record<string, Message[]> = {};
  private _reports: AdReport[] = [];
  private _transactions: WalletTransaction[] = [];
  private _ratings: Rating[] = [];
  private _tickets: SupportTicket[] = [];

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
      bannerAdTierPrices: { T1: 500, T2: 300, T3: 150 }, // CPM Rates per 1000 impressions
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
    return this.request('/admin/users', {}, this._users); 
  }
  
  async getUserById(id: string): Promise<User | null> {
    const user = this._users.find(u => u.id === id);
    return this.request(`/users/${id}`, {}, user || MOCK_USER);
  }

  async registerUser(u: Partial<User>): Promise<User> {
    const newUser = { ...MOCK_USER, ...u, id: `u-${Date.now()}` } as User;
    this._users.push(newUser);
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(u) }, newUser);
  }

  async adminUpdateUser(id: string, data: Partial<User>, adminId: string): Promise<User | null> {
    return this.request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, { ...MOCK_USER, ...data } as User);
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<User | null> {
    return this.request(`/users/${userId}/profile`, { method: 'PATCH', body: JSON.stringify(data) }, { ...MOCK_USER, ...data } as User);
  }

  // --- Wallet & Subscriptions ---
  async rechargeWallet(userId: string, amount: number): Promise<User | null> {
    const userIndex = this._users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      this._users[userIndex].walletBalance += amount;
      
      // Record Transaction
      this._transactions.push({
        id: `txn-${Date.now()}`,
        userId,
        amount: Math.abs(amount),
        type: amount > 0 ? 'CREDIT' : 'DEBIT',
        description: amount > 0 ? 'Wallet Recharge' : 'Service Payment',
        timestamp: new Date().toISOString()
      });

      return this.request('/wallet/recharge', { method: 'POST', body: JSON.stringify({ amount }) }, this._users[userIndex]);
    }
    return null;
  }

  async subscribeUser(userId: string, planId: string): Promise<User | null> {
    return this.request('/subscriptions/activate', { method: 'POST', body: JSON.stringify({ planId }) }, MOCK_USER);
  }

  async adminAdjustWallet(userId: string, amount: number, type: 'CREDIT' | 'DEBIT', reason: string, adminId: string): Promise<User> {
    const userIndex = this._users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      if (type === 'CREDIT') {
        this._users[userIndex].walletBalance += amount;
      } else {
        this._users[userIndex].walletBalance -= amount;
      }

      // Record Transaction
      this._transactions.push({
        id: `txn-${Date.now()}`,
        userId,
        amount,
        type,
        description: `Admin Adjustment: ${reason}`,
        timestamp: new Date().toISOString()
      });

      return this.request(`/admin/wallet/${userId}`, { method: 'POST', body: JSON.stringify({ amount, type, reason }) }, this._users[userIndex]);
    }
    return this.request(`/admin/wallet/${userId}`, { method: 'POST', body: JSON.stringify({ amount, type, reason }) }, MOCK_USER);
  }

  async getTransactionsByUserId(userId: string): Promise<WalletTransaction[]> {
    const txns = this._transactions.filter(t => t.userId === userId);
    return this.request('/wallet/history', {}, txns);
  }

  // --- Listings ---
  async getListingsByCity(cityId: string, searchQuery: string = '', category: string = 'All'): Promise<Listing[]> {
    let fallback = this._listings.filter(l => l.cityId === cityId && l.status === ListingStatus.APPROVED);
    if (category !== 'All') fallback = fallback.filter(l => l.category === category);
    if (searchQuery) fallback = fallback.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return this.request(`/listings?cityId=${cityId}&search=${searchQuery}&category=${category}`, {}, fallback);
  }

  async getListingsBySeller(sellerId: string): Promise<Listing[]> {
    const fallback = this._listings.filter(l => l.sellerId === sellerId);
    return this.request(`/listings/seller/${sellerId}`, {}, fallback);
  }
  
  async createListing(l: Partial<Listing>): Promise<Listing> {
    const newListing = { id: `l-${Date.now()}`, ...l } as Listing;
    this._listings.push(newListing);
    return this.request('/listings', { method: 'POST', body: JSON.stringify(l) }, newListing);
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
    const listingIndex = this._listings.findIndex(l => l.id === id);
    if (listingIndex >= 0) {
      this._listings[listingIndex].status = status;
      return this.request(`/admin/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }, this._listings[listingIndex]);
    }
    return this.request(`/admin/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }, { id, status } as Listing);
  }

  // --- Banners ---
  async getActiveBanners(cityId: string): Promise<BannerAd[]> {
    const fallback = [
      { 
        id: 'b1', userId: 'u1', cityId, title: 'Summer Sale', imageUrl: 'https://picsum.photos/seed/ads1/1600/400', linkUrl: '#', 
        status: 'LIVE', createdAt: new Date().toISOString(), views: 1500, clicks: 120,
        budget: 5000, cpmRate: 200, targetImpressions: 25000
      }
    ] as BannerAd[];
    
    // In a real backend, this filtering happens on the server
    // Here we simulate: Filter by City, Status=LIVE, and Views < Target
    // Also, we should ideally increment views here or in the component. 
    // The component calls recordBannerView, so we just return eligible ads.
    
    return this.request(`/banners?cityId=${cityId}`, {}, fallback);
  }

  async getUserBanners(userId: string): Promise<BannerAd[]> {
    const banners = this._banners.filter(b => b.userId === userId);
    return this.request('/banners/my-ads', {}, banners);
  }

  async createBannerAd(ad: Partial<BannerAd>): Promise<BannerAd> {
    // 1. Get User Wallet
    const user = await this.getUserById(ad.userId!);
    if (!user) throw new Error("User not found");

    // 2. Check Balance
    if (user.walletBalance < (ad.budget || 0)) {
      throw new Error("Insufficient wallet balance. Please recharge.");
    }

    // 3. Deduct Budget
    await this.rechargeWallet(user.id, -(ad.budget || 0));

    // 4. Calculate Impressions
    const config = this.getSystemConfig();
    const cityTier = config.cityTierMapping[ad.cityId!] || 'T2';
    const cpm = config.bannerAdTierPrices[cityTier];
    const targetImpressions = Math.floor(((ad.budget || 0) / cpm) * 1000);

    // 5. Check for existing active campaigns
    const existingAds = await this.getUserBanners(user.id);
    const hasActive = existingAds.some(b => b.status === 'LIVE');
    
    const newAd: BannerAd = {
      id: `b-${Date.now()}`,
      userId: ad.userId!,
      cityId: ad.cityId!,
      title: ad.title!,
      imageUrl: ad.imageUrl!,
      linkUrl: ad.linkUrl!,
      status: 'PENDING', // Always pending initially for approval
      createdAt: new Date().toISOString(),
      views: 0,
      clicks: 0,
      budget: ad.budget || 0,
      cpmRate: cpm,
      targetImpressions
    };

    this._banners.push(newAd); // Persist to mock store

    return this.request('/banners', { method: 'POST', body: JSON.stringify(newAd) }, newAd);
  }

  async adminUpdateBannerStatus(id: string, status: BannerAd['status'], reason?: string, adminId?: string): Promise<BannerAd> {
    const bannerIndex = this._banners.findIndex(b => b.id === id);
    if (bannerIndex >= 0) {
      // Check refund logic
      if (status === 'REJECTED' && this._banners[bannerIndex].status === 'PENDING' && this._banners[bannerIndex].budget > 0) {
        await this.rechargeWallet(this._banners[bannerIndex].userId, this._banners[bannerIndex].budget);
      }
      
      this._banners[bannerIndex].status = status;
      if (reason) this._banners[bannerIndex].rejectionReason = reason;
      
      return this.request(`/admin/banners/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }, this._banners[bannerIndex]);
    }
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
    const pendingListings = this._listings.filter(l => l.status === ListingStatus.PENDING && (cityIds.length === 0 || cityIds.includes(l.cityId)));
    return this.request('/admin/moderation/listings', {}, pendingListings); 
  }
  async getModerationBanners(cityIds: string[]): Promise<BannerAd[]> { 
    // Filter banners that are PENDING and match managed cities (if any)
    const pendingBanners = this._banners.filter(b => b.status === 'PENDING' && (cityIds.length === 0 || cityIds.includes(b.cityId)));
    return this.request('/admin/moderation/banners', {}, pendingBanners); 
  }
  async getModerationReports(cityIds: string[]): Promise<AdReport[]> { 
    return this.request('/admin/moderation/reports', {}, this._reports.filter(r => r.status === 'PENDING')); 
  }
  async getModerationTickets(cityIds: string[]): Promise<SupportTicket[]> { 
    return this.request('/admin/moderation/tickets', {}, this._tickets.filter(t => t.status === 'OPEN')); 
  }
  
  async resolveAdReport(reportId: string, status: 'RESOLVED' | 'DISMISSED'): Promise<AdReport> {
    const report = this._reports.find(r => r.id === reportId);
    if (report) report.status = status;
    return this.request(`/admin/moderation/reports/${reportId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, { id: reportId, status } as AdReport);
  }
  async resolveTicket(ticketId: string): Promise<SupportTicket> {
    const ticket = this._tickets.find(t => t.id === ticketId);
    if (ticket) ticket.status = 'RESOLVED';
    return this.request(`/admin/moderation/tickets/${ticketId}/resolve`, { method: 'PATCH' }, { id: ticketId, status: 'RESOLVED' } as SupportTicket);
  }

  // --- Chats ---
  async getChatsForUser(userId: string): Promise<Chat[]> { 
    const userChats = this._chats.filter(c => c.participants.includes(userId));
    return this.request('/chats', {}, userChats); 
  }
  async getMessages(chatId: string): Promise<Message[]> { 
    return this.request(`/chats/${chatId}/messages`, {}, this._messages[chatId] || []); 
  }
  
  async sendMessage(chatId: string, senderId: string, text: string): Promise<Message> {
    const newMessage = { id: `m-${Date.now()}`, chatId, senderId, text, timestamp: new Date().toISOString(), read: false } as Message;
    if (!this._messages[chatId]) this._messages[chatId] = [];
    this._messages[chatId].push(newMessage);
    return this.request(`/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }, newMessage);
  }

  async getOrCreateChat(userId: string, sellerId: string, listing: Listing, sellerName: string): Promise<Chat> {
    let chat = this._chats.find(c => c.listingId === listing.id && c.participants.includes(userId) && c.participants.includes(sellerId));
    if (!chat) {
      chat = {
        id: `c-${Date.now()}`,
        participants: [userId, sellerId],
        listingId: listing.id,
        listingTitle: listing.title,
        listingImage: listing.images[0],
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        otherPartyName: sellerName
      } as Chat;
      this._chats.push(chat);
    }
    return this.request('/chats/init', { method: 'POST', body: JSON.stringify({ sellerId, listingId: listing.id }) }, chat);
  }

  // --- Reports & Ratings ---
  async createAdReport(report: Partial<AdReport>): Promise<AdReport> {
    const newReport = { id: 'r-new', ...report } as AdReport;
    this._reports.push(newReport);
    return this.request('/reports', { method: 'POST', body: JSON.stringify(report) }, newReport);
  }

  async submitRating(fromUser: User, toUserId: string, score: number, comment: string): Promise<Rating> {
    const newRating = { 
      id: `rt-${Date.now()}`, 
      fromUserId: fromUser.id,
      toUserId,
      score, 
      comment,
      fromUserName: fromUser.name,
      createdAt: new Date().toISOString()
    } as Rating;
    this._ratings.push(newRating);
    return this.request(`/users/${toUserId}/rate`, { method: 'POST', body: JSON.stringify({ score, comment }) }, newRating);
  }

  async getRatingsForUser(userId: string): Promise<Rating[]> {
    const ratings = this._ratings.filter(r => r.toUserId === userId);
    return this.request(`/users/${userId}/ratings`, {}, ratings);
  }

  async getSearchSuggestions(cityId: string, query: string): Promise<string[]> {
    return this.request(`/search/suggestions?cityId=${cityId}&q=${query}`, {}, []);
  }

  async createSupportTicket(ticket: Partial<SupportTicket>): Promise<SupportTicket> {
    const newTicket = { id: `t-${Date.now()}`, status: 'OPEN', createdAt: new Date().toISOString(), ...ticket } as SupportTicket;
    this._tickets.push(newTicket);
    return this.request('/tickets', { method: 'POST', body: JSON.stringify(ticket) }, newTicket);
  }

  async getAllTransactions(): Promise<WalletTransaction[]> { return this.request('/admin/transactions', {}, this._transactions); }
  async getSecurityLogs(): Promise<SecurityLog[]> { return this.request('/admin/logs', {}, []); }
  async getAllListings(): Promise<Listing[]> { return this.request('/admin/all-listings', {}, this._listings); }
  async getAllBanners(): Promise<BannerAd[]> { return this.request('/admin/all-banners', {}, this._banners); }
}

export const dbService = new DbService();
