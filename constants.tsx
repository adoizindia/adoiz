
import { State, City, UserRole, User, Listing, ListingStatus, Country } from './types';

// Force recompile
export const COUNTRIES: Country[] = [
  { id: 'ctr1', name: 'India', code: '+91' },
  { id: 'ctr2', name: 'USA', code: '+1' },
  { id: 'ctr3', name: 'UK', code: '+44' }
];

// Fixed: Added missing countryId property required by the State interface
export const STATES: State[] = [
  { id: 'st1', name: 'Maharashtra', countryId: 'ctr1' },
  { id: 'st2', name: 'Karnataka', countryId: 'ctr1' },
  { id: 'st3', name: 'Delhi', countryId: 'ctr1' }
];

export const CITIES: City[] = [
  { id: 'c1', name: 'Mumbai', stateId: 'st1' },
  { id: 'c2', name: 'Pune', stateId: 'st1' },
  { id: 'c3', name: 'Bangalore', stateId: 'st2' },
  { id: 'c4', name: 'New Delhi', stateId: 'st3' }
];

export const MOCK_USER: User = {
  id: 'u1',
  email: 'user@adoiz.com',
  name: 'John Doe',
  role: UserRole.USER,
  cityId: 'c1',
  stateId: 'st1',
  mobile: '+91 9876543210',
  whatsapp: '+91 9876543210',
  photo: 'https://picsum.photos/seed/u1/200',
  walletBalance: 50000
};

export const ADDITIONAL_MOCK_USERS: User[] = [
  {
    id: 'u2',
    email: 'mumbai_prop@test.com',
    name: 'Rajesh Malhotra',
    role: UserRole.USER,
    cityId: 'c1',
    stateId: 'st1',
    mobile: '+91 9988776655',
    whatsapp: '+91 9988776655',
    photo: 'https://picsum.photos/seed/u2/200',
    walletBalance: 50000
  },
  {
    id: 'u3',
    email: 'tech_gadgets@test.com',
    name: 'Anjali Sharma',
    role: UserRole.USER,
    cityId: 'c1',
    stateId: 'st1',
    mobile: '+91 8877665544',
    whatsapp: '+91 8877665544',
    photo: 'https://picsum.photos/seed/u3/200',
    walletBalance: 50000
  },
  {
    id: 'u5',
    email: 'car_dealer@test.com',
    name: 'Vikram Singh',
    role: UserRole.USER,
    cityId: 'c1',
    stateId: 'st1',
    mobile: '+91 7766554433',
    whatsapp: '+91 7766554433',
    photo: 'https://picsum.photos/seed/u5/200',
    walletBalance: 50000
  },
  {
    id: 'u6',
    email: 'pune_furniture@test.com',
    name: 'Suresh Patil',
    role: UserRole.USER,
    cityId: 'c2',
    stateId: 'st1',
    mobile: '+91 6655443322',
    whatsapp: '+91 6655443322',
    photo: 'https://picsum.photos/seed/u6/200',
    walletBalance: 50000
  },
  {
    id: 'u7',
    email: 'delhi_electronics@test.com',
    name: 'Amit Verma',
    role: UserRole.USER,
    cityId: 'c4',
    stateId: 'st3',
    mobile: '+91 5544332211',
    whatsapp: '+91 5544332211',
    photo: 'https://picsum.photos/seed/u7/200',
    walletBalance: 50000
  }
];

