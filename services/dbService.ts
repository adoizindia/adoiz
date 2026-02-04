
import { 
  User, Listing, Category, BannerAd, SupportTicket, 
  WalletTransaction, SystemConfig, City, State, Country,
  ListingStatus, UserRole, Chat, Message, BackupArchive, SecurityLog
} from '../types';
import { MOCK_USER, ADDITIONAL_MOCK_USERS, MOCK_LISTINGS, STATES, CITIES } from '../constants';

class DbService {
  private users: User[];
  private listings: Listing[];
  private categories: Category[];
  
  private countries: Country[] = [{ id: 'ctr1', name: 'India', code: 'IN', isActive: true, createdAt: '2023-01-01T00:00:00Z' }];
  private states: State[] = [...STATES.map(s => ({ ...s, isActive: true }))];
  private cities: City[] = [...CITIES.map(c => ({ ...c, isActive: true }))];

  private banners: BannerAd[] = [];
  private transactions: WalletTransaction[] = [];
  private tickets: SupportTicket[] = [];
  private chats: Chat[] = [];
  private messages: Message[] = [];
  private securityLogs: SecurityLog[] = [];
  
  private config: SystemConfig = {
    siteName: 'ADOIZ',
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
    cityTierMapping: {},
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
      footerText: '© 2024 ADOIZ Technologies',
      primaryColor: '#1a73e8',
      secondaryColor: '#fbbc05',
      supportEmail: 'support@adoiz.com',
      supportPhone: '+91 1234567890',
      address: 'Mumbai, India',
      social: { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' }
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
    seo: { enableSitemap: true, metaTitle: 'ADOIZ', metaDescription: '' }
  };

  constructor() {
    this.users = JSON.parse(localStorage.getItem('adoiz_users') || JSON.stringify([
      MOCK_USER, ...ADDITIONAL_MOCK_USERS,
      { id: 'admin-master', email: 'admin@adoiz.com', name: 'System Admin', role: UserRole.ADMIN, photo: 'https://picsum.photos/seed/admin/200', walletBalance: 9999, isVerified: true, isSuspended: false, isBanned: false },
      { id: 'mod-mumbai', email: 'mod@adoiz.com', name: 'Mumbai Moderator', role: UserRole.MODERATOR, photo: 'https://picsum.photos/seed/mod/200', walletBalance: 1000, managedCityIds: ['c1'], isVerified: true, isSuspended: false, isBanned: false }
    ]));
    this.listings = JSON.parse(localStorage.getItem('adoiz_listings') || JSON.stringify(MOCK_LISTINGS));
    this.config = JSON.parse(localStorage.getItem('adoiz_config') || JSON.stringify(this.config));
    this.securityLogs = JSON.parse(localStorage.getItem('adoiz_logs') || '[]');
    this.banners = JSON.parse(localStorage.getItem('adoiz_banners') || '[]');
    this.countries = JSON.parse(localStorage.getItem('adoiz_countries') || JSON.stringify(this.countries));
    this.states = JSON.parse(localStorage.getItem('adoiz_states') || JSON.stringify(this.states));
    this.cities = JSON.parse(localStorage.getItem('adoiz_cities') || JSON.stringify(this.cities));
    
    this.chats = JSON.parse(localStorage.getItem('adoiz_chats') || '[]');
    this.messages = JSON.parse(localStorage.getItem('adoiz_messages') || '[]');
    this.tickets = JSON.parse(localStorage.getItem('adoiz_tickets') || '[]');
    this.transactions = JSON.parse(localStorage.getItem('adoiz_txns') || '[]');

    const defaultCats = [
      { id: 'cat1', name: 'Electronics', icon: 'fa-laptop', isActive: true, createdAt: '2023-01-01T00:00:00Z' },
      { id: 'cat2', name: 'Properties', icon: 'fa-building', isActive: true, createdAt: '2023-01-01T00:00:00Z' },
      { id: 'cat3', name: 'Furniture', icon: 'fa-couch', isActive: true, createdAt: '2023-01-01T00:00:00Z' },
      { id: 'cat4', name: 'Cars', icon: 'fa-car', isActive: true, createdAt: '2023-01-01T00:00:00Z' }
    ];
    this.categories = JSON.parse(localStorage.getItem('adoiz_categories') || JSON.stringify(defaultCats));
  }

  private persist() {
    localStorage.setItem('adoiz_users', JSON.stringify(this.users));
    localStorage.setItem('adoiz_listings', JSON.stringify(this.listings));
    localStorage.setItem('adoiz_config', JSON.stringify(this.config));
    localStorage.setItem('adoiz_logs', JSON.stringify(this.securityLogs));
    localStorage.setItem('adoiz_banners', JSON.stringify(this.banners));
    localStorage.setItem('adoiz_countries', JSON.stringify(this.countries));
    localStorage.setItem('adoiz_states', JSON.stringify(this.states));
    localStorage.setItem('adoiz_cities', JSON.stringify(this.cities));
    localStorage.setItem('adoiz_categories', JSON.stringify(this.categories));
    localStorage.setItem('adoiz_chats', JSON.stringify(this.chats));
    localStorage.setItem('adoiz_messages', JSON.stringify(this.messages));
    localStorage.setItem('adoiz_tickets', JSON.stringify(this.tickets));
    localStorage.setItem('adoiz_txns', JSON.stringify(this.transactions));
  }

  getSystemConfig(): SystemConfig { return this.config; }
  updateSystemConfig(updates: Partial<SystemConfig>): void { 
    this.config = { ...this.config, ...updates }; 
    this.addSecurityLog('CONFIG_UPDATE', 'System configuration modified', 'MEDIUM');
    this.persist();
  }

  getSecurityLogs(): SecurityLog[] { return [...this.securityLogs]; }
  addSecurityLog(action: string, details: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', userId?: string): void {
    this.securityLogs.unshift({ id: 'sl' + Date.now(), timestamp: new Date().toISOString(), ip: '127.0.0.1', action, details, severity, userId });
    this.persist();
  }

  getBannerPrice(cityId: string): number {
    const tier = this.config.cityTierMapping[cityId];
    return tier ? this.config.bannerAdTierPrices[tier] : this.config.bannerAdPrice;
  }

  // --- Administrative User Profile ---
  async adminUpdateUser(userId: string, updates: Partial<User>, adminId: string): Promise<User> {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("User not found");
    
    const oldUser = this.users[idx];
    
    // Logic check: if banning, also suspend
    if (updates.isBanned) updates.isSuspended = true;

    // --- ATOMIC LISTING SYNCHRONIZATION LOGIC ---
    // Rule 1: On Suspension, deactivate all active listings
    if (updates.isSuspended === true && oldUser.isSuspended !== true) {
      this.listings = this.listings.map(l => 
        l.sellerId === userId && l.status === ListingStatus.APPROVED 
          ? { ...l, status: ListingStatus.DISABLED } 
          : l
      );
      this.addSecurityLog('USER_SUSPENDED', `Account and all active ads suspended for user ${userId}`, 'HIGH', adminId);
    } 
    // Rule 2: On Reactivation, restore previously approved (now disabled) listings
    else if (updates.isSuspended === false && oldUser.isSuspended === true) {
      this.listings = this.listings.map(l => 
        l.sellerId === userId && l.status === ListingStatus.DISABLED 
          ? { ...l, status: ListingStatus.APPROVED } 
          : l
      );
      this.addSecurityLog('USER_REACTIVATED', `Account and ads restored for user ${userId}`, 'MEDIUM', adminId);
    }

    this.users[idx] = { ...this.users[idx], ...updates };
    this.persist();
    return this.users[idx];
  }

  async adminAdjustWallet(userId: string, amount: number, type: 'CREDIT' | 'DEBIT', reason: string, adminId: string): Promise<User> {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("User not found");
    if (!reason.trim()) throw new Error("Reason is mandatory for adjustments");

    const user = this.users[idx];
    if (type === 'DEBIT' && user.walletBalance < amount) throw new Error("Insufficient funds for debit");

    user.walletBalance += (type === 'CREDIT' ? amount : -amount);
    
    const txn: WalletTransaction = {
      id: 'tx' + Date.now(),
      userId,
      amount,
      type,
      description: `ADMIN ADJ: ${reason}`,
      timestamp: new Date().toISOString()
    };
    
    this.transactions.push(txn);
    this.addSecurityLog('WALLET_ADMIN_ADJ', `${type} of ${amount} for ${userId}`, 'MEDIUM', adminId);
    this.persist();
    return { ...user };
  }

  async adminToggleListingStatus(listingId: string, status: ListingStatus, adminId: string): Promise<void> {
    const idx = this.listings.findIndex(l => l.id === listingId);
    if (idx !== -1) {
      this.listings[idx].status = status;
      this.addSecurityLog('AD_ADMIN_MOD', `Changed ad ${listingId} status to ${status}`, 'LOW', adminId);
      this.persist();
    }
  }

  // --- Geo ---
  getCountries(): Country[] { return [...this.countries]; }
  getStates(countryId?: string): State[] { return countryId ? this.states.filter(s => s.countryId === countryId) : [...this.states]; }
  getCities(stateId?: string): City[] { return stateId ? this.cities.filter(c => c.stateId === stateId) : [...this.cities]; }

  async addCountry(country: Partial<Country>): Promise<Country> {
    const newCountry = { id: 'ctr' + Date.now(), isActive: true, createdAt: new Date().toISOString(), ...country } as Country;
    this.countries.push(newCountry); this.persist(); return newCountry;
  }
  async updateCountry(id: string, updates: Partial<Country>): Promise<Country> {
    const idx = this.countries.findIndex(c => c.id === id);
    if (idx !== -1) { this.countries[idx] = { ...this.countries[idx], ...updates }; this.persist(); return this.countries[idx]; }
    throw new Error("Country not found");
  }
  async deleteCountry(id: string): Promise<void> {
    this.countries = this.countries.filter(c => c.id !== id);
    this.persist();
  }

  async addState(state: Partial<State>): Promise<State> {
    const newState = { id: 'st' + Date.now(), isActive: true, ...state } as State;
    this.states.push(newState); this.persist(); return newState;
  }
  async updateState(id: string, updates: Partial<State>): Promise<State> {
    const idx = this.states.findIndex(s => s.id === id);
    if (idx !== -1) { this.states[idx] = { ...this.states[idx], ...updates }; this.persist(); return this.states[idx]; }
    throw new Error("State not found");
  }
  async deleteState(id: string): Promise<void> {
    this.states = this.states.filter(s => s.id !== id);
    this.persist();
  }

  async addCity(city: Partial<City>): Promise<City> {
    const newCity = { id: 'c' + Date.now(), isActive: true, ...city } as City;
    this.cities.push(newCity); this.persist(); return newCity;
  }
  async updateCity(id: string, updates: Partial<City>): Promise<City> {
    const idx = this.cities.findIndex(c => c.id === id);
    if (idx !== -1) { this.cities[idx] = { ...this.cities[idx], ...updates }; this.persist(); return this.cities[idx]; }
    throw new Error("City not found");
  }
  async deleteCity(id: string): Promise<void> {
    this.cities = this.cities.filter(c => c.id !== id);
    this.persist();
  }

  // --- Listings ---
  async getListingsByCity(cityId: string, query?: string, category?: string): Promise<Listing[]> {
    return this.listings.filter(l => 
      l.cityId === cityId && l.status === ListingStatus.APPROVED &&
      (!query || l.title.toLowerCase().includes(query.toLowerCase())) &&
      (!category || category === 'All' || l.category === category)
    );
  }
  async getListingsBySeller(sellerId: string): Promise<Listing[]> { return this.listings.filter(l => l.sellerId === sellerId); }
  async getAllListings(): Promise<Listing[]> { return [...this.listings]; }

  async createListing(data: Partial<Listing>): Promise<Listing> {
    const newListing = { id: 'l' + Date.now(), status: ListingStatus.PENDING, views: 0, createdAt: new Date().toISOString(), ...data } as Listing;
    this.listings.push(newListing);
    this.persist();
    return newListing;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const idx = this.listings.findIndex(l => l.id === id);
    if (idx === -1) throw new Error("Listing not found");
    this.listings[idx] = { ...this.listings[idx], ...updates };
    this.persist();
    return this.listings[idx];
  }

  async deleteListing(id: string): Promise<void> {
    this.listings = this.listings.filter(l => l.id !== id);
    this.persist();
  }

  async upgradeListingToPremium(id: string, userId: string): Promise<void> {
    const idx = this.listings.findIndex(l => l.id === id);
    if (idx === -1) throw new Error("Listing not found");
    
    await this.adminAdjustWallet(userId, this.config.premiumPrice, 'DEBIT', `Premium Upgrade: ${this.listings[idx].title}`, 'SYSTEM');
    
    this.listings[idx] = { 
      ...this.listings[idx], 
      isPremium: true, 
      status: ListingStatus.APPROVED,
      premiumFrom: new Date().toISOString(),
      premiumUntil: new Date(Date.now() + 86400000 * this.config.premiumDurationDays).toISOString()
    };
    this.persist();
  }

  async updateListingStatus(id: string, status: ListingStatus, reason?: string, adminId?: string): Promise<void> {
    const idx = this.listings.findIndex(x => x.id === id);
    if (idx !== -1) {
      this.listings[idx] = { ...this.listings[idx], status, rejectionReason: reason };
      if (adminId) this.addSecurityLog('AD_MOD', `Status -> ${status}`, 'LOW', adminId);
      this.persist();
    }
  }

  async recordView(id: string): Promise<void> {
    const idx = this.listings.findIndex(x => x.id === id);
    if (idx !== -1) { this.listings[idx].views++; this.persist(); }
  }

  // --- Users & Wallet ---
  async getAllUsers(): Promise<User[]> { return [...this.users]; }
  async getUserById(id: string): Promise<User | null> { return this.users.find(u => u.id === id) || null; }
  async registerUser(data: Partial<User>): Promise<User> {
    const newUser = { id: 'u' + Date.now(), walletBalance: 0, role: UserRole.USER, isVerified: false, isSuspended: false, isBanned: false, ...data } as User;
    this.users.push(newUser); this.persist(); return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates };
    this.persist();
    return this.users[idx];
  }

