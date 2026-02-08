
// Fix: Completed truncated file and exported dbService instance to satisfy imports in other components.
// Also fixed missing 'secret' property in paymentGateway.paypal and shorthand 'clientId' error.
import { 
  User, Listing, Category, BannerAd, SupportTicket, AdReport,
  WalletTransaction, SystemConfig, City, State, Country,
  ListingStatus, UserRole, Chat, Message, BackupArchive, SecurityLog,
  Rating
} from '../types';
import { MOCK_USER, ADDITIONAL_MOCK_USERS, MOCK_LISTINGS, STATES, CITIES } from '../constants';

class DbService {
  private users: User[] = [
    { ...MOCK_USER, averageRating: 4.5, ratingCount: 12 }, 
    ...ADDITIONAL_MOCK_USERS.map(u => ({ ...u, averageRating: 4.0, ratingCount: 5 })),
    // Add an admin and moderator for testing
    {
      id: 'admin-master',
      email: 'admin@adoiz.com',
      name: 'System Administrator',
      role: UserRole.ADMIN,
      walletBalance: 99999,
      photo: 'https://picsum.photos/seed/admin/200'
    },
    {
      id: 'mod-mumbai',
      email: 'mod@adoiz.com',
      name: 'Mumbai Moderator',
      role: UserRole.MODERATOR,
      cityId: 'c1',
      managedCityIds: ['c1'],
      walletBalance: 5000,
      photo: 'https://picsum.photos/seed/mod1/200'
    }
  ];
  private listings: Listing[] = [...MOCK_LISTINGS];
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
  private tickets: SupportTicket[] = [];
  private reports: AdReport[] = [];
  private chats: Chat[] = [];
  private messages: Message[] = [];
  private securityLogs: SecurityLog[] = [];
  private ratings: Rating[] = [];
  