export const MOCK_LISTINGS: Listing[] = [
  // MUMBAI (c1) - 5 Listings
  {
    id: 'l1',
    sellerId: 'u1',
    cityId: 'c1',
    title: 'iPhone 15 Pro - 256GB Space Black',
    description: 'Perfect condition iPhone 15 Pro. No scratches, under warranty.',
    price: 95000,
    category: 'Electronics',
    images: ['https://picsum.photos/seed/l1/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: true,
    createdAt: '2023-10-01T10:00:00Z',
    views: 120
  },
  {
    id: 'l2',
    sellerId: 'u2',
    cityId: 'c1',
    title: 'Modern 2BHK Apartment in Bandra',
    description: 'Beautiful apartment with sea view. Fully furnished.',
    price: 45000000,
    category: 'Properties',
    images: ['https://picsum.photos/seed/l2/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-10-02T12:00:00Z',
    views: 450
  },
  {
    id: 'l3',
    sellerId: 'u1',
    cityId: 'c1',
    title: 'Solid Teak Wood Dining Table',
    description: '6 seater dining table, very well maintained, 2 years old.',
    price: 15000,
    category: 'Furniture',
    images: ['https://picsum.photos/seed/l3/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-10-05T09:00:00Z',
    views: 85
  },
  {
    id: 'l4',
    sellerId: 'u5',
    cityId: 'c1',
    title: 'Honda City i-VTEC 2021',
    description: 'Automatic transmission, first owner, only 15000 kms done.',
    price: 1150000,
    category: 'Cars',
    images: ['https://picsum.photos/seed/l4/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-10-06T14:30:00Z',
    views: 210
  },
  {
    id: 'l5',
    sellerId: 'u3',
    cityId: 'c1',
    title: 'Sony Alpha a7 III Mirrorless Camera',
    description: 'Comes with 28-70mm lens. Great for professional photography.',
    price: 125000,
    category: 'Electronics',
    images: ['https://picsum.photos/seed/l5/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-10-10T11:00:00Z',
    views: 95
  },
  {
    id: 'l21',
    sellerId: 'u2',
    cityId: 'c1',
    title: 'Commercial Office Space in Andheri',
    description: '1000 sq ft furnished office, near metro station.',
    price: 25000000,
    category: 'Properties',
    images: ['https://picsum.photos/seed/l21/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: true,
    createdAt: '2023-11-10T09:00:00Z',
    views: 320
  },
  {
    id: 'l22',
    sellerId: 'u5',
    cityId: 'c1',
    title: 'Royal Enfield Classic 350',
    description: 'Gunmetal Grey, 2022 model, excellent condition.',
    price: 180000,
    category: 'Cars',
    images: ['https://picsum.photos/seed/l22/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-11-12T11:30:00Z',
    views: 150
  },

  // PUNE (c2) - 5 Listings
  {
    id: 'l6',
    sellerId: 'u5',
    cityId: 'c2',
    title: 'Maruti Suzuki Swift VXI 2019',
    description: 'White color, Pune passing, very good fuel efficiency.',
    price: 525000,
    category: 'Cars',
    images: ['https://picsum.photos/seed/l6/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: true,
    createdAt: '2023-10-12T15:00:00Z',
    views: 310
  },
  {
    id: 'l7',
    sellerId: 'u1',
    cityId: 'c2',
    title: 'King Size Bed with Mattress',
    description: 'Premium quality wood, including memory foam mattress.',
    price: 28000,
    category: 'Furniture',
    images: ['https://picsum.photos/seed/l7/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-10-15T09:00:00Z',
    views: 45
  },
  {
    id: 'l8',
    sellerId: 'u2',
    cityId: 'c2',
    title: '3BHK Villa in Hinjewadi',
    description: 'Gated community, swimming pool, club house access.',
    price: 18500000,
    category: 'Properties',
    images: ['https://picsum.photos/seed/l8/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: true,
    createdAt: '2023-10-18T10:30:00Z',
    views: 620
  },
  {
    id: 'l9',
    sellerId: 'u3',
    cityId: 'c2',
    title: 'Dell XPS 13 Laptop',
    description: 'Intel i7, 16GB RAM, 512GB SSD. Compact and powerful.',
    price: 85000,
    category: 'Electronics',
    images: ['https://picsum.photos/seed/l9/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-10-20T12:00:00Z',
    views: 110
  },
  {
    id: 'l10',
    sellerId: 'u1',
    cityId: 'c2',
    title: 'Samsung 55" QLED 4K TV',
    description: 'Smart TV with HDR10+, barely used, under warranty.',
    price: 55000,
    category: 'Electronics',
    images: ['https://picsum.photos/seed/l10/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-10-22T14:00:00Z',
    views: 180
  },
  {
    id: 'l23',
    sellerId: 'u6',
    cityId: 'c2',
    title: 'L-Shaped Sofa Set',
    description: 'Grey fabric, 5 seater, very comfortable.',
    price: 35000,
    category: 'Furniture',
    images: ['https://picsum.photos/seed/l23/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-11-15T14:00:00Z',
    views: 90
  },

  // BANGALORE (c3) - 5 Listings
  {
    id: 'l11',
    sellerId: 'u2',
    cityId: 'c3',
    title: 'Luxury Flat in Whitefield',
    description: '2BHK with modern amenities near IT parks.',
    price: 8500000,
    category: 'Properties',
    images: ['https://picsum.photos/seed/l11/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: true,
    createdAt: '2023-10-25T11:00:00Z',
    views: 740
  },
  {
    id: 'l12',
    sellerId: 'u3',
    cityId: 'c3',
    title: 'Custom Gaming PC - RTX 3070',
    description: 'High end gaming rig, Ryzen 7, RGB lighting.',
    price: 110000,
    category: 'Electronics',
    images: ['https://picsum.photos/seed/l12/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-10-26T16:00:00Z',
    views: 250
  },
  {
    id: 'l13',
    sellerId: 'u5',
    cityId: 'c3',
    title: 'Hyundai Creta SX 2022',
    description: 'Automatic, Sunroof, Black color, Single owner.',
    price: 1650000,
    category: 'Cars',
    images: ['https://picsum.photos/seed/l13/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: true,
    createdAt: '2023-10-27T13:00:00Z',
    views: 480
  },
  {
    id: 'l14',
    sellerId: 'u1',
    cityId: 'c3',
    title: 'Leather Sofa Set 3+2',
    description: 'Genuine leather, dark brown, very comfortable.',
    price: 45000,
    category: 'Furniture',
    images: ['https://picsum.photos/seed/l14/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-10-28T10:00:00Z',
    views: 130
  },
  {
    id: 'l15',
    sellerId: 'u3',
    cityId: 'c3',
    title: 'Bose QuietComfort 45 Headphones',
    description: 'Noise cancelling, wireless, perfect for travel.',
    price: 22000,
    category: 'Electronics',
    images: ['https://picsum.photos/seed/l15/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-10-29T17:00:00Z',
    views: 88
  },
  {
    id: 'l24',
    sellerId: 'u2',
    cityId: 'c3',
    title: 'Office Chair Ergonomic',
    description: 'High back, mesh support, adjustable height.',
    price: 8000,
    category: 'Furniture',
    images: ['https://picsum.photos/seed/l24/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-11-18T10:00:00Z',
    views: 75
  },

  // NEW DELHI (c4) - 5 Listings
  {
    id: 'l16',
    sellerId: 'u2',
    cityId: 'c4',
    title: 'Independent House in South Delhi',
    description: 'G+2 floors, spacious rooms, prime location.',
    price: 65000000,
    category: 'Properties',
    images: ['https://picsum.photos/seed/l16/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: true,
    createdAt: '2023-11-01T12:00:00Z',
    views: 910
  },
  {
    id: 'l17',
    sellerId: 'u5',
    cityId: 'c4',
    title: 'BMW 3 Series 320d Luxury Line',
    description: 'Immaculate condition, service record available.',
    price: 3200000,
    category: 'Cars',
    images: ['https://picsum.photos/seed/l17/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: true,
    createdAt: '2023-11-02T14:30:00Z',
    views: 560
  },
  {
    id: 'l18',
    sellerId: 'u1',
    cityId: 'c4',
    title: 'iPad Pro 12.9" M2 Chip',
    description: 'Space Gray, 128GB, Wi-Fi only, like new.',
    price: 88000,
    category: 'Electronics',
    images: ['https://picsum.photos/seed/l18/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-11-03T11:00:00Z',
    views: 205
  },
  {
    id: 'l19',
    sellerId: 'u3',
    cityId: 'c4',
    title: 'Large Oak Wood Bookcase',
    description: 'Handcrafted, adjustable shelves, fits 200+ books.',
    price: 12500,
    category: 'Furniture',
    images: ['https://picsum.photos/seed/l19/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-11-04T09:30:00Z',
    views: 65
  },
  {
    id: 'l20',
    sellerId: 'u3',
    cityId: 'c4',
    title: 'Nikon Z6 II Body Only',
    description: 'Full frame mirrorless, dual card slots, 4K video.',
    price: 145000,
    category: 'Electronics',
    images: ['https://picsum.photos/seed/l20/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-11-05T16:00:00Z',
    views: 112
  },
  {
    id: 'l25',
    sellerId: 'u7',
    cityId: 'c4',
    title: 'OnePlus 11 5G',
    description: '16GB RAM, 256GB Storage, Titan Black.',
    price: 56000,
    category: 'Electronics',
    images: ['https://picsum.photos/seed/l25/600/400'],
    status: ListingStatus.APPROVED,
    isPremium: false,
    createdAt: '2023-11-20T13:00:00Z',
    views: 190
  },

  // Extra Pending Items for Moderation Testing
  {
    id: 'p1',
    sellerId: 'u3',
    cityId: 'c1',
    title: 'MacBook Air M2 - Pending Review',
    description: '8GB RAM, 256GB SSD. Brand new sealed box.',
    price: 82000,
    category: 'Electronics',
    images: ['https://picsum.photos/seed/p1/600/400'],
    status: ListingStatus.PENDING,
    isPremium: false,
    createdAt: new Date().toISOString(),
    views: 0
  },
  {
    id: 'p2',
    sellerId: 'u6',
    cityId: 'c2',
    title: 'Study Table - Pending Review',
    description: 'Wooden study table with drawers.',
    price: 4500,
    category: 'Furniture',
    images: ['https://picsum.photos/seed/p2/600/400'],
    status: ListingStatus.PENDING,
    isPremium: false,
    createdAt: new Date().toISOString(),
    views: 0
  }
];