  async rechargeWallet(userId: string, amount: number): Promise<User | null> {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    const user = this.users[idx];
    user.walletBalance += amount;
    this.transactions.push({ id: 'tx' + Date.now(), userId, amount, type: 'CREDIT', description: 'User Recharge', timestamp: new Date().toISOString() });
    this.persist();
    return user;
  }

  async getTransactionsByUserId(userId: string): Promise<WalletTransaction[]> { return this.transactions.filter(t => t.userId === userId); }
  async getAllTransactions(): Promise<WalletTransaction[]> { return [...this.transactions]; }
  
  async activateBlueTick(userId: string): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user || user.walletBalance < this.config.blueTickPrice) throw new Error("Funds required");
    await this.adminAdjustWallet(userId, this.config.blueTickPrice, 'DEBIT', 'Blue Tick Activation', 'SYSTEM');
    return this.updateUser(userId, { isVerified: true, blueTickUntil: new Date(Date.now() + 86400000 * this.config.blueTickDurationDays).toISOString() });
  }

  // --- Moderation & Support ---
  async getModerationQueue(cityId?: string): Promise<Listing[]> {
    return this.listings.filter(l => l.status === ListingStatus.PENDING || l.status === ListingStatus.EDIT_PENDING);
  }

  async createTicket(userId: string, userName: string, subject: string, message: string): Promise<SupportTicket> {
    const ticket: SupportTicket = { id: 't' + Date.now(), userId, userName, subject, message, status: 'OPEN', createdAt: new Date().toISOString() };
    this.tickets.unshift(ticket);
    this.persist();
    return ticket;
  }
  async getUserTickets(userId: string): Promise<SupportTicket[]> { return this.tickets.filter(t => t.userId === userId); }
  async getAllTickets(): Promise<SupportTicket[]> { return [...this.tickets]; }

  // --- Chats ---
  async getChatsForUser(userId: string): Promise<Chat[]> { return this.chats.filter(c => c.participants.includes(userId)); }
  async getOrCreateChat(u1: string, u2: string, listing: Listing, sellerName: string): Promise<Chat> {
    let found = this.chats.find(c => c.listingId === listing.id && c.participants.includes(u1) && c.participants.includes(u2));
    if (!found) {
      found = { id: 'ch' + Date.now(), participants: [u1, u2], listingId: listing.id, listingTitle: listing.title, otherPartyName: sellerName, unreadCount: 0 };
      this.chats.push(found);
      this.persist();
    }
    return found;
  }
  async getMessages(chatId: string): Promise<Message[]> { return this.messages.filter(m => m.chatId === chatId); }
  async sendMessage(chatId: string, senderId: string, text: string): Promise<Message> {
    const msg: Message = { id: 'm' + Date.now(), chatId, senderId, text, timestamp: new Date().toISOString(), isRead: false };
    this.messages.push(msg);
    const cIdx = this.chats.findIndex(c => c.id === chatId);
    if (cIdx !== -1) {
      this.chats[cIdx].lastMessage = text;
      this.chats[cIdx].lastTimestamp = msg.timestamp;
    }
    this.persist();
    return msg;
  }

  // --- Search Suggestions ---
  async getSearchSuggestions(cityId: string, query: string): Promise<string[]> {
    const cityListings = this.listings.filter(l => l.cityId === cityId && l.status === ListingStatus.APPROVED);
    const suggestions = new Set<string>();
    const q = query.toLowerCase();
    cityListings.forEach(l => {
      if (l.title.toLowerCase().includes(q)) suggestions.add(l.title);
      if (l.category.toLowerCase().includes(q)) suggestions.add(l.category);
    });
    return Array.from(suggestions).slice(0, 5);
  }

  async getCategories(): Promise<Category[]> { return [...this.categories]; }
  
  async addCategory(cat: Partial<Category>): Promise<Category> {
    const newCat = { id: 'cat' + Date.now(), isActive: true, createdAt: new Date().toISOString(), ...cat } as Category;
    this.categories.push(newCat); this.persist(); return newCat;
  }
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx !== -1) { this.categories[idx] = { ...this.categories[idx], ...updates }; this.persist(); return this.categories[idx]; }
    throw new Error("Category not found");
  }
  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter(c => c.id !== id);
    this.persist();
  }

  async getActiveBanners(cityId: string): Promise<BannerAd[]> { 
    return this.banners.filter(b => b.cityId === cityId && b.status === 'LIVE' && new Date(b.expiresAt) > new Date()); 
  }
  async getAllBanners(): Promise<BannerAd[]> { return [...this.banners]; }
  async getUserBanners(userId: string): Promise<BannerAd[]> { return this.banners.filter(b => b.userId === userId); }

  async processBannerSponsorship(userId: string, cityId: string, imageUrl: string, linkUrl: string, title?: string): Promise<BannerAd> {
    // Check for existing active or pending banner
    const existing = this.banners.find(b => b.userId === userId && (b.status === 'LIVE' || b.status === 'PENDING'));
    if (existing) throw new Error("A user can only have one active or pending banner sponsorship at a time.");

    const price = this.getBannerPrice(cityId);
    const newBanner: BannerAd = {
      id: 'b' + Date.now(), userId, cityId, title, imageUrl, linkUrl,
      status: 'PENDING', // Start as PENDING for moderation
      expiresAt: new Date(Date.now() + 86400000 * this.config.bannerAdDurationDays).toISOString(),
      createdAt: new Date().toISOString(),
      views: 0, clicks: 0
    };
    await this.adminAdjustWallet(userId, price, 'DEBIT', `Purchased City Sponsorship: ${cityId}`, 'SYSTEM');
    this.banners.unshift(newBanner);
    this.persist();
    return newBanner;
  }

  async adminUpdateBannerStatus(id: string, status: BannerAd['status'], reason?: string, adminId?: string): Promise<void> {
    const idx = this.banners.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.banners[idx].status = status;
      this.banners[idx].rejectionReason = reason;
      if (adminId) this.addSecurityLog('BANNER_MOD', `Banner ${id} Status -> ${status}`, 'LOW', adminId);
      this.persist();
    }
  }

  async activateExistingBanner(id: string, userId: string): Promise<void> {
    const idx = this.banners.findIndex(b => b.id === id);
    if (idx === -1) throw new Error("Banner not found");
    const banner = this.banners[idx];
    const price = this.getBannerPrice(banner.cityId);
    await this.adminAdjustWallet(userId, price, 'DEBIT', `Sponsorship Activation: ${banner.title || banner.id}`, 'SYSTEM');
    this.banners[idx] = { 
      ...banner, 
      status: 'LIVE', 
      expiresAt: new Date(Date.now() + 86400000 * this.config.bannerAdDurationDays).toISOString() 
    };
    this.persist();
  }
}

export const dbService = new DbService();
