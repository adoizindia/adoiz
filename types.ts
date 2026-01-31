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
  EDIT_PENDING = 'EDIT_PENDING'
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

export interface BannerAd {
  id: string;
  userId: string;
  cityId: string;
  imageUrl: string;
  linkUrl: string;
  status: 'DRAFT' | 'LIVE' | 'EXPIRED';
  expiresAt: string;
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
  adminUrl: string;
  adminUsername: string;
  adminPassword?: string;
  backupSchedule: {
    enabled: boolean;
    frequency: 'DAILY' | 'REALTIME';
    lastRunAt?: string;
    nextRunAt?: string;
    retentionLimit: number;
  };
  adminAuth: {
    twoFactorEnabled: boolean;
    sessionTimeoutMinutes: number;
    allowConcurrentSessions: boolean;
    restrictAdminIp: boolean;
    allowedAdminIps: string[];
    passwordExpiryDays: number;
    loginLockoutMinutes?: number;
    enableLoginLimits?: boolean;
  };
  branding: {
    siteTagline: string;
    footerText: string;
    primaryColor: string;
    secondaryColor: string;
    supportEmail: string;
    supportPhone: string;
    address: string;
    social: {
      facebook: string;
      instagram: string;
      twitter: string;
      linkedin: string;
      youtube: string;
    }
  };
  paymentGateway: {
    razorpay: { active: boolean; keyId: string; keySecret: string; };
    paypal: { active: boolean; clientId: string; secret: string; };
    stripe: { active: boolean; publishableKey: string; secretKey: string; };
    paytm: { active: boolean; merchantId: boolean; merchantKey: string; website: string; };
    phonepe: { active: boolean; merchantId: string; saltKey: string; saltIndex: string; };
    upiId: string;
  };
  smsGateway: {
    twilio: { active: boolean; sid: string; authToken: boolean; fromNumber: string; };
    msg91: { active: boolean; authKey: string; senderId: string; };
    textlocal: { active: boolean; apiKey: string; sender: string; };
  };
  emailGateway: {
    sendgrid: { active: boolean; apiKey: string; fromEmail: string; };
    mailgun: { active: boolean; apiKey: string; domain: string; fromEmail: string; };
    ses: { active: boolean; accessKey: string; secretKey: string; region: string; fromEmail: string; };
  };
  socialLogin: { 
    googleClientId: string; 
    googleClientSecret: string;
    googleEnabled: boolean;
    facebookAppId: string; 
    facebookAppSecret: string;
    facebookEnabled: boolean;
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
  advertising: { googleAdSenseClient: string; };
  security: { 
    ipBlacklist: string[]; 
    maxFailedLogins: number; 
    requireMobileVerification: boolean;
    requireEmailVerification: boolean;
    requireOtpLogin: boolean;
    auditLogRetentionDays?: number;
  };
}

export interface Country { id: string; name: string; code: string; isActive?: boolean; }
export interface State { id: string; name: string; countryId: string; isActive?: boolean; }
export interface City { id: string; name: string; stateId: string; isActive?: boolean; }

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
  isVerified?: boolean;
  blueTickUntil?: string;
  socialProvider?: 'google' | 'facebook' | 'email';
}

export interface Listing {
  id: string;
  sellerId: string;
  cityId: string;
  title: string;
  description: string;
  price: number;
  category: string;
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