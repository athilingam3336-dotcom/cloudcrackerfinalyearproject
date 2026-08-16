import { LOCAL_PRODUCT_IMAGES } from './productImages';

export interface CategoryItem {
  id: string;
  name: string;
  iconName: string;
  itemCount: number;
  isPopular?: boolean;
  isTrending?: boolean;
  tag?: string;
  description?: string;
  imageUrl?: any;
}

export interface BannerItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  discountText?: string;
  ctaText: string;
  imageUrl?: any;
}

export interface ProductItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  rating: number;
  reviewCount?: number;
  imageUrl?: any;
  images?: any[];
}

export interface FlashSaleItem extends ProductItem {
  discountPercent: number;
  endsInSeconds: number;
  stockLeft: number;
}

export const MOCK_CATEGORIES: CategoryItem[] = [
  {
    id: 'all',
    name: 'All Pyrotechnics',
    iconName: 'auto-awesome',
    itemCount: 20,
    description: 'Explore our complete catalog of Sivakasi fireworks and pyrotechnics.',
    imageUrl: LOCAL_PRODUCT_IMAGES.GIFT_BOX,
  },
  {
    id: '660000000000000000000001',
    name: 'Sparklers',
    iconName: 'wb-twilight',
    itemCount: 3,
    isTrending: true,
    tag: 'Wedding Favorite',
    description: 'Golden crystalline sparklers ideal for weddings, Diwali, and parties.',
    imageUrl: LOCAL_PRODUCT_IMAGES.ELECTRIC_SPARKLERS,
  },
  {
    id: '660000000000000000000002',
    name: 'Flower Pots',
    iconName: 'water-drop',
    itemCount: 2,
    isTrending: true,
    tag: 'Trending',
    description: 'Vibrant ground fountains producing towering showers of golden sparks.',
    imageUrl: LOCAL_PRODUCT_IMAGES.FLOWER_POT,
  },
  {
    id: '660000000000000000000003',
    name: 'Ground Chakkars',
    iconName: 'celebration',
    itemCount: 2,
    description: 'High-speed spinning ground spinners and chakri wheels.',
    imageUrl: LOCAL_PRODUCT_IMAGES.GROUND_CHAKKARS,
  },
  {
    id: '660000000000000000000004',
    name: 'Rockets',
    iconName: 'rocket-launch',
    itemCount: 2,
    isPopular: true,
    tag: 'Popular',
    description: 'High-altitude aerodynamic altitude rockets with roaring sound.',
    imageUrl: LOCAL_PRODUCT_IMAGES.ROCKETS,
  },
  {
    id: '660000000000000000000005',
    name: 'Atom Bombs',
    iconName: 'all-inclusive',
    itemCount: 2,
    isPopular: true,
    tag: 'Heavy Sound',
    description: 'High-decibel heavy sound crackers engineered in Sivakasi.',
    imageUrl: LOCAL_PRODUCT_IMAGES.ATOM_BOMB,
  },
  {
    id: '660000000000000000000006',
    name: 'Bijili Crackers',
    iconName: 'local-fire-department',
    itemCount: 2,
    description: 'Traditional micro-crackers woven into vibrant red strips and strings.',
    imageUrl: LOCAL_PRODUCT_IMAGES.ATOM_BOMB,
  },
  {
    id: '660000000000000000000007',
    name: 'Fancy Aerials',
    iconName: 'settings-remote',
    itemCount: 2,
    tag: 'Sky Show',
    description: 'Multi-shot repeater display cakes and aerial finale barrage boxes.',
    imageUrl: LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30,
  },
  {
    id: '660000000000000000000008',
    name: 'Sound Crackers',
    iconName: 'volume-up',
    itemCount: 2,
    tag: 'High Decibel',
    description: 'Single and multi-shot salute sound crackers for high-energy celebrations.',
    imageUrl: LOCAL_PRODUCT_IMAGES.ATOM_BOMB,
  },
  {
    id: '660000000000000000000009',
    name: 'Kids Crackers',
    iconName: 'child-care',
    itemCount: 2,
    isTrending: true,
    tag: 'Safe & Gentle',
    description: 'Child-friendly, low-smoke novelty fireworks and sparkling pencil novelties.',
    imageUrl: LOCAL_PRODUCT_IMAGES.PENCIL_CANDLES,
  },
  {
    id: '660000000000000000000010',
    name: 'Gift Boxes',
    iconName: 'inventory-2',
    itemCount: 2,
    isTrending: true,
    tag: 'Best Value',
    description: 'All-in-one family assortments and classic festival celebration boxes.',
    imageUrl: LOCAL_PRODUCT_IMAGES.GIFT_BOX,
  },
];