  private config: SystemConfig = {
    siteName: 'adoiz',
    logoUrl: '',
    faviconUrl: '',
    maintenanceMode: false,
    premiumPrice: 500,
    premiumDurationDays: 30,
    standardAdPrice: 100,
    freeAdLimit: 3,
    blueTickPrice: 2000,
    blueTickDurationDays: 365,
    blueTickEnabled: true,
    bannerAdPrice: 1000,
    bannerAdDurationDays: 7,
    bannerAdTierPrices: { T1: 2000, T2: 1000, T3: 500 },
    googleAdsenseCode: '',
    cityTierMapping: {
      'c1': 'T1',
      'c2': 'T2',
      'c3': 'T1',
      'c4': 'T1'
    },
    cityFeatureOverrides: {},
    featureToggles: {
      ads: true,
      banners: true,
      wallet: true,
      verification: true,
      guestBrowsing: true,
      cityLock: true
    },
    adminUrl: '/admin',
    adminUsername: 'admin',
    adminAuth: {
      twoFactorEnabled: false,
      sessionTimeoutMinutes: 30,
      allowConcurrentSessions: true,
      restrictAdminIp: false,
      allowedAdminIps: [],
      passwordExpiryDays: 90
    },
    branding: {
      siteTagline: 'Enterprise Local Marketplace',
      footerText: '© 2024 adoiz Technologies',
      primaryColor: '#1a73e8',
      secondaryColor: '#fbbc05',
      supportEmail: 'support@adoiz.com',
      supportPhone: '+91 1234567890',
      address: 'Mumbai, India',
      appName: 'adoiz',
      splashLogo: '',
      statusColor: '#1a73e8',
      pwaIcon: '',
      social: { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' },
      resourceLinks: [
        { label: 'About Platform', url: '#', content: 'adoiz is a leading city-locked classifieds marketplace designed for local trade with high security.' },
        { label: 'Safety Center', url: '#', content: 'Always meet in public places. Do not share financial info. Report suspicious activity.' },
        { label: 'Terms of Service', url: '#', content: 'By using adoiz, you agree to our terms. Users are responsible for their own listings.' },
        { label: 'Privacy Policy', url: '#', content: 'We value your privacy. Your data is secured and used only to improve your experience.' }
      ]
    },
    socialLogin: {
      googleClientId: '',
      facebookAppId: ''
    },
    paymentGateway: {
      razorpay: { active: true, keyId: '', keySecret: '' },
      paypal: { active: false, clientId: '', secret: '' },
      stripe: { active: false, publishableKey: '', secretKey: '' },
      paytm: { active: false, merchantId: '', merchantKey: '', website: '' },
      phonepe: { active: false, merchantId: '', saltKey: '', saltIndex: '' },
      upiId: 'adoiz@upi'
    },
    smsGateway: {
      selected: 'twilio',
      twilio: { active: false, sid: '', authToken: '', fromNumber: '' },
      msg91: { active: false, authKey: '', senderId: '' },
      textlocal: { active: false, apiKey: '', sender: '' }
    },
    emailGateway: {
      selected: 'sendgrid',
      sendgrid: { active: false, apiKey: '', fromEmail: '' },
      mailgun: { active: false, apiKey: '', domain: '', fromEmail: '' },
      ses: { active: false, accessKey: '', secretKey: '', region: '', fromEmail: '' }
    },
    analytics: { googleAnalyticsId: '', enabled: false },
    seo: { enableSitemap: true, metaTitle: 'adoiz Marketplace', metaDescription: 'Local Trading Platform' }
  };

  // System Config
  getSystemConfig(): SystemConfig { return this.config; }
  updateSystemConfig(newConfig: Partial<SystemConfig>): void { this.config = { ...this.config, ...newConfig }; }

  // Location methods
  getCountries(): Country[] { return this.countries; }
  getStates(countryId?: string): State[] { 
    return countryId ? this.states.filter(s => s.countryId === countryId) : this.states; 
  }
  getCities(stateId?: string): City[] { 
    return stateId ? this.cities.filter(c => c.stateId === stateId) : this.cities; 
  }
  async addCountry(c: Partial<Country>): Promise<Country> {
    const nc: Country = { id: `ctr${Date.now()}`, name: '', code: '', isActive: true, createdAt: new Date().toISOString(), ...c } as Country;
    this.countries.push(nc);
    return nc;
  }
  async addState(s: Partial<State>): Promise<State> {
    const ns: State = { id: `st${Date.now()}`, name: '', countryId: '', isActive: true, ...s } as State;
    this.states.push(ns);
    return ns;
  }
  async addCity(c: Partial<City>): Promise<City> {
    const nc: City = { id: `c${Date.now()}`, name: '', stateId: '', isActive: true, ...c } as City;
    this.cities.push(nc);
    return nc;
  }
  async updateCity(id: string, data: Partial<City>): Promise<void> {
    const idx = this.cities.findIndex(c => c.id === id);
    if (idx !== -1) this.cities[idx] = { ...this.cities[idx], ...data };
  }

  // Categories
  async getCategories(): Promise<Category[]> { return this.categories; }
  async addCategory(cat: Partial<Category>): Promise<void> {
    const nc = { id: `cat${Date.now()}`, name: '', icon: '', ...cat } as Category;
    this.categories.push(nc);
  }
  async updateCategory(id: string, data: Partial<Category>): Promise<void> {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx !== -1) this.categories[idx] = { ...this.categories[idx], ...data };
  }
  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter(c => c.id !== id);
  }

  // Users
  async getAllUsers(): Promise<User[]> { return this.users; }
  async getUserById(id: string): Promise<User | null> { return this.users.find(u => u.id === id) || null; }
  async registerUser(u: Partial<User>): Promise<User> {
    const newUser: User = {
      id: `u${Date.now()}`,
      email: '',
      name: '',
      role: UserRole.USER,
      walletBalance: 0,
      photo: 'https://picsum.photos/seed/newuser/200',
      averageRating: 0,
      ratingCount: 0,
      ...u
    } as User;
    this.users.push(newUser);
    return newUser;
  }
  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...data };
    return this.users[idx];
  }
  async adminUpdateUser(id: string, data: Partial<User>, adminId: string): Promise<User | null> {
    return this.updateUser(id, data);
  }

  // User Ratings
  async submitRating(fromUser: User, toUserId: string, score: number, comment: string): Promise<void> {
    const rating: Rating = {
      id: `r${Date.now()}`,
      fromUserId: fromUser.id,
      fromUserName: fromUser.name,
      toUserId,
      score,
      comment,
      timestamp: new Date().toISOString()
    };
    this.ratings.push(rating);
    this.recalculateUserRating(toUserId);
  }

  private recalculateUserRating(userId: string) {
    const userRatings = this.ratings.filter(r => r.toUserId === userId);
    const count = userRatings.length;
    if (count === 0) return;
    const sum = userRatings.reduce((acc, r) => acc + r.score, 0);
    const avg = sum / count;
    
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.averageRating = parseFloat(avg.toFixed(1));
      user.ratingCount = count;
    }
  }

  async getRatingsForUser(userId: string): Promise<Rating[]> {
    return this.ratings.filter(r => r.toUserId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async adminDeleteRating(ratingId: string, adminId: string): Promise<void> {
    const rating = this.ratings.find(r => r.id === ratingId);
    if (rating) {
      const userId = rating.toUserId;
      this.ratings = this.ratings.filter(r => r.id !== ratingId);
      this.recalculateUserRating(userId);
    }
  }

  async adminUpdateRating(ratingId: string, data: Partial<Rating>, adminId: string): Promise<void> {
    const idx = this.ratings.findIndex(r => r.id === ratingId);
    if (idx !== -1) {
      this.ratings[idx] = { ...this.ratings[idx], ...data };
      this.recalculateUserRating(this.ratings[idx].toUserId);
    }
  }

  // Wallet
  async activateBlueTick(userId: string): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;
    if (user.walletBalance < this.config.blueTickPrice) throw new Error("Insufficient funds");
    user.walletBalance -= this.config.blueTickPrice;
    user.isVerified = true;
    user.blueTickUntil = new Date(Date.now() + 86400000 * this.config.blueTickDurationDays).toISOString();
    this.transactions.push({
      id: `tx${Date.now()}`,
      userId,
      amount: this.config.blueTickPrice,
      type: 'DEBIT',
      description: 'Blue Tick Verification Activation',
      timestamp: new Date().toISOString()
    });
    return user;
  }
  async rechargeWallet(userId: string, amount: number): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;
    user.walletBalance += amount;
    this.transactions.push({
      id: `tx${Date.now()}`,
      userId,
      amount,
      type: 'CREDIT',
      description: 'Wallet Recharge',
      timestamp: new Date().toISOString()
    });
    return user;
  }
  async adminAdjustWallet(userId: string, amount: number, type: 'CREDIT' | 'DEBIT', reason: string, adminId: string): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    if (type === 'CREDIT') user.walletBalance += amount;
    else user.walletBalance -= amount;
    this.transactions.push({
      id: `tx${Date.now()}`,
      userId,
      amount,
      type,
      description: `Admin Adjustment: ${reason}`,
      timestamp: new Date().toISOString()
    });
    return user;
  }

  // Listings
  async getAllListings(): Promise<Listing[]> { return this.listings; }
  async getListingsByCity(cityId: string, searchQuery: string = '', category: string = 'All'): Promise<Listing[]> {
    let filtered = this.listings.filter(l => l.cityId === cityId);
    filtered = filtered.filter(l => l.status === ListingStatus.APPROVED);
    if (searchQuery) {
      filtered = filtered.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.description.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (category !== 'All') {
      filtered = filtered.filter(l => l.category === category);
    }
    return filtered;
  }
  async getListingsBySeller(sellerId: string): Promise<Listing[]> {
    return this.listings.filter(l => l.sellerId === sellerId);
  }
  async createListing(l: Partial<Listing>): Promise<Listing> {
    const user = this.users.find(u => u.id === l.sellerId);
    if (!user) throw new Error("Seller not found");
    
    const sellerListings = this.listings.filter(listing => listing.sellerId === l.sellerId);
    const isPaid = sellerListings.length >= this.config.freeAdLimit;
    const totalCost = (isPaid ? this.config.standardAdPrice : 0) + (l.isPremium ? this.config.premiumPrice : 0);
    
    if (user.walletBalance < totalCost) throw new Error(`Insufficient funds. Required: ₹${totalCost}`);
    
    user.walletBalance -= totalCost;
    if (totalCost > 0) {
      this.transactions.push({
        id: `tx${Date.now()}`,
        userId: user.id,
        amount: totalCost,
        type: 'DEBIT',
        description: `Ad Posting Fees ${l.isPremium ? '(incl. Premium)' : ''}`,
        timestamp: new Date().toISOString()
      });
    }

    const newListing: Listing = {
      id: `l${Date.now()}`,
      sellerId: '',
      cityId: '',
      title: '',
      description: '',
      price: 0,
      category: '',
      images: [],
      status: ListingStatus.PENDING,
      isPremium: false,
      createdAt: new Date().toISOString(),
      views: 0,
      ...l
    } as Listing;
    this.listings.push(newListing);
    return newListing;
  }
  async updateListing(id: string, data: Partial<Listing>): Promise<Listing> {
    const idx = this.listings.findIndex(l => l.id === id);
    if (idx === -1) throw new Error("Listing not found");
    this.listings[idx] = { ...this.listings[idx], ...data };
    return this.listings[idx];
  }
  async deleteListing(id: string): Promise<void> {
    this.listings = this.listings.filter(l => l.id !== id);
  }
  async recordView(id: string): Promise<void> {
    const l = this.listings.find(item => item.id === id);
    if (l) l.views++;
  }
  async upgradeListingToPremium(listingId: string, userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    const listing = this.listings.find(l => l.id === listingId);
    if (!user || !listing) throw new Error("Not found");
    if (user.walletBalance < this.config.premiumPrice) throw new Error("Insufficient funds");
    user.walletBalance -= this.config.premiumPrice;
    listing.isPremium = true;
    listing.premiumFrom = new Date().toISOString();
    listing.premiumUntil = new Date(Date.now() + 86400000 * this.config.premiumDurationDays).toISOString();
    this.transactions.push({
      id: `tx${Date.now()}`,
      userId,
      amount: this.config.premiumPrice,
      type: 'DEBIT',
      description: `Premium Boost for Ad: ${listing.title}`,
      timestamp: new Date().toISOString()
    });
  }
  async updateListingStatus(id: string, status: ListingStatus, reason?: string, moderatorId?: string): Promise<void> {
    const l = this.listings.find(item => item.id === id);
    if (l) {
      l.status = status;
      if (reason) l.rejectionReason = reason;
      if (status === ListingStatus.APPROVED) l.publishedAt = new Date().toISOString();
    }
  }

  // Search
  async getSearchSuggestions(cityId: string, query: string): Promise<string[]> {
    const relevant = this.listings.filter(l => l.cityId === cityId && l.status === ListingStatus.APPROVED);
    const matches = relevant.filter(l => l.title.toLowerCase().includes(query.toLowerCase())).map(l => l.title);
    return Array.from(new Set(matches)).slice(0, 5);
  }

  // Banners
  async getAllBanners(): Promise<BannerAd[]> { return this.banners; }
  async getActiveBanners(cityId: string): Promise<BannerAd[]> {
    return this.banners.filter(b => b.cityId === cityId && b.status === 'LIVE' && new Date(b.expiresAt) > new Date());
  }
  async getUserBanners(userId: string): Promise<BannerAd[]> {
    return this.banners.filter(b => b.userId === userId);
  }
  getBannerPrice(cityId: string): number {
    const tier = this.config.cityTierMapping[cityId] || 'T2';
    return this.config.bannerAdTierPrices[tier] || this.config.bannerAdPrice;
  }
  async processBannerSponsorship(userId: string, cityId: string, imageUrl: string, linkUrl: string, title: string): Promise<void> {
    const user = await this.getUserById(userId);
    const price = this.getBannerPrice(cityId);
    if (!user) throw new Error("User not found");
    if (user.walletBalance < price) throw new Error("Insufficient funds");
    
    user.walletBalance -= price;
    this.banners.push({
      id: `b${Date.now()}`,
      userId,
      cityId,
      title,
      imageUrl,
      linkUrl,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000 * this.config.bannerAdDurationDays).toISOString(),
      views: 0,
      clicks: 0
    });
    this.transactions.push({
      id: `tx${Date.now()}`,
      userId,
      amount: price,
      type: 'DEBIT',
      description: `City Banner Sponsorship: ${title}`,
      timestamp: new Date().toISOString()
    });
  }
  async updateBanner(id: string, data: Partial<BannerAd>): Promise<void> {
    const idx = this.banners.findIndex(b => b.id === id);
    if (idx !== -1) this.banners[idx] = { ...this.banners[idx], ...data };
  }
  async adminUpdateBannerStatus(id: string, status: BannerAd['status'], reason?: string, adminId?: string): Promise<void> {
    const b = this.banners.find(item => item.id === id);
    if (b) {
      b.status = status;
      if (reason) b.rejectionReason = reason;
    }
  }

  // Support & Reports
  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    return this.tickets.filter(t => t.userId === userId);
  }
  async createTicket(userId: string, userName: string, subject: string, message: string): Promise<void> {
    this.tickets.push({
      id: `t${Date.now()}`,
      userId,
      userName,
      subject,
      message,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    });
  }
  async resolveTicket(id: string): Promise<void> {
    const t = this.tickets.find(item => item.id === id);
    if (t) t.status = 'RESOLVED';
  }
  async createAdReport(data: Partial<AdReport>): Promise<void> {
    this.reports.push({
      id: `r${Date.now()}`,
      listingId: '',
      listingTitle: '',
      reporterId: '',
      reporterName: '',
      cityId: '',
      reason: 'OTHER',
      details: '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      ...data as AdReport
    });
  }
  async resolveAdReport(id: string, status: 'RESOLVED' | 'DISMISSED'): Promise<void> {
    const r = this.reports.find(item => item.id === id);
    if (r) r.status = status;
  }

  // Chats
  async getChatsForUser(userId: string): Promise<Chat[]> {
    return this.chats.filter(c => c.participants.includes(userId));
  }
  async getOrCreateChat(userId: string, sellerId: string, listing: Listing, sellerName: string): Promise<Chat> {
    let chat = this.chats.find(c => c.listingId === listing.id && c.participants.includes(userId) && c.participants.includes(sellerId));
    if (!chat) {
      chat = {
        id: `chat${Date.now()}`,
        participants: [userId, sellerId],
        listingId: listing.id,
        unreadCount: 0,
        otherPartyName: sellerName,
        listingTitle: listing.title
      };
      this.chats.push(chat);
    }
    return chat;
  }
  async getMessages(chatId: string): Promise<Message[]> {
    return this.messages.filter(m => m.chatId === chatId);
  }
  async sendMessage(chatId: string, senderId: string, text: string): Promise<Message> {
    const msg: Message = {
      id: `msg${Date.now()}`,
      chatId,
      senderId,
      text,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    this.messages.push(msg);
    const chat = this.chats.find(c => c.id === chatId);
    if (chat) {
      chat.lastMessage = text;
      chat.lastTimestamp = msg.timestamp;
    }
    return msg;
  }

  // Moderation Queues
  async getModerationQueue(cityIds: string[]): Promise<Listing[]> {
    return this.listings.filter(l => (cityIds.length === 0 || cityIds.includes(l.cityId)) && (l.status === ListingStatus.PENDING || l.status === ListingStatus.EDIT_PENDING));
  }
  async getModerationBanners(cityIds: string[]): Promise<BannerAd[]> {
    return this.banners.filter(b => (cityIds.length === 0 || cityIds.includes(b.cityId)) && b.status === 'PENDING');
  }
  async getModerationTickets(cityIds: string[]): Promise<SupportTicket[]> {
    return this.tickets.filter(t => t.status === 'OPEN');
  }
  async getModerationReports(cityIds: string[]): Promise<AdReport[]> {
    return this.reports.filter(r => (cityIds.length === 0 || cityIds.includes(r.cityId)) && r.status === 'PENDING');
  }

  // Wallet
  async getTransactionsByUserId(userId: string): Promise<WalletTransaction[]> {
    return this.transactions.filter(tx => tx.userId === userId);
  }

  // Security Logs
  async getSecurityLogs(): Promise<SecurityLog[]> { return this.securityLogs; }
}

export const dbService = new DbService();
