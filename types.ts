
export enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED'
}

export enum ListingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EDIT_PENDING = 'EDIT_PENDING',
  DISABLED = 'DISABLED'
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  ip: string;
  action: string;
  userId?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  parentId?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
  isPopular?: boolean;
}

export interface UserSubscription {
  planId: string;
  planName: string;
  activatedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED';
}

export interface SystemConfig {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  maintenanceMode: boolean;
  premiumPrice: number;
  premiumDurationDays: number;
  standardAdPrice: number;
  freeAdLimit: number;
  blueTickPrice: number;
  blueTickDurationDays: number;
  blueTickEnabled: boolean;
  bannerAdTierPrices: {
    T1: number; // CPM Rate for Tier 1
    T2: number; // CPM Rate for Tier 2
    T3: number; // CPM Rate for Tier 3
  };
  googleAdsenseCode: string;
  cityTierMapping: Record<string, 'T1' | 'T2' | 'T3'>;
  subscriptionPlans: SubscriptionPlan[];
  featureToggles: {
    ads: boolean;
    banners: boolean;
    wallet: boolean;
    verification: boolean;
    guestBrowsing: boolean;
    cityLock: boolean;
  };
  adminUrl: string;
  adminUsername: string;
  branding: {
    siteTagline: string;
    footerText: string;
    primaryColor: string;
    secondaryColor: string;
    supportEmail: string;
    supportPhone: string;
    address: string;
    appName?: string;
    statusColor?: string;
    pwaIcon?: string;
    social: {
      facebook: string;
      instagram: string;
      twitter: string;
      linkedin: string;
      youtube: string;
    };
    resourceLinks: Array<{ label: string; url: string; content?: string }>;
  };
  socialLogin: {
    googleClientId: string;
    facebookAppId: string;
  };
  otpConfig: {
    email: {
      enabled: boolean;
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPass: string;
      smtpSecure: boolean;
    };
    sms: {
      enabled: boolean;
      provider: 'MSG91' | 'TWILIO' | 'OTHER';
      apiKey: string;
      senderId: string;
    };
  };
  paymentGateway: {
    razorpay: { active: boolean; keyId: string; keySecret: string; };
    upiId: string;
  };
  referral: {
    enabled: boolean;
    welcomeBonus: number;
    referrerBonus: number;
  };
}

export interface Country {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
}

export interface State { id: string; name: string; countryId: string; isActive?: boolean; }
export interface City { id: string; name: string; stateId: string; isActive?: boolean; }

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  cityId?: string;
  stateId?: string;
  countryId?: string;
  mobile?: string;
  whatsapp?: string;
  address?: string;
  photo?: string;
  walletBalance: number;
  subscription?: UserSubscription;
  managedCityIds?: string[];
  isSuspended?: boolean;
  isBanned?: boolean;
  isVerified?: boolean;
  blueTickUntil?: string;
  socialProvider?: 'email' | 'google' | 'facebook';
  averageRating?: number;
  ratingCount?: number;
  referralCode?: string;
  referredBy?: string;
  isVacationMode?: boolean;
}

export interface Listing {
  id: string;
  sellerId: string;
  cityId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  productType?: 'New' | 'Used' | 'N/A';
  images: string[];
  status: ListingStatus;
  isPremium: boolean;
  premiumFrom?: string;
  premiumUntil?: string;
  publishedAt?: string;
  createdAt: string;
  rejectionReason?: string;
  views: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  timestamp: string;
}

export interface Chat { id: string; participants: string[]; lastMessage?: string; lastTimestamp?: string; listingId: string; unreadCount: number; otherPartyName: string; listingTitle: string; }
export interface Message { id: string; chatId: string; senderId: string; text: string; timestamp: string; isRead: boolean; }

export interface BannerAd {
  id: string;
  userId: string;
  cityId: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  status: 'PENDING' | 'LIVE' | 'REJECTED' | 'COMPLETED' | 'PAUSED';
  createdAt: string;
  rejectionReason?: string;
  views: number; // Current Impressions
  clicks: number;
  budget: number;
  cpmRate: number;
  targetImpressions: number;
}

export interface Rating {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  score: number;
  comment: string;
  timestamp: string;
}

export interface AdReport {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reporterName: string;
  cityId: string;
  reason: 'FRAUD' | 'SPAM' | 'MISLEADING' | 'INAPPROPRIATE' | 'OTHER';
  details: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  cityId: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
}
