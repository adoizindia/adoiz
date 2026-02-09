import { 
  User, Listing, Category, BannerAd, 
  WalletTransaction, SystemConfig, City, State, Country,
  ListingStatus, UserRole, Chat, Message, SecurityLog,
  Rating, SubscriptionPlan, UserSubscription, AdReport, SupportTicket
} from '../types';
import { MOCK_USER, ADDITIONAL_MOCK_USERS, MOCK_LISTINGS, STATES, CITIES } from '../constants';

class DbService {
  private users: User[] = [];
  private listings: Listing[] = [];
  private categories: Category[] = [
    { id: 'cat1', name: 'Electronics', icon: 'fa-laptop' },
    { id: 'cat2', name: 'Cars', icon: 'fa-car' },
    { id: 'cat3', name: 'Properties', icon: 'fa-building' },
    { id: 'cat4', name: 'Furniture', icon: 'fa-couch' },
    { id: 'cat5', name: 'Jobs', icon: 'fa-briefcase' }
  ];
  
  private countries: Country[] = [{ id: 'ctr1', name: 'India', code: 'IN', isActive: true, createdAt: '2023-01-01T00:00:00Z' }];
  private states: State[] = [...STATES.map(s => ({ ...s, isActive: true }))];
  private cities: City[] = [...CITIES.map(c => ({ ...c, isActive: true }))];

  private banners: BannerAd[] = [];
  private transactions: WalletTransaction[] = [];
  private chats: Chat[] = [];
  private messages: Message[] = [];
  private securityLogs: SecurityLog[] = [];
  private reports: AdReport[] = [];
  private tickets: SupportTicket[] = [];
  private ratings: Rating[] = [];
  
  private config: SystemConfig = {
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
    cityTierMapping: { 'c1': 'T1', 'c2': 'T2', 'c3': 'T1', 'c4': 'T1' },
    subscriptionPlans: [
      { id: 'plan_basic', name: 'Basic Trader', price: 199, durationDays: 30, features: ['Unlimited Standard Ads', 'Basic Support', 'Valid for 1 Month'] },
      { id: 'plan_pro', name: 'Pro Merchant', price: 499, durationDays: 30, features: ['Unlimited Standard Ads', '2 Premium Boosts', 'Priority Support'], isPopular: true },
      { id: 'plan_enterprise', name: 'Enterprise Elite', price: 4999, durationDays: 365, features: ['Unlimited Everything', '10 Premium Boosts', 'City-wide Badge'] }
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

  constructor() {
    this.loadFromStorage();
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  private loadFromStorage() {
    const storageKeys = {
      users: 'adoiz_users',
      listings: 'adoiz_listings',
      config: 'adoiz_config',
      txns: 'adoiz_transactions',
      banners: 'adoiz_banners',
      reports: 'adoiz_reports',
      ratings: 'adoiz_ratings',
      chats: 'adoiz_chats',
      msgs: 'adoiz_messages'
    };

    const savedUsers = localStorage.getItem(storageKeys.users);
    if (savedUsers) {
      this.users = JSON.parse(savedUsers);
    } else {
      this.users = [
        { ...MOCK_USER, averageRating: 4.5, ratingCount: 12 }, 
        ...ADDITIONAL_MOCK_USERS.map(u => ({ ...u, averageRating: 4.0, ratingCount: 5 })),
        { id: 'admin-master', email: 'admin@adoiz.com', name: 'System Administrator', role: UserRole.ADMIN, walletBalance: 99999, photo: 'https://picsum.photos/seed/admin/200' },
        { id: 'mod-mumbai', email: 'mod@adoiz.com', name: 'Mumbai Moderator', role: UserRole.MODERATOR, managedCityIds: ['c1'], walletBalance: 5000, photo: 'https://picsum.photos/seed/mod/200', averageRating: 5.0, ratingCount: 1 }
      ];
      this.saveToStorage('users');
    }

    const savedListings = localStorage.getItem(storageKeys.listings);
    if (savedListings) {
      this.listings = JSON.parse(savedListings);
    } else {
      this.listings = [...MOCK_LISTINGS];
      this.saveToStorage('listings');
    }

    const savedConfig = localStorage.getItem(storageKeys.config);
    if (savedConfig) this.config = JSON.parse(savedConfig);

    const savedTxns = localStorage.getItem(storageKeys.txns);
    if (savedTxns) this.transactions = JSON.parse(savedTxns);

    const savedBanners = localStorage.getItem(storageKeys.banners);
    if (savedBanners) this.banners = JSON.parse(savedBanners);

    const savedReports = localStorage.getItem(storageKeys.reports);
    if (savedReports) this.reports = JSON.parse(savedReports);

    const savedRatings = localStorage.getItem(storageKeys.ratings);
    if (savedRatings) this.ratings = JSON.parse(savedRatings);

    const savedChats = localStorage.getItem(storageKeys.chats);
    if (savedChats) this.chats = JSON.parse(savedChats);

    const savedMsgs = localStorage.getItem(storageKeys.msgs);
    if (savedMsgs) this.messages = JSON.parse(savedMsgs);
  }

  private saveToStorage(key: string) {
    const dataMap: any = {
      users: { k: 'adoiz_users', d: this.users },
      listings: { k: 'adoiz_listings', d: this.listings },
      config: { k: 'adoiz_config', d: this.config },
      txns: { k: 'adoiz_transactions', d: this.transactions },
      banners: { k: 'adoiz_banners', d: this.banners },
      reports: { k: 'adoiz_reports', d: this.reports },
      ratings: { k: 'adoiz_ratings', d: this.ratings },
      chats: { k: 'adoiz_chats', d: this.chats },
      msgs: { k: 'adoiz_messages', d: this.messages }
    };
    if (dataMap[key]) {
      localStorage.setItem(dataMap[key].k, JSON.stringify(dataMap[key].d));
    }
  }

  getSystemConfig(): SystemConfig { return this.config; }
  updateSystemConfig(newConfig: Partial<SystemConfig>): void { 
    this.config = { ...this.config, ...newConfig }; 
    this.saveToStorage('config');
  }

  // Location
  getCountries(): Country[] { return this.countries; }
  getStates(countryId?: string): State[] { return countryId ? this.states.filter(s => s.countryId === countryId) : this.states; }
  getCities(stateId?: string): City[] { return stateId ? this.cities.filter(c => c.stateId === stateId) : this.cities; }
  async addCity(c: Partial<City>): Promise<City> {
    const nc: City = { id: this.generateId('c'), name: '', stateId: '', isActive: true, ...c } as City;
    this.cities.push(nc);
    return nc;
  }

  // Categories
  async getCategories(): Promise<Category[]> { return this.categories; }

  // Users
  async getAllUsers(): Promise<User[]> { return this.users; }
  async getUserById(id: string): Promise<User | null> { return this.users.find(u => u.id === id) || null; }
  async registerUser(u: Partial<User>): Promise<User> {
    const userToPush: User = { 
      id: this.generateId('u'), 
      email: '', 
      name: '', 
      role: UserRole.USER, 
      walletBalance: 0, 
      photo: 'https://picsum.photos/seed/newuser/200',
      ...u
    } as User;
    this.users.push(userToPush);
    this.saveToStorage('users');
    return userToPush;
  }

  async adminUpdateUser(id: string, data: Partial<User>, adminId: string): Promise<User | null> {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return null;

    if (data.isSuspended !== undefined && data.isSuspended !== this.users[idx].isSuspended) {
      if (data.isSuspended === true) {
        this.listings.forEach(l => {
          if (l.sellerId === id && l.status === ListingStatus.APPROVED) {
            l.status = ListingStatus.DISABLED;
          }
        });
      } else {
        this.listings.forEach(l => {
          if (l.sellerId === id && l.status === ListingStatus.DISABLED) {
            l.status = ListingStatus.APPROVED;
          }
        });
      }
      this.saveToStorage('listings');
    }

    this.users[idx] = { ...this.users[idx], ...data };
    this.saveToStorage('users');
    return this.users[idx];
  }

  // Wallet & Subscription
  async rechargeWallet(userId: string, amount: number): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;
    user.walletBalance += amount;
    this.transactions.push({ id: this.generateId('tx'), userId, amount, type: 'CREDIT', description: 'Wallet Recharge', timestamp: new Date().toISOString() });
    this.saveToStorage('users');
    this.saveToStorage('txns');
    return user;
  }

  async subscribeUser(userId: string, planId: string): Promise<User | null> {
    const user = await this.getUserById(userId);
    const plan = this.config.subscriptionPlans.find(p => p.id === planId);
    if (!user || !plan) throw new Error("User or Plan not found");
    if (user.walletBalance < plan.price) throw new Error("Insufficient wallet balance");

    user.walletBalance -= plan.price;
    user.subscription = {
      planId: plan.id,
      planName: plan.name,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * plan.durationDays).toISOString(),
      status: 'ACTIVE'
    };

    this.listings.forEach(l => {
      if (l.sellerId === userId && l.status === ListingStatus.DISABLED && !l.isPremium) {
        l.status = ListingStatus.APPROVED;
      }
    });

    this.transactions.push({ id: this.generateId('tx'), userId, amount: plan.price, type: 'DEBIT', description: `Subscription Activation: ${plan.name}`, timestamp: new Date().toISOString() });
    this.saveToStorage('users');
    this.saveToStorage('listings');
    this.saveToStorage('txns');
    return user;
  }

  async adminAdjustWallet(userId: string, amount: number, type: 'CREDIT' | 'DEBIT', reason: string, adminId: string): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    if (type === 'CREDIT') user.walletBalance += amount; else user.walletBalance -= amount;
    this.transactions.push({ id: this.generateId('tx'), userId, amount, type, description: `Admin: ${reason}`, timestamp: new Date().toISOString() });
    this.saveToStorage('users');
    this.saveToStorage('txns');
    return user;
  }

