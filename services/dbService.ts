
import { 
  User, Listing, Category, BannerAd, SupportTicket, 
  WalletTransaction, SystemConfig, City, State, Country,
  ListingStatus, UserRole, Chat, Message, BackupArchive, SecurityLog
} from '../types';
import { MOCK_USER, ADDITIONAL_MOCK_USERS, MOCK_LISTINGS, STATES, CITIES } from '../constants';

class DbService {
  private users: User[] = [
    MOCK_USER,
    ...ADDITIONAL_MOCK_USERS,
    {
      id: 'admin-master',
      email: 'admin@adoiz.com',
      name: 'System Admin',
      role: UserRole.ADMIN,
      photo: 'https://picsum.photos/seed/admin/200',
      walletBalance: 999999,
      isVerified: true
    },
    {
      id: 'mod-mumbai',
      email: 'mod@adoiz.com',
      name: 'Mumbai Moderator',
      role: UserRole.MODERATOR,
      photo: 'https://picsum.photos/seed/mod/200',
      walletBalance: 1000,
      managedCityIds: ['c1'],
      isVerified: true
    }
  ];
  private listings: Listing[] = [...MOCK_LISTINGS];
  private categories: Category[] = [
    { id: 'cat1', name: 'Electronics', icon: 'fa-laptop' },
    { id: 'cat2', name: 'Properties', icon: 'fa-building' },
    { id: 'cat3', name: 'Furniture', icon: 'fa-couch' },
    { id: 'cat4', name: 'Cars', icon: 'fa-car' }
  ];
  
  private countries: Country[] = [{ id: 'ctr1', name: 'India', code: 'IN', isActive: true }];
  private states: State[] = [...STATES.map(s => ({ ...s, isActive: true }))];
  private cities: City[] = [...CITIES.map(c => ({ ...c, isActive: true }))];

  private banners: BannerAd[] = [];
  private transactions: WalletTransaction[] = [];
  private tickets: SupportTicket[] = [];
  private chats: Chat[] = [];
  private messages: Message[] = [];
  private backups: BackupArchive[] = [
    {
      id: 'b1',
      filename: 'db_snap_20231024.bak',
      size: '1.2 MB',
      timestamp: '2023-10-24T10:00:00Z',
      status: 'COMPLETED',
      type: 'AUTO',
      integrityVerified: true
    }
  ];

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
    adminUrl: '/admin',
    adminUsername: 'admin',
    backupSchedule: {
      enabled: true,
      frequency: 'DAILY',
      lastRunAt: '2023-10-24T00:00:00Z',
      nextRunAt: new Date(Date.now() + 86400000).toISOString(),
      retentionLimit: 5
    },
    adminAuth: {
      twoFactorEnabled: false,
      sessionTimeoutMinutes: 30,
      allowConcurrentSessions: true,
      restrictAdminIp: false,
      allowedAdminIps: [],
      passwordExpiryDays: 90,
      enableLoginLimits: false,
      loginLockoutMinutes: 15
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
    paymentGateway: {
      razorpay: { active: true, keyId: '', keySecret: '' },
      paypal: { active: false, clientId: '', secret: '' },
      stripe: { active: false, publishableKey: '', secretKey: '' },
      paytm: { active: false, merchantId: false, merchantKey: '', website: '' },
      phonepe: { active: false, merchantId: '', saltKey: '', saltIndex: '' },
      upiId: 'adoiz@upi'
    },
    smsGateway: {
      twilio: { active: false, sid: '', authToken: false, fromNumber: '' },
      msg91: { active: false, authKey: '', senderId: '' },
      textlocal: { active: false, apiKey: '', sender: '' }
    },
    emailGateway: {
      sendgrid: { active: false, apiKey: '', fromEmail: '' },
      mailgun: { active: false, apiKey: '', domain: '', fromEmail: '' },
      ses: { active: false, accessKey: '', secretKey: '', region: '', fromEmail: '' }
    },
    socialLogin: { 
      googleClientId: '', 
      googleClientSecret: '', 
      googleEnabled: true,
      facebookAppId: '', 
      facebookAppSecret: '',
      facebookEnabled: true
    },
    analytics: {
      googleAnalyticsId: '',
      enabled: false
    },
    seo: {
      enableSitemap: true,
      metaTitle: 'ADOIZ | Buy and Sell Locally',
      metaDescription: 'The premium city-locked marketplace for local trades.'
    },
    advertising: { googleAdSenseClient: '' },
    security: { 
      ipBlacklist: [], 
      maxFailedLogins: 5, 
      requireMobileVerification: false, 
      requireEmailVerification: true,
      requireOtpLogin: false,
      auditLogRetentionDays: 30 
    }
  };