export const MOCK_BANNERS: BannerItem[] = [
  {
    id: 'banner1',
    tag: 'Fancy Aerials',
    title: '30-Shots Multi-Shot:\nLight Up Your Night',
    subtitle: 'Experience the most spectacular sky show with our 30-shot cake collection.',
    discountText: 'Up to 40% Off',
    ctaText: 'Shop 30-Shots',
    imageUrl: LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30,
  },
  {
    id: 'banner2',
    tag: 'Rockets',
    title: 'High-Fly Sky Rockets',
    subtitle: 'Unrivaled visual brilliance reaching extreme high altitudes.',
    discountText: 'Exclusive Launch',
    ctaText: 'Explore Rockets',
    imageUrl: LOCAL_PRODUCT_IMAGES.ROCKETS,
  },
  {
    id: 'banner3',
    tag: 'Sparklers',
    title: 'Electric Sparklers Pack',
    subtitle: 'Golden crystalline sparklers designed for festive and romantic memories.',
    discountText: '25% Special Discount',
    ctaText: 'Get Sparklers',
    imageUrl: LOCAL_PRODUCT_IMAGES.ELECTRIC_SPARKLERS,
  },
];

export const MOCK_FLASH_SALE: FlashSaleItem[] = [
  {
    id: '660000000000000000000103',
    title: "Dragon's Breath Ground Fountain",
    subtitle: 'Continuous Multi-Color Flame',
    category: 'Flower Pots',
    price: 380.0,
    originalPrice: 450.0,
    discountPercent: 15,
    badge: '15% OFF',
    rating: 4.8,
    reviewCount: 142,
    endsInSeconds: 7200,
    stockLeft: 65,
    imageUrl: LOCAL_PRODUCT_IMAGES.FLOWER_POT,
  },
  {
    id: '660000000000000000000107',
    title: 'Supernova Aerial Altitude Rockets',
    subtitle: 'High Altitude Crackling Burst',
    category: 'Rockets',
    price: 499.0,
    originalPrice: 650.0,
    discountPercent: 23,
    badge: 'FLASH SALE',
    rating: 4.9,
    reviewCount: 98,
    endsInSeconds: 7200,
    stockLeft: 45,
    imageUrl: LOCAL_PRODUCT_IMAGES.ROCKETS,
  },
  {
    id: '660000000000000000000112',
    title: '10 Multi-Colour Shot Roman Candle',
    subtitle: '10 Shot Blue Peony Effect',
    category: 'Twinkling Stars',
    price: 180.0,
    originalPrice: 220.0,
    discountPercent: 18,
    badge: 'LIMITED',
    rating: 4.7,
    reviewCount: 76,
    endsInSeconds: 7200,
    stockLeft: 95,
    imageUrl: LOCAL_PRODUCT_IMAGES.PENCIL_CANDLES,
  },
];

export const MOCK_FEATURED_PRODUCTS: ProductItem[] = [
  {
    id: '660000000000000000000107',
    title: 'Supernova Aerial Altitude Rockets',
    subtitle: 'Professional Grade Display',
    category: 'Rockets',
    price: 499.0,
    badge: 'Popular',
    rating: 4.9,
    reviewCount: 128,
    imageUrl: LOCAL_PRODUCT_IMAGES.ROCKETS,
  },
  {
    id: '660000000000000000000101',
    title: 'Electric Sparklers Deluxe Pack (50 Pcs)',
    subtitle: 'Wedding Pearl Pack (50 Pcs)',
    category: 'Sparklers',
    price: 250.0,
    badge: 'Top Pick',
    rating: 4.8,
    reviewCount: 94,
    imageUrl: LOCAL_PRODUCT_IMAGES.ELECTRIC_SPARKLERS,
  },
  {
    id: '660000000000000000000113',
    title: '30-Shot Golden Palm Cake',
    subtitle: '30 Shots Sky Show',
    category: 'Aerial Cakes & Multi-Shots',
    price: 1250.0,
    badge: 'Best Seller',
    rating: 5.0,
    reviewCount: 210,
    imageUrl: LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30,
  },
];

