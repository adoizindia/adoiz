
export enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN'
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

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
}

export interface AdReport {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reporterName: string;
  cityId: string;
  reason: 'SPAM' | 'FRAUD' | 'MISLEADING' | 'INAPPROPRIATE' | 'OTHER';
  details: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface BannerAd {
  id: string;
  userId: string;
  cityId: string;
  title?: string;
  imageUrl: string;
  linkUrl: string;
  status: 'DRAFT' | 'PENDING' | 'LIVE' | 'REJECTED' | 'EXPIRED';
  expiresAt: string;
  createdAt?: string;
  views?: number;
  clicks?: number;
  rejectionReason?: string;
}

export interface BackupArchive {
  id: string;
  filename: string;
  size: string;
  timestamp: string;
  status: 'COMPLETED' | 'FAILED' | 'RESTORING';
  type: 'AUTO' | 'MANUAL';
  integrityVerified: boolean;
  errorMessage?: string;
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
  bannerAdPrice: number;
  bannerAdDurationDays: number;
  bannerAdTierPrices: {
    T1: number;
    T2: number;
    T3: number;
  };
  googleAdsenseCode: string;
  cityTierMapping: Record<string, 'T1' | 'T2' | 'T3'>;
  cityFeatureOverrides?: Record<string, {
    ads?: boolean;
    banners?: boolean;
    premiumAds?: boolean;
    freeAds?: boolean;
  }>;
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
  adminAuth: {
    twoFactorEnabled: boolean;
    sessionTimeoutMinutes: number;
    allowConcurrentSessions: boolean;
    restrictAdminIp: boolean;
    allowedAdminIps: string[];
    passwordExpiryDays: number;
  };
  branding: {
    siteTagline: string;
    footerText: string;
    primaryColor: string;
    secondaryColor: string;
    supportEmail: string;
    supportPhone: string;
    address: string;
    appName?: string;
    splashLogo?: string;
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
  paymentGateway: {
    razorpay: { active: boolean; keyId: string; keySecret: string; };
    paypal: { active: boolean; clientId: string; secret: string; };
    stripe: { active: boolean; publishableKey: string; secretKey: string; };
    paytm: { active: boolean; merchantId: string; merchantKey: string; website: string; };
    phonepe: { active: boolean; merchantId: string; saltKey: string; saltIndex: string; };
    upiId: string;
  };
  smsGateway: {
    selected: 'twilio' | 'msg91' | 'textlocal';
    twilio: { active: boolean; sid: string; authToken: string; fromNumber: string; };
    msg91: { active: boolean; authKey: string; senderId: string; };
    textlocal: { active: boolean; apiKey: string; sender: string; };
  };
  emailGateway: {
    selected: 'sendgrid' | 'mailgun' | 'ses';
    sendgrid: { active: boolean; apiKey: string; fromEmail: string; };
    mailgun: { active: boolean; apiKey: string; domain: string; fromEmail: string; };
    ses: { active: boolean; accessKey: string; secretKey: string; region: string; fromEmail: string; };
  };
  analytics: {
    googleAnalyticsId: string;
    enabled: boolean;
  };
  seo: {
    enableSitemap: boolean;
    metaTitle: string;
    metaDescription: string;
  };
}

export interface Country { id: string; name: string; code: string; isActive?: boolean; createdAt?: string; }
export interface State { id: string; name: string; countryId: string; isActive?: boolean; }
export interface City { id: string; name: string; stateId: string; isActive?: boolean; }

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  cityId?: string;
  stateId?: string;
  mobile?: string;
  whatsapp?: string;
  address?: string;
  photo?: string;
  walletBalance: number;
  managedCityIds?: string[];
  isSuspended?: boolean;
  isBanned?: boolean;
  isVerified?: boolean;
  blueTickUntil?: string;
  socialProvider?: 'email' | 'google' | 'facebook';
  averageRating?: number;
  ratingCount?: number;
}

export interface Listing {
  id: string;
  sellerId: string;
  cityId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  productType?: 'New' | 'Used' | 'Universal';
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

export interface Message { id: string; chatId: string; senderId: string; text: string; timestamp: string; isRead: boolean; }
export interface Chat { id: string; participants: string[]; lastMessage?: string; lastTimestamp?: string; listingId: string; unreadCount: number; otherPartyName: string; listingTitle: string; }
