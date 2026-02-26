
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
  private _users: User[] = [
    MOCK_USER, 
    ...ADDITIONAL_MOCK_USERS,
    { ...MOCK_USER, id: 'admin-master', role: UserRole.ADMIN, name: 'System Admin', email: 'admin@adoiz.com', walletBalance: 50000 },
    { ...MOCK_USER, id: 'mod-mumbai', role: UserRole.MODERATOR, name: 'Mumbai Moderator', email: 'mod@adoiz.com', managedCityIds: ['c1'], walletBalance: 50000 },
    { ...MOCK_USER, id: 'mod-pune', role: UserRole.MODERATOR, name: 'Pune Moderator', email: 'mod-pune@adoiz.com', managedCityIds: ['c2'], walletBalance: 50000 },
    { ...MOCK_USER, id: 'mod-delhi', role: UserRole.MODERATOR, name: 'Delhi Moderator', email: 'mod-delhi@adoiz.com', managedCityIds: ['c4'], walletBalance: 50000 }
  ];
  private _listings: Listing[] = [...MOCK_LISTINGS];
  private _banners: BannerAd[] = [
    {
      id: 'b-mock-1',
      userId: 'u2',
      cityId: 'c1',
      title: 'Summer Sale 50% Off',
      imageUrl: 'https://picsum.photos/seed/banner1/1600/400',
      linkUrl: 'https://example.com/sale',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      views: 0,
      clicks: 0,
      budget: 5000,
      cpmRate: 500,
      targetImpressions: 10000
    },
    {
      id: 'b-mock-2',
      userId: 'u5',
      cityId: 'c2',
      title: 'New Car Launch',
      imageUrl: 'https://picsum.photos/seed/banner2/1600/400',
      linkUrl: 'https://example.com/cars',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      views: 0,
      clicks: 0,
      budget: 10000,
      cpmRate: 300,
      targetImpressions: 33000
    }
  ];
  private _chats: Chat[] = [];
  private _messages: Record<string, Message[]> = {};
  private _reports: AdReport[] = [
    {
      id: 'r-mock-1',
      listingId: 'l1',
      listingTitle: 'iPhone 15 Pro - 256GB Space Black',
      reporterId: 'u3',
      reporterName: 'Anjali Sharma',
      cityId: 'c1',
      reason: 'FRAUD',
      details: 'Seller is asking for advance payment before meeting.',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    },
    {
      id: 'r-mock-2',
      listingId: 'l6',
      listingTitle: 'Maruti Suzuki Swift VXI 2019',
      reporterId: 'u1',
      reporterName: 'John Doe',
      cityId: 'c2',
      reason: 'MISLEADING',
      details: 'Price listed is incorrect, asking for more on call.',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
  ];
  private _transactions: WalletTransaction[] = [];
  private _ratings: Rating[] = [];
  private _tickets: SupportTicket[] = [
    {
      id: 't-mock-1',
      userId: 'u2',
      userName: 'Rajesh Malhotra',
      cityId: 'c1',
      subject: 'Payment Issue',
      message: 'I recharged my wallet but balance is not updated.',
      status: 'OPEN',
      createdAt: new Date().toISOString()
    },
    {
      id: 't-mock-2',
      userId: 'u6',
      userName: 'Suresh Patil',
      cityId: 'c2',
      subject: 'Account Verification',
      message: 'How do I get the blue tick verification?',
      status: 'OPEN',
      createdAt: new Date().toISOString()
    }
  ];

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
    const defaultConfig = this.getDefaultConfig();
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Deep merge critical nested objects to prevent crashes on new fields
        return {
          ...defaultConfig,
          ...parsed,
          referral: { ...defaultConfig.referral, ...(parsed.referral || {}) },
          paymentGateway: { ...defaultConfig.paymentGateway, ...(parsed.paymentGateway || {}) },
          branding: { ...defaultConfig.branding, ...(parsed.branding || {}) },
          socialLogin: { ...defaultConfig.socialLogin, ...(parsed.socialLogin || {}) },
          otpConfig: { ...defaultConfig.otpConfig, ...(parsed.otpConfig || {}) },
          bannerAdTierPrices: { ...defaultConfig.bannerAdTierPrices, ...(parsed.bannerAdTierPrices || {}) },
          featureToggles: { ...defaultConfig.featureToggles, ...(parsed.featureToggles || {}) },
        };
      } catch (e) {
        console.error("Failed to parse saved config, resetting to default", e);
        return defaultConfig;
      }
    }
    return defaultConfig;
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
      paymentGateway: { razorpay: { active: true, keyId: '', keySecret: '' }, upiId: 'adoiz@upi' },
      referral: { enabled: false, welcomeBonus: 100, referrerBonus: 50 }
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

  async registerUser(u: Partial<User> & { referralCode?: string }): Promise<User> {
    const config = this.getSystemConfig();
    const newUserId = `u-${Date.now()}`;
    
    // Generate a unique referral code for the new user
    const myReferralCode = (u.name?.substring(0, 3).toUpperCase() || 'USR') + Math.floor(1000 + Math.random() * 9000);

    let walletBalance = u.walletBalance || 0;
    let referredBy = undefined;

    // Handle Referral Logic
    if (config.referral.enabled && u.referralCode) {
      const referrer = this._users.find(user => user.referralCode === u.referralCode || user.id === u.referralCode); // Allow ID as code fallback
      if (referrer) {
        referredBy = referrer.id;
        
        // 1. Bonus for New User
        walletBalance += config.referral.welcomeBonus;
        this._transactions.push({
          id: `txn-ref-welcome-${Date.now()}`,
          userId: newUserId,
          amount: config.referral.welcomeBonus,
          type: 'CREDIT',
          description: `Welcome Bonus (Referred by ${referrer.name})`,
          timestamp: new Date().toISOString()
        });

        // 2. Bonus for Referrer
        referrer.walletBalance += config.referral.referrerBonus;
        this._transactions.push({
          id: `txn-ref-bonus-${Date.now()}`,
          userId: referrer.id,
          amount: config.referral.referrerBonus,
          type: 'CREDIT',
          description: `Referral Bonus (User: ${u.name})`,
          timestamp: new Date().toISOString()
        });
        
        // Update referrer in mock store (in real app, this would be a DB update)
        // We don't need to explicitly save 'referrer' here because we modified the object reference in _users array directly if it exists there.
        // However, if _users is just a cache, we should ensure persistence. In this mock, _users IS the persistence.
      }
    }

    const newUser = { 
      ...MOCK_USER, 
      ...u, 
      id: newUserId,
      walletBalance,
      referralCode: myReferralCode,
      referredBy
    } as User;
    
    this._users.push(newUser);
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify({ ...u, referralCode: undefined }) }, newUser);
  }

  async adminUpdateUser(id: string, data: Partial<User>, adminId: string): Promise<User | null> {
    const userIndex = this._users.findIndex(u => u.id === id);
    if (userIndex >= 0) {
      // Apply updates
      this._users[userIndex] = { ...this._users[userIndex], ...data };
      
      // Handle Suspension Logic
      if (data.isSuspended === true) {
        // 1. Disable all APPROVED listings
        this._listings.forEach(l => {
          if (l.sellerId === id && l.status === ListingStatus.APPROVED) {
            l.status = ListingStatus.DISABLED;
          }
        });

        // 2. Pause all LIVE banners
        this._banners.forEach(b => {
          if (b.userId === id && b.status === 'LIVE') {
            b.status = 'PAUSED';
          }
        });

      } else if (data.isSuspended === false) {
        // Handle Activation Logic
        
        // 1. Re-activate DISABLED listings (that were previously approved)
        // Note: In a real DB we might store 'previousStatus', here we assume DISABLED meant APPROVED before suspension
        this._listings.forEach(l => {
          if (l.sellerId === id && l.status === ListingStatus.DISABLED) {
            l.status = ListingStatus.APPROVED;
          }
        });

        // 2. Resume PAUSED banners
        this._banners.forEach(b => {
          if (b.userId === id && b.status === 'PAUSED') {
            b.status = 'LIVE';
          }
        });
      }

      return this.request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, this._users[userIndex]);
    }
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
    const userIndex = this._users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");

    const config = this.getSystemConfig();
    const plan = config.subscriptionPlans.find(p => p.id === planId);
    if (!plan) throw new Error("Invalid plan");

    const user = this._users[userIndex];
    if (user.walletBalance < plan.price) {
      throw new Error("Insufficient wallet balance. Please recharge.");
    }

    // Deduct Balance
    user.walletBalance -= plan.price;

    // Update Subscription
    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    
    user.subscription = {
      planId: plan.id,
      planName: plan.name,
      activatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'ACTIVE'
    };

    // Record Transaction
    this._transactions.push({
      id: `txn-${Date.now()}`,
      userId,
      amount: plan.price,
      type: 'DEBIT',
      description: `Subscription: ${plan.name}`,
      timestamp: now.toISOString()
    });

    return this.request('/subscriptions/activate', { method: 'POST', body: JSON.stringify({ planId }) }, user);
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
  async getListingsByCity(cityId: string, searchQuery: string = '', category: string = 'All', productType: string = 'All'): Promise<Listing[]> {
    // Filter out sellers who are on vacation
    const vacationUserIds = this._users.filter(u => u.isVacationMode).map(u => u.id);
    
    let fallback = this._listings.filter(l => 
      l.cityId === cityId && 
      l.status === ListingStatus.APPROVED &&
      !vacationUserIds.includes(l.sellerId)
    );
    
    if (category !== 'All') fallback = fallback.filter(l => l.category === category);
    if (productType !== 'All') fallback = fallback.filter(l => l.productType === productType);
    if (searchQuery) fallback = fallback.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return this.request(`/listings?cityId=${cityId}&search=${searchQuery}&category=${category}&productType=${productType}`, {}, fallback);
  }

  async getListingsBySeller(sellerId: string): Promise<Listing[]> {
    const fallback = this._listings.filter(l => l.sellerId === sellerId);
    return this.request(`/listings/seller/${sellerId}`, {}, fallback);
  }
  
  async createListing(l: Partial<Listing>): Promise<Listing> {
    const config = this.getSystemConfig();
    const user = await this.getUserById(l.sellerId!);
    
    if (!user) throw new Error("User not found");

    // Check if user has active subscription
    const isSubscribed = user.subscription?.status === 'ACTIVE' && new Date(user.subscription.expiresAt) > new Date();
    
    // Count existing listings for free limit check
    const userListingsCount = this._listings.filter(listing => listing.sellerId === l.sellerId).length;
    
    let price = 0;

    // If not subscribed and exceeded free limit, charge standard price
    if (!isSubscribed && userListingsCount >= config.freeAdLimit) {
      price = config.standardAdPrice;
    }

    if (price > 0) {
       if (user.walletBalance < price) {
        throw new Error(`Insufficient wallet balance. Standard ad listing costs ₹${price}.`);
       }
       
       const userIndex = this._users.findIndex(u => u.id === user.id);
       if (userIndex >= 0) {
         this._users[userIndex].walletBalance -= price;
         
         this._transactions.push({
            id: `txn-${Date.now()}`,
            userId: user.id,
            amount: price,
            type: 'DEBIT',
            description: `Standard Ad Listing: ${l.title}`,
            timestamp: new Date().toISOString()
         });
       }
    }

    const newListing = { 
      id: `l-${Date.now()}`, 
      status: ListingStatus.PENDING,
      createdAt: new Date().toISOString(),
      views: 0,
      ...l 
    } as Listing;
    this._listings.push(newListing);
    return this.request('/listings', { method: 'POST', body: JSON.stringify(l) }, newListing);
  }

  async updateListing(id: string, data: Partial<Listing>): Promise<Listing> {
    const index = this._listings.findIndex(l => l.id === id);
    if (index !== -1) {
      this._listings[index] = { ...this._listings[index], ...data };
      return this.request(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, this._listings[index]);
    }
    return this.request(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, { id, ...data } as Listing);
  }

  async deleteListing(id: string): Promise<void> { 
    return this.request(`/listings/${id}`, { method: 'DELETE' }, undefined);
  }

  async recordView(id: string): Promise<void> { 
    return this.request(`/listings/${id}/view`, { method: 'POST' }, undefined);
  }

  async upgradeListingToPremium(listingId: string, userId: string): Promise<void> {
    const userIndex = this._users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");

    const listingIndex = this._listings.findIndex(l => l.id === listingId);
    if (listingIndex === -1) throw new Error("Listing not found");

    const config = this.getSystemConfig();
    const price = config.premiumPrice; // Default premium boost price

    const user = this._users[userIndex];
    if (user.walletBalance < price) {
      throw new Error("Insufficient wallet balance. Please recharge.");
    }

    // Deduct Balance
    user.walletBalance -= price;

    // Update Listing
    this._listings[listingIndex].isPremium = true;
    this._listings[listingIndex].premiumFrom = new Date().toISOString();
    
    // Record Transaction
    this._transactions.push({
      id: `txn-${Date.now()}`,
      userId,
      amount: price,
      type: 'DEBIT',
      description: `Premium Boost: ${this._listings[listingIndex].title}`,
      timestamp: new Date().toISOString()
    });

    return this.request(`/listings/${listingId}/boost`, { method: 'POST' }, undefined);
  }

  async updateListingStatus(id: string, status: ListingStatus, reason?: string, adminId?: string): Promise<Listing> {
    const listingIndex = this._listings.findIndex(l => l.id === id);
    if (listingIndex >= 0) {
      this._listings[listingIndex].status = status;
      if (reason) this._listings[listingIndex].rejectionReason = reason;
      if (adminId) {
        this._listings[listingIndex].moderatorId = adminId;
        const admin = this._users.find(u => u.id === adminId);
        if (admin) this._listings[listingIndex].moderatorName = admin.name;
      }
      return this.request(`/admin/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason, adminId }) }, this._listings[listingIndex]);
    }
    return this.request(`/admin/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason, adminId }) }, { id, status, rejectionReason: reason, moderatorId: adminId } as Listing);
  }

  // --- Banners ---
  async getActiveBanners(cityId: string): Promise<BannerAd[]> {
    const activeBanners = this._banners.filter(b => 
      b.cityId === cityId && 
      b.status === 'LIVE' && 
      b.views < (b.targetImpressions || Infinity)
    );
    
    // If no active banners in memory, fallback to mock if empty (though _banners starts empty, we might want to keep the mock one for demo)
    if (activeBanners.length === 0 && this._banners.length === 0) {
       return this.request(`/banners?cityId=${cityId}`, {}, [
        { 
          id: 'b1', userId: 'u1', cityId, title: 'Summer Sale', imageUrl: 'https://picsum.photos/seed/ads1/1600/400', linkUrl: '#', 
          status: 'LIVE', createdAt: new Date().toISOString(), views: 1500, clicks: 120,
          budget: 5000, cpmRate: 200, targetImpressions: 25000
        }
       ] as BannerAd[]);
    }

    return this.request(`/banners?cityId=${cityId}`, {}, activeBanners);
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
    const userIndex = this._users.findIndex(u => u.id === user.id);
    if (userIndex >= 0) {
      this._users[userIndex].walletBalance -= (ad.budget || 0);
      
      this._transactions.push({
        id: `txn-${Date.now()}`,
        userId: user.id,
        amount: ad.budget || 0,
        type: 'DEBIT',
        description: `Banner Ad Payment: ${ad.title}`,
        timestamp: new Date().toISOString()
      });
    }

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
      if (adminId) {
        this._banners[bannerIndex].moderatorId = adminId;
        const admin = this._users.find(u => u.id === adminId);
        if (admin) this._banners[bannerIndex].moderatorName = admin.name;
      }
      
      return this.request(`/admin/banners/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason, adminId }) }, this._banners[bannerIndex]);
    }
    return this.request(`/admin/banners/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason, adminId }) }, { id, status, rejectionReason: reason, moderatorId: adminId } as BannerAd);
  }

  async recordBannerView(id: string): Promise<void> {
    const banner = this._banners.find(b => b.id === id);
    if (banner) {
      banner.views += 1;
      // Auto-complete if target reached
      if (banner.targetImpressions && banner.views >= banner.targetImpressions) {
        banner.status = 'COMPLETED';
      }
    }
    return this.request(`/banners/${id}/view`, { method: 'POST' }, undefined);
  }

  async recordBannerClick(id: string): Promise<void> {
    const banner = this._banners.find(b => b.id === id);
    if (banner) {
      banner.clicks += 1;
    }
    return this.request(`/banners/${id}/click`, { method: 'POST' }, undefined);
  }

  // --- Moderation Queue ---
  async getModerationQueue(cityIds: string[]): Promise<Listing[]> { 
    const pendingListings = this._listings.filter(l => (l.status === ListingStatus.PENDING || l.status === ListingStatus.EDIT_PENDING) && (cityIds.length === 0 || cityIds.includes(l.cityId)));
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
  async getAllReports(): Promise<AdReport[]> {
    return this.request('/admin/reports', {}, this._reports);
  }
  async getModerationTickets(cityIds: string[]): Promise<SupportTicket[]> { 
    return this.request('/admin/moderation/tickets', {}, this._tickets.filter(t => t.status === 'OPEN')); 
  }
  async getAllTickets(): Promise<SupportTicket[]> {
    return this.request('/admin/tickets', {}, this._tickets);
  }
  
  async resolveAdReport(reportId: string, status: 'RESOLVED' | 'DISMISSED', moderatorId?: string): Promise<AdReport> {
    const report = this._reports.find(r => r.id === reportId);
    if (report) {
      report.status = status;
      if (moderatorId) {
        report.moderatorId = moderatorId;
        const mod = this._users.find(u => u.id === moderatorId);
        if (mod) report.moderatorName = mod.name;
      }
    }
    return this.request(`/admin/moderation/reports/${reportId}/status`, { method: 'PATCH', body: JSON.stringify({ status, moderatorId }) }, { id: reportId, status, moderatorId } as AdReport);
  }
  async resolveTicket(ticketId: string, moderatorId?: string): Promise<SupportTicket> {
    const ticket = this._tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = 'RESOLVED';
      if (moderatorId) {
        ticket.moderatorId = moderatorId;
        const mod = this._users.find(u => u.id === moderatorId);
        if (mod) ticket.moderatorName = mod.name;
      }
    }
    return this.request(`/admin/moderation/tickets/${ticketId}/resolve`, { method: 'PATCH', body: JSON.stringify({ moderatorId }) }, { id: ticketId, status: 'RESOLVED', moderatorId } as SupportTicket);
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
    const newReport = { 
      id: `r-${Date.now()}`, 
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      ...report 
    } as AdReport;
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