  async getTransactionsByUserId(userId: string): Promise<WalletTransaction[]> {
    return this.transactions.filter(t => t.userId === userId);
  }

  // Listings
  async getAllListings(): Promise<Listing[]> { return this.listings; }
  async getListingsByCity(cityId: string, searchQuery: string = '', category: string = 'All'): Promise<Listing[]> {
    let filtered = this.listings.filter(l => l.cityId === cityId && l.status === ListingStatus.APPROVED);
    if (searchQuery) filtered = filtered.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (category !== 'All') filtered = filtered.filter(l => l.category === category);
    return filtered;
  }
  async getListingsBySeller(sellerId: string): Promise<Listing[]> { return this.listings.filter(l => l.sellerId === sellerId); }
  
  async createListing(l: Partial<Listing>): Promise<Listing> {
    const user = this.users.find(u => u.id === l.sellerId);
    if (!user) throw new Error("Seller not found");
    
    const isPremium = !!l.isPremium;
    const isSubscribed = user.subscription && user.subscription.status === 'ACTIVE' && new Date(user.subscription.expiresAt) > new Date();
    
    if (!isPremium && !isSubscribed) {
      const standardAds = this.listings.filter(item => item.sellerId === user.id && !item.isPremium);
      if (standardAds.length >= this.config.freeAdLimit) {
        throw new Error("Free limit exceeded. Please subscribe to a plan to post more standard ads.");
      }
    }

    if (isPremium) {
      if (user.walletBalance < this.config.premiumPrice) throw new Error(`Insufficient funds for Premium Ad. Required: ₹${this.config.premiumPrice}`);
      user.walletBalance -= this.config.premiumPrice;
      this.transactions.push({ id: this.generateId('tx'), userId: user.id, amount: this.config.premiumPrice, type: 'DEBIT', description: 'Premium Ad Posting', timestamp: new Date().toISOString() });
      this.saveToStorage('txns');
    }

    const newListing: Listing = { 
      id: this.generateId('l'), 
      sellerId: '', 
      cityId: '', 
      title: '', 
      description: '', 
      price: 0, 
      category: '', 
      images: [], 
      status: ListingStatus.APPROVED, 
      isPremium: false, 
      createdAt: new Date().toISOString(), 
      views: 0, 
      ...l 
    } as Listing;
    this.listings.push(newListing);
    this.saveToStorage('listings');
    this.saveToStorage('users');
    return newListing;
  }

  async updateListing(id: string, data: Partial<Listing>): Promise<Listing> {
    const idx = this.listings.findIndex(l => l.id === id);
    if (idx === -1) throw new Error("Listing not found");
    this.listings[idx] = { ...this.listings[idx], ...data };
    this.saveToStorage('listings');
    return this.listings[idx];
  }