  getSystemConfig(): SystemConfig { return this.config; }
  updateSystemConfig(config: SystemConfig): void { 
    this.config = { ...this.config, ...config }; 
    this.addSecurityLog('CONFIG_UPDATE', 'System configuration was modified by admin.', 'MEDIUM');
  }

  getSecurityLogs(): SecurityLog[] { return this.securityLogs; }
  addSecurityLog(action: string, details: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): void {
    this.securityLogs.unshift({ id: 'sl' + Date.now(), timestamp: new Date().toISOString(), ip: '127.0.0.1', action, details, severity });
  }

  // --- Category Management ---
  async getCategories(): Promise<Category[]> { return this.categories; }
  async addCategory(cat: Omit<Category, 'id'>, adminId: string): Promise<Category> {
    const newCat: Category = { ...cat, id: 'cat' + Date.now() };
    this.categories.push(newCat);
    this.addSecurityLog('CATEGORY_CREATE', `Admin ${adminId} created category ${cat.name}`, 'LOW');
    return newCat;
  }
  async updateCategory(id: string, updates: Partial<Category>, adminId: string): Promise<void> {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.categories[idx] = { ...this.categories[idx], ...updates };
      this.addSecurityLog('CATEGORY_UPDATE', `Admin ${adminId} updated category ${id}`, 'LOW');
    }
  }
  async deleteCategory(id: string, adminId: string): Promise<void> {
    const cat = this.categories.find(c => c.id === id);
    if (!cat) return;
    const isUsed = this.listings.some(l => l.category === cat.name);
    if (isUsed) throw new Error("Category is linked to existing listings. Please reassign them first.");
    this.categories = this.categories.filter(c => c.id !== id);
    this.addSecurityLog('CATEGORY_DELETE', `Admin ${adminId} hard-deleted category ${cat.name}`, 'HIGH');
  }

  // --- Geo Management ---
  getCountries(): Country[] { return [...this.countries]; }
  getStates(countryId?: string): State[] { return countryId ? this.states.filter(s => s.countryId === countryId) : [...this.states]; }
  getCities(stateId?: string): City[] { return stateId ? this.cities.filter(c => c.stateId === stateId) : [...this.cities]; }

  async addCountry(data: Omit<Country, 'id'>, adminId: string): Promise<Country> {
    const newCountry: Country = { ...data, id: 'ctr' + Date.now() };
    this.countries.push(newCountry);
    this.addSecurityLog('GEO_COUNTRY_CREATE', `Admin ${adminId} created country ${data.name}`, 'LOW');
    return newCountry;
  }
  async addState(data: Omit<State, 'id'>, adminId: string): Promise<State> {
    const newState: State = { ...data, id: 'st' + Date.now() };
    this.states.push(newState);
    this.addSecurityLog('GEO_STATE_CREATE', `Admin ${adminId} created state ${data.name}`, 'LOW');
    return newState;
  }
  async addCity(data: Omit<City, 'id'>, adminId: string): Promise<City> {
    const newCity: City = { ...data, id: 'c' + Date.now() };
    this.cities.push(newCity);
    this.addSecurityLog('GEO_CITY_CREATE', `Admin ${adminId} created city ${data.name}`, 'LOW');
    return newCity;
  }

  async updateCountry(id: string, updates: Partial<Country>, adminId: string): Promise<void> {
    const idx = this.countries.findIndex(c => c.id === id);
    if (idx !== -1) this.countries[idx] = { ...this.countries[idx], ...updates };
  }
  async updateState(id: string, updates: Partial<State>, adminId: string): Promise<void> {
    const idx = this.states.findIndex(s => s.id === id);
    if (idx !== -1) this.states[idx] = { ...this.states[idx], ...updates };
  }
  async updateCity(id: string, updates: Partial<City>, adminId: string): Promise<void> {
    const idx = this.cities.findIndex(c => c.id === id);
    if (idx !== -1) this.cities[idx] = { ...this.cities[idx], ...updates };
  }

  async deleteCity(id: string, adminId: string): Promise<void> {
    const isUsedByListing = this.listings.some(l => l.cityId === id);
    const isUsedByUser = this.users.some(u => u.cityId === id);
    if (isUsedByListing || isUsedByUser) throw new Error("City is currently linked to listings or users. Cannot delete.");
    this.cities = this.cities.filter(c => c.id !== id);
    this.addSecurityLog('GEO_CITY_DELETE', `Admin ${adminId} deleted city ${id}`, 'HIGH');
  }

  async deleteState(id: string, adminId: string): Promise<void> {
    const hasCities = this.cities.some(c => c.stateId === id);
    if (hasCities) throw new Error("State contains active cities. Please delete them first.");
    this.states = this.states.filter(s => s.id !== id);
  }

  // --- Banner Ads & Sponsorship ---
  async getActiveBanners(cityId: string): Promise<BannerAd[]> { 
    return this.banners.filter(b => b.cityId === cityId && b.status === 'LIVE' && new Date(b.expiresAt) > new Date()); 
  }
  async getAllBanners(): Promise<BannerAd[]> { return this.banners; }
  async getUserBanners(userId: string): Promise<BannerAd[]> { return this.banners.filter(b => b.userId === userId); }
  
  async processBannerSponsorship(userId: string, cityId: string, imageUrl: string, linkUrl: string): Promise<BannerAd> {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error("User not found.");

    const price = this.config.bannerAdPrice;
    const isSufficient = user.walletBalance >= price;
    
    if (isSufficient && this.banners.some(b => b.userId === userId && b.cityId === cityId && b.status === 'LIVE')) {
      throw new Error("You already have an active sponsorship in this city.");
    }

    const newBanner: BannerAd = {
      id: 'b' + Date.now(),
      userId,
      cityId,
      imageUrl,
      linkUrl,
      status: isSufficient ? 'LIVE' : 'DRAFT',
      expiresAt: isSufficient 
        ? new Date(Date.now() + 86400000 * this.config.bannerAdDurationDays).toISOString() 
        : ''
    };

    if (isSufficient) {
      await this.adminAdjustWallet(userId, price, 'DEBIT', `Purchased City Sponsorship: ${cityId}`);
    }

    this.banners.unshift(newBanner);
    return newBanner;
  }

  async activateExistingBanner(bannerId: string, userId: string): Promise<void> {
    const banner = this.banners.find(b => b.id === bannerId && b.userId === userId);
    if (!banner) throw new Error("Banner not found.");
    
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error("User not found.");

    const price = this.config.bannerAdPrice;
    if (user.walletBalance < price) throw new Error("Insufficient balance to activate.");

    this.banners.forEach(b => {
      if (b.userId === userId && b.cityId === banner.cityId && b.status === 'LIVE') {
        b.status = 'EXPIRED';
      }
    });

    await this.adminAdjustWallet(userId, price, 'DEBIT', `Activated City Sponsorship: ${banner.cityId}`);
    banner.status = 'LIVE';
    banner.expiresAt = new Date(Date.now() + 86400000 * this.config.bannerAdDurationDays).toISOString();
  }

  async adminDeleteBanner(id: string, adminId: string): Promise<void> {
    this.banners = this.banners.filter(b => b.id !== id);
    this.addSecurityLog('BANNER_DELETE', `Admin ${adminId} removed banner ${id}`, 'LOW');
  }

  // --- Inventory & Listings ---
  async getListingsByCity(cityId: string, query?: string, category?: string): Promise<Listing[]> {
    return this.listings.filter(l => 
      l.cityId === cityId && 
      l.status === ListingStatus.APPROVED &&
      (!query || l.title.toLowerCase().includes(query.toLowerCase())) &&
      (!category || category === 'All' || l.category === category)
    );
  }
  async getListingsBySeller(sellerId: string): Promise<Listing[]> { return this.listings.filter(l => l.sellerId === sellerId); }
  async getAllListings(): Promise<Listing[]> { return this.listings; }

  async createListing(data: Partial<Listing>): Promise<Listing> {
    const newListing: Listing = {
      id: 'l' + Date.now(),
      status: ListingStatus.PENDING,
      views: 0,
      createdAt: new Date().toISOString(),
      ...data
    } as Listing;

    const seller = this.users.find(u => u.id === data.sellerId);
    if (seller) {
      let cost = 0;
      const userAds = this.listings.filter(l => l.sellerId === seller.id);
      if (userAds.length >= this.config.freeAdLimit) cost += this.config.standardAdPrice;
      if (data.isPremium) {
        cost += this.config.premiumPrice;
        // Premium Auto-Approval
        newListing.status = ListingStatus.APPROVED;
        newListing.publishedAt = new Date().toISOString();
        newListing.premiumFrom = new Date().toISOString();
        newListing.premiumUntil = new Date(Date.now() + 86400000 * this.config.premiumDurationDays).toISOString();
      }

      if (cost > 0) {
        if (seller.walletBalance < cost) throw new Error("Insufficient wallet balance.");
        seller.walletBalance -= cost;
        this.transactions.push({
          id: 'tx' + Date.now(),
          userId: seller.id,
          amount: cost,
          type: 'DEBIT',
          description: `Listing fees for: ${data.title}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    this.listings.push(newListing);
    return newListing;
  }

  async upgradeListingToPremium(id: string, userId: string): Promise<void> {
    const l = this.listings.find(x => x.id === id);
    const u = this.users.find(x => x.id === userId);
    if (!l || !u) return;
    if (u.walletBalance < this.config.premiumPrice) throw new Error("Insufficient funds.");
    
    u.walletBalance -= this.config.premiumPrice;
    l.isPremium = true;
    l.status = ListingStatus.APPROVED; // Premium listings bypass moderation
    l.publishedAt = new Date().toISOString();
    l.premiumFrom = new Date().toISOString();
    l.premiumUntil = new Date(Date.now() + 86400000 * this.config.premiumDurationDays).toISOString();
    
    this.transactions.push({
      id: 'tx' + Date.now(),
      userId: u.id,
      amount: this.config.premiumPrice,
      type: 'DEBIT',
      description: `Premium Upgrade: ${l.title}`,
      timestamp: new Date().toISOString()
    });
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<void> {
    const idx = this.listings.findIndex(l => l.id === id);
    if (idx !== -1) {
      const oldStatus = this.listings[idx].status;
      this.listings[idx] = { ...this.listings[idx], ...updates };
      
      // Auto-approve if listing becomes premium during update
      if (updates.isPremium && !this.listings[idx].premiumUntil) {
        this.listings[idx].status = ListingStatus.APPROVED;
        this.listings[idx].publishedAt = new Date().toISOString();
      } else if (updates.status === ListingStatus.APPROVED && oldStatus !== ListingStatus.APPROVED) {
        this.listings[idx].publishedAt = new Date().toISOString();
      }
    }
  }

  async adminDeleteListing(id: string, adminId: string): Promise<void> {
    const l = this.listings.find(x => x.id === id);
    if (l) {
      this.listings = this.listings.filter(x => x.id !== id);
      this.addSecurityLog('ADMIN_DELETE_LISTING', `Admin ${adminId} deleted listing ${id} (${l.title})`, 'HIGH');
    }
  }

  async deleteListing(id: string): Promise<void> { this.listings = this.listings.filter(l => l.id !== id); }

  async updateListingStatus(id: string, status: ListingStatus, reason?: string, adminId?: string): Promise<void> {
    const l = this.listings.find(x => x.id === id);
    if (l) { 
      const oldStatus = l.status;
      l.status = status; 
      if (reason) l.rejectionReason = reason;
      if (status === ListingStatus.APPROVED && oldStatus !== ListingStatus.APPROVED) {
        l.publishedAt = new Date().toISOString();
      }
      if (adminId) {
        this.addSecurityLog('ADMIN_UPDATE_STATUS', `Admin ${adminId} updated status of ${id} to ${status}`, 'MEDIUM');
      }
    }
  }

  async toggleFeatured(id: string, featured: boolean, from?: string, until?: string, adminId?: string): Promise<void> {
    const l = this.listings.find(x => x.id === id);
    if (l) {
      l.isPremium = featured;
      l.premiumFrom = from;
      l.premiumUntil = until;
      if (featured) {
        l.status = ListingStatus.APPROVED; // Premium status bypasses moderation
        l.publishedAt = new Date().toISOString();
      }
      if (adminId) {
        this.addSecurityLog('ADMIN_TOGGLE_FEATURED', `Admin ${adminId} set featured status of ${id} to ${featured}`, 'MEDIUM');
      }
    }
  }

  async recordView(id: string): Promise<void> {
    const l = this.listings.find(x => x.id === id);
    if (l) l.views++;
  }

  // --- Transactions ---
  async getTransactionsByUserId(userId: string): Promise<WalletTransaction[]> { return this.transactions.filter(t => t.userId === userId); }
  async getAllTransactions(): Promise<WalletTransaction[]> { return this.transactions; }
  
  async adminAdjustWallet(userId: string, amount: number, type: 'CREDIT' | 'DEBIT', reason: string, adminId?: string): Promise<User | null> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      if (type === 'CREDIT') {
        user.walletBalance += amount;
      } else {
        if (user.walletBalance < amount) throw new Error("Insufficient funds for debit adjustment.");
        user.walletBalance -= amount;
      }
      this.transactions.push({
        id: 'tx' + Date.now(),
        userId: userId,
        amount: amount,
        type: type,
        description: reason || `Admin ${type.toLowerCase()} adjustment`,
        timestamp: new Date().toISOString()
      });
      if (adminId) {
        this.addSecurityLog('WALLET_ADJUST', `Admin ${adminId} adjusted wallet for ${userId}: ${type} ${amount}. Reason: ${reason}`, 'MEDIUM');
      }
      return { ...user };
    }
    return null;
  }

  async rechargeWallet(userId: string, amount: number): Promise<User | null> {
    return this.adminAdjustWallet(userId, amount, 'CREDIT', 'User initiated recharge');
  }

  // --- Users ---
  async getAllUsers(): Promise<User[]> { return this.users; }
  async getUserById(id: string): Promise<User | null> { return this.users.find(u => u.id === id) || null; }
  async registerUser(data: Partial<User>): Promise<User> {
    const newUser: User = { id: 'u' + (this.users.length + 1), walletBalance: 0, role: UserRole.USER, ...data } as User;
    this.users.push(newUser); return newUser;
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) { 
      const oldUser = this.users[idx];
      this.users[idx] = { ...oldUser, ...updates }; 
      if (updates.isSuspended !== undefined && updates.isSuspended !== oldUser.isSuspended) {
        await this.handleUserStatusListingSync(id, updates.isSuspended);
      }
      return this.users[idx]; 
    }
    return null;
  }

  private async handleUserStatusListingSync(userId: string, isSuspended: boolean): Promise<void> {
    const userListings = this.listings.filter(l => l.sellerId === userId);
    if (isSuspended) {
      userListings.forEach(l => {
        if (l.status === ListingStatus.APPROVED) {
          l.status = ListingStatus.REJECTED;
          l.rejectionReason = "ACCOUNT_SUSPENDED_AUTO_DEACTIVATE";
        }
      });
    } else {
      userListings.forEach(l => {
        if (l.rejectionReason === "ACCOUNT_SUSPENDED_AUTO_DEACTIVATE") {
          l.status = ListingStatus.APPROVED;
          l.rejectionReason = "";
        }
      });
    }
  }

  async getUserTickets(userId: string): Promise<SupportTicket[]> { return this.tickets.filter(t => t.userId === userId); }
  async getAllTickets(): Promise<SupportTicket[]> { return this.tickets; }
  async createTicket(userId: string, userName: string, subject: string, message: string): Promise<SupportTicket> {
    const ticket: SupportTicket = { id: 't' + Date.now(), userId, userName, subject, message, status: 'OPEN', createdAt: new Date().toISOString() };
    this.tickets.push(ticket); return ticket;
  }

  async getModerationQueue(cityId?: string): Promise<Listing[]> {
    return this.listings.filter(l => (l.status === ListingStatus.PENDING || l.status === ListingStatus.EDIT_PENDING) && (!cityId || l.cityId === cityId));
  }

  async getChatsForUser(userId: string): Promise<Chat[]> { return this.chats.filter(c => c.participants.includes(userId)); }
  async getMessages(chatId: string): Promise<Message[]> { return this.messages.filter(m => m.chatId === chatId); }
  async sendMessage(chatId: string, senderId: string, text: string): Promise<Message> {
    const msg: Message = { id: 'm' + Date.now(), chatId, senderId, text, timestamp: new Date().toISOString(), isRead: false };
    this.messages.push(msg); return msg;
  }
  async getOrCreateChat(userId1: string, userId2: string, listing: Listing, otherPartyName: string): Promise<Chat> {
    let chat = this.chats.find(c => c.listingId === listing.id && c.participants.includes(userId1) && c.participants.includes(userId2));
    if (!chat) {
      chat = { id: 'ch' + Date.now(), participants: [userId1, userId2], listingId: listing.id, unreadCount: 0, otherPartyName: otherPartyName, listingTitle: listing.title };
      this.chats.push(chat);
    }
    return chat;
  }

  getBackupHistory(): BackupArchive[] { return this.backups; }

  async runSystemBackup(type: 'AUTO' | 'MANUAL' = 'MANUAL'): Promise<void> {
    const backupId = 'b' + Date.now();
    const newBackup: BackupArchive = {
      id: backupId,
      filename: `adoiz_${type.toLowerCase()}_${new Date().toISOString().split('T')[0]}.bak`,
      size: (1.1 + Math.random()).toFixed(1) + ' MB',
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      type: type,
      integrityVerified: true
    };
    this.backups.unshift(newBackup);
    this.addSecurityLog('SYSTEM_BACKUP', `System backup ${newBackup.filename} completed.`, 'MEDIUM');
  }

  async restoreBackup(id: string): Promise<void> {
    const b = this.backups.find(x => x.id === id);
    if (!b) throw new Error("Not found.");
    b.status = 'RESTORING';
    setTimeout(() => {
      b.status = 'COMPLETED';
    }, 3000);
    this.addSecurityLog('SYSTEM_RESTORE', `Restore using ${b.filename}`, 'CRITICAL');
  }

  async activateBlueTick(userId: string): Promise<User | null> {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error("User not found.");
    
    const price = this.config.blueTickPrice;
    if (user.walletBalance < price) throw new Error("Insufficient wallet balance for Blue Tick Verification.");
    
    user.walletBalance -= price;
    user.isVerified = true;
    user.blueTickUntil = new Date(Date.now() + 86400000 * this.config.blueTickDurationDays).toISOString();
    
    this.transactions.push({
      id: 'tx' + Date.now(),
      userId: userId,
      amount: price,
      type: 'DEBIT',
      description: 'Blue Tick Verification Activation',
      timestamp: new Date().toISOString()
    });
    
    return { ...user };
  }

  async getSearchSuggestions(cityId: string, query: string): Promise<string[]> {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const suggestionsSet = new Set<string>();
    
    // Check categories
    this.categories.forEach(cat => {
      if (cat.name.toLowerCase().includes(q)) suggestionsSet.add(cat.name);
    });

    // Check listings in city
    this.listings.forEach(l => {
      if (l.cityId === cityId && l.status === ListingStatus.APPROVED && l.title.toLowerCase().includes(q)) {
        suggestionsSet.add(l.title);
      }
    });

    return Array.from(suggestionsSet).slice(0, 8);
  }
}

export const dbService = new DbService();