export const MOCK_BEST_SELLERS: ProductItem[] = [
  {
    id: '660000000000000000000114',
    title: '50-Shot Midnight Brocade Crown Cake',
    subtitle: '50 Shot Sky Finale',
    category: 'Aerial Cakes & Multi-Shots',
    price: 1950.0,
    originalPrice: 2400.0,
    badge: 'Trending',
    rating: 4.9,
    reviewCount: 188,
    imageUrl: LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30,
  },
  {
    id: '660000000000000000000109',
    title: 'Hydro Green Atom Bomb (10 Pcs Box)',
    subtitle: 'High Decibel Heavy Sound',
    category: 'Atom Bombs',
    price: 299.0,
    rating: 4.9,
    reviewCount: 115,
    imageUrl: LOCAL_PRODUCT_IMAGES.ATOM_BOMB,
  },
  {
    id: '660000000000000000000105',
    title: 'Deluxe Ground Chakkars (10 Pcs Box)',
    subtitle: 'High-speed spinning gold spark circle',
    category: 'Ground Chakkars',
    price: 220.0,
    rating: 4.8,
    reviewCount: 89,
    imageUrl: LOCAL_PRODUCT_IMAGES.GROUND_CHAKKARS,
  },
];

export const MOCK_PRODUCTS: ProductItem[] = [
  {
    id: '660000000000000000000101',
    title: 'Electric Sparklers Deluxe Pack (50 Pcs)',
    subtitle: 'Premium long-burning electric gold and silver wire sparklers.',
    category: 'Sparklers',
    price: 250.0,
    badge: 'BESTSELLER',
    rating: 4.9,
    reviewCount: 94,
    imageUrl: LOCAL_PRODUCT_IMAGES.ELECTRIC_SPARKLERS,
  },
  {
    id: '660000000000000000000102',
    title: 'Starlight Pearl Color Sparklers (30 Pcs)',
    subtitle: 'Vibrant multi-colored sparklers with dense crystalline sparkle.',
    category: 'Sparklers',
    price: 150.0,
    originalPrice: 180.0,
    badge: 'HOT PICK',
    rating: 4.8,
    reviewCount: 46,
    imageUrl: LOCAL_PRODUCT_IMAGES.ELECTRIC_SPARKLERS,
  },
  {
    id: '660000000000000000000103',
    title: "Dragon's Breath Ground Fountain",
    subtitle: 'Continuous multi-color fountain erupting up to 15 feet high.',
    category: 'Flower Pots',
    price: 380.0,
    originalPrice: 450.0,
    badge: 'FEATURED',
    rating: 4.8,
    reviewCount: 142,
    imageUrl: LOCAL_PRODUCT_IMAGES.FLOWER_POT,
  },
  {
    id: '660000000000000000000105',
    title: 'Deluxe Ground Chakkars (10 Pcs Box)',
    subtitle: 'High-speed spinning ground chakkars creating wide rings of golden glitter.',
    category: 'Ground Chakkars',
    price: 220.0,
    originalPrice: 280.0,
    badge: 'POPULAR',
    rating: 4.9,
    reviewCount: 118,
    imageUrl: LOCAL_PRODUCT_IMAGES.GROUND_CHAKKARS,
  },
  {
    id: '660000000000000000000107',
    title: 'Supernova Aerial Altitude Rockets',
    subtitle: 'Professional display high-altitude titanium burst rockets.',
    category: 'Rockets',
    price: 499.0,
    originalPrice: 650.0,
    badge: 'TOP RATED',
    rating: 4.9,
    reviewCount: 98,
    imageUrl: LOCAL_PRODUCT_IMAGES.ROCKETS,
  },
  {
    id: '660000000000000000000109',
    title: 'Hydro Green Atom Bomb (10 Pcs Box)',
    subtitle: 'High-decibel heavy sound crackers engineered in Sivakasi.',
    category: 'Atom Bombs',
    price: 299.0,
    badge: 'BESTSELLER',
    rating: 4.9,
    reviewCount: 115,
    imageUrl: LOCAL_PRODUCT_IMAGES.ATOM_BOMB,
  },
  {
    id: '660000000000000000000113',
    title: '30-Shot Golden Palm Cake',
    subtitle: 'Multi-shot repeater display cake with golden palm tails.',
    category: 'Aerial Cakes & Multi-Shots',
    price: 1250.0,
    originalPrice: 1500.0,
    badge: 'SKY SHOW',
    rating: 5.0,
    reviewCount: 210,
    imageUrl: LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30,
  },
  {
    id: '660000000000000000000116',
    title: 'Sivakasi Grand Family Gift Box (45 Items)',
    subtitle: 'Comprehensive festival assortment package for the whole family.',
    category: 'Gift Boxes & Assortments',
    price: 2800.0,
    originalPrice: 3500.0,
    badge: 'BEST VALUE',
    rating: 5.0,
    reviewCount: 165,
    imageUrl: LOCAL_PRODUCT_IMAGES.GIFT_BOX,
  },
];