  async markAsSold(id: string): Promise<void> {
    const l = this.listings.find(item => item.id === id);
    if (l) {
      l.status = ListingStatus.DISABLED; 
      this.saveToStorage('listings');
    }
  }

  async deleteListing(id: string): Promise<void> { 
    this.listings = this.listings.filter(l => l.id !== id); 
    this.saveToStorage('listings');
  }
  async recordView(id: string): Promise<void> { 
    const l = this.listings.find(item => item.id === id); 
    if (l) {
      l.views++; 
      this.saveToStorage('listings');
    }
  }
  async upgradeListingToPremium(listingId: string, userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    const listing = this.listings.find(l => l.id === listingId);
    if (!user || !listing) throw new Error("Not found");
    if (user.walletBalance < this.config.premiumPrice) throw new Error("Insufficient funds");
    user.walletBalance -= this.config.premiumPrice;
    listing.isPremium = true;
    listing.premiumUntil = new Date(Date.now() + 86400000 * this.config.premiumDurationDays).toISOString();
    this.transactions.push({ id: this.generateId('tx'), userId, amount: this.config.premiumPrice, type: 'DEBIT', description: `Premium Boost: ${listing.title}`, timestamp: new Date().toISOString() });
    this.saveToStorage('listings');
    this.saveToStorage('users');
    this.saveToStorage('txns');
  }

  async updateListingStatus(id: string, status: ListingStatus, reason?: string, adminId?: string): Promise<Listing> {
    const listing = this.listings.find(l => l.id === id);
    if (!listing) throw new Error("Listing not found");
    listing.status = status;
    if (reason) listing.rejectionReason = reason;
    this.saveToStorage('listings');
    return listing;
  }

  // Banners
  async getActiveBanners(cityId: string): Promise<BannerAd[]> {
    return this.banners.filter(b => b.cityId === cityId && b.status === 'LIVE');
  }

  async getAllBanners(): Promise<BannerAd[]> {
    return this.banners;
  }

  async getUserBanners(userId: string): Promise<BannerAd[]> {
    return this.banners.filter(b => b.userId === userId);
  }

  async createBannerAd(ad: Partial<BannerAd>): Promise<BannerAd> {
    const user = this.users.find(u => u.id === ad.userId);
    if (!user) throw new Error("User not found");

    const tier = this.config.cityTierMapping[ad.cityId!] || 'T2';
    const price = this.config.bannerAdTierPrices[tier];

    if (user.walletBalance < price) {
      throw new Error(`Insufficient funds for this city. Required: ₹${price}`);
    }

    user.walletBalance -= price;
    this.transactions.push({ id: this.generateId('tx'), userId: user.id, amount: price, type: 'DEBIT', description: `Banner Ad Posting: ${ad.title}`, timestamp: new Date().toISOString() });

    const newBanner: BannerAd = { id: this.generateId('b'), status: 'PENDING', createdAt: new Date().toISOString(), ...ad } as BannerAd;
    this.banners.push(newBanner);
    this.saveToStorage('banners');
    this.saveToStorage('users');
    this.saveToStorage('txns');
    return newBanner;
  }

  async adminUpdateBannerStatus(id: string, status: BannerAd['status'], reason?: string, adminId?: string): Promise<BannerAd> {
    const banner = this.banners.find(b => b.id === id);
    if (!banner) throw new Error("Banner not found");
    banner.status = status;
    if (reason) banner.rejectionReason = reason;
    this.saveToStorage('banners');
    return banner;
  }

  // Moderation
  async getModerationQueue(cityIds: string[]): Promise<Listing[]> {
    return this.listings.filter(l => (cityIds.length === 0 || cityIds.includes(l.cityId)) && (l.status === ListingStatus.PENDING || l.status === ListingStatus.EDIT_PENDING));
  }
  async getModerationBanners(cityIds: string[]): Promise<BannerAd[]> {
    return this.banners.filter(b => (cityIds.length === 0 || cityIds.includes(b.cityId)) && b.status === 'PENDING');
  }
  async getModerationTickets(cityIds: string[]): Promise<SupportTicket[]> {
    return this.tickets.filter(t => (cityIds.length === 0 || cityIds.includes(t.cityId)) && t.status === 'OPEN');
  }
  async getModerationReports(cityIds: string[]): Promise<AdReport[]> {
    return this.reports.filter(r => (cityIds.length === 0 || cityIds.includes(r.cityId)) && r.status === 'PENDING');
  }

  // Chats
  async getChatsForUser(userId: string): Promise<Chat[]> { return this.chats.filter(c => c.participants.includes(userId)); }
  async getMessages(chatId: string): Promise<Message[]> { return this.messages.filter(m => m.chatId === chatId); }
  
  async sendMessage(chatId: string, senderId: string, text: string): Promise<Message> {
    const timestamp = new Date().toISOString();
    const msg: Message = { id: this.generateId('msg'), chatId, senderId, text, timestamp, isRead: false };
    this.messages.push(msg);
    
    // Update Chat Metadata for real-time visibility in Inboxes
    const chat = this.chats.find(c => c.id === chatId);
    if (chat) {
      chat.lastMessage = text;
      chat.lastTimestamp = timestamp;
      // Increment unread count for everyone except the sender
      chat.unreadCount = (chat.unreadCount || 0) + 1;
      this.saveToStorage('chats');
    }
    
    this.saveToStorage('msgs');
    return msg;
  }

  async getOrCreateChat(userId: string, sellerId: string, listing: Listing, sellerName: string): Promise<Chat> {
    let chat = this.chats.find(c => c.participants.includes(userId) && c.participants.includes(sellerId) && c.listingId === listing.id);
    if (!chat) {
      chat = { id: this.generateId('chat'), participants: [userId, sellerId], listingId: listing.id, listingTitle: listing.title, otherPartyName: sellerName, unreadCount: 0 };
      this.chats.push(chat);
      this.saveToStorage('chats');
    }
    return chat;
  }

  // Reports & Tickets & Ratings
  async createAdReport(report: Partial<AdReport>): Promise<AdReport> {
    const nr: AdReport = { id: this.generateId('rep'), listingId: '', listingTitle: '', reporterId: '', reporterName: '', cityId: '', reason: 'OTHER', details: '', status: 'PENDING', createdAt: new Date().toISOString(), ...report } as AdReport;
    this.reports.push(nr);
    this.saveToStorage('reports');
    return nr;
  }

  async resolveAdReport(reportId: string, status: 'RESOLVED' | 'DISMISSED'): Promise<void> {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      report.status = status;
      this.saveToStorage('reports');
    }
  }

  async resolveTicket(id: string): Promise<void> {
    const ticket = this.tickets.find(t => t.id === id);
    if (ticket) {
      ticket.status = 'RESOLVED';
      this.saveToStorage('tickets');
    }
  }

  async getRatingsForUser(userId: string): Promise<Rating[]> {
    return this.ratings.filter(r => r.toUserId === userId);
  }

  async submitRating(fromUser: User, toUserId: string, score: number, comment: string): Promise<Rating> {
    const nr: Rating = { id: this.generateId('rat'), fromUserId: fromUser.id, fromUserName: fromUser.name, toUserId: toUserId, score, comment, timestamp: new Date().toISOString() };
    this.ratings.push(nr);
    
    const seller = this.users.find(u => u.id === toUserId);
    if (seller) {
      const userRatings = this.ratings.filter(r => r.toUserId === toUserId);
      seller.ratingCount = userRatings.length;
      seller.averageRating = userRatings.reduce((acc, r) => acc + r.score, 0) / userRatings.length;
      this.saveToStorage('users');
    }
    this.saveToStorage('ratings');
    return nr;
  }

  async getSearchSuggestions(cityId: string, query: string): Promise<string[]> {
    const q = query.toLowerCase();
    const suggestions = this.listings
      .filter(l => l.cityId === cityId && l.status === ListingStatus.APPROVED && l.title.toLowerCase().includes(q))
      .map(l => l.title)
      .slice(0, 5);
    return [...new Set(suggestions)];
  }

  async getAllTransactions(): Promise<WalletTransaction[]> { return this.transactions; }
  async getSecurityLogs(): Promise<SecurityLog[]> { return this.securityLogs; }
}

export const dbService = new DbService();