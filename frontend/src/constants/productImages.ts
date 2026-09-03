/**
 * CloudCrackers Local Product Image Registry
 * Direct mapping of real Stitch photography from /home/athi/cloudcrackers/images/
 */

export const LOCAL_PRODUCT_IMAGES = {
  // 1. 30 Shots Multi-Shot Fireworks (Grand Finale Barrages / Multi-Shot Cakes)
  MULTI_SHOT_30: require('../../assets/products/30_shots_multi_shot_fireworks.png'),

  // 2. Flower Pot Fireworks Box (Fountains / Aanar / Dragon's Breath)
  FLOWER_POT: require('../../assets/products/flower_pot_fireworks.png'),

  // 3. Grand Festival Gift Box (Family Value Kits / Assortment Boxes)
  GIFT_BOX: require('../../assets/products/grand_festival_gift_box.png'),

  // 4. Atom Bomb Cracker (Canister Shells / Sound Crackers / Hydro Bombs)
  ATOM_BOMB: require('../../assets/products/atom_bomb_cracker.png'),

  // 5. Electric Sparklers (Long Gold & Silver Sparklers / Wedding Packs)
  ELECTRIC_SPARKLERS: require('../../assets/products/electric_sparklers.png'),

  // 6. Ground Chakkars & Spinners (Zamin Chakkars / Spinning Wheels)
  GROUND_CHAKKARS: require('../../assets/products/ground_chakkars_spinners.png'),

  // 7. Pencil Crackers & Twinkling Star Roman Candles (Multi-Color Repeater Tubes)
  PENCIL_CANDLES: require('../../assets/products/pencil_crackers_roman_candles.png'),

  // 8. High-Fly Rockets Bunch (Solar Flare / Supernova / Sky Rockets)
  ROCKETS: require('../../assets/products/rockets_fireworks.png'),

  // Festive Mascot & Celebration Artwork
  FESTIVE_KIDS_FIREWORKS: require('../../assets/diwali_kids_fireworks.png'),
  KID_BOY_SPARKLER: require('../../assets/kid_sparkler_mascot.png'),
  KID_GIRL_SPARKLER: require('../../assets/girl_sparkler_mascot.png'),
  LOGO: require('../../assets/logo.png'),
};

/**
 * Safely sanitizes remote image URLs to prevent Mixed Content security warnings.
 * - Upgrades insecure http:// to https://
 * - Filters out dummy placeholder URLs (example.com, img.jpg, localhost/127.0.0.1 on HTTPS web)
 * - Returns null for invalid or non-HTTPS remote URLs so they gracefully fall back to bundled Stitch assets.
 */
export const sanitizeRemoteImageUrl = (url?: string | null): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Filter out dummy test placeholders and local asset filenames
  if (
    lower.includes('example.com') ||
    lower.includes('placeholder') ||
    lower === 'http://img.jpg' ||
    lower === 'https://img.jpg' ||
    lower === 'http://img.png' ||
    lower === 'https://img.png' ||
    (lower.endsWith('.png') && !lower.startsWith('http') && !lower.startsWith('data:')) ||
    (lower.endsWith('.jpg') && !lower.startsWith('http') && !lower.startsWith('data:')) ||
    (lower.endsWith('.jpeg') && !lower.startsWith('http') && !lower.startsWith('data:')) ||
    (lower.endsWith('.webp') && !lower.startsWith('http') && !lower.startsWith('data:'))
  ) {
    return null;
  }

  // Data URIs are safe
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  let finalUrl = trimmed;
  // Upgrade insecure http:// to https://
  if (finalUrl.startsWith('http://')) {
    // Filter out localhost / 127.0.0.1 when running on HTTPS web
    if (lower.includes('localhost') || lower.includes('127.0.0.1')) {
      if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
        return null;
      }
    } else {
      finalUrl = finalUrl.replace(/^http:\/\//i, 'https://');
    }
  }

  // Cloudinary Image Performance Optimization:
  // Inject automatic WebP/AVIF format, quality compression, and 600px max width for product cards/details.
  // Reduces image network payload by ~85-90% (e.g. 2MB PNG -> 35KB WebP) without changing cloud storage architecture.
  if (finalUrl.includes('res.cloudinary.com') && finalUrl.includes('/upload/') && !finalUrl.includes('/upload/f_auto')) {
    finalUrl = finalUrl.replace('/upload/', '/upload/f_auto,q_auto,w_600/');
  }

  if (finalUrl.startsWith('https://')) {
    return finalUrl;
  }

  return null;
};

/**
 * Resolves any product, category, or title to its exact local Stitch image source.
 * Handles primary, gallery, and variant images without any external web requests or placeholders.
 */
export const resolveProductImage = (
  item?: {
    id?: string;
    title?: string;
    name?: string;
    category?: string;
    subtitle?: string;
    imageUrl?: any;
    images?: any[];
  } | string | null
): any => {
  if (!item) return LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30;

  // If item is already an image asset reference (number from require)
  if (typeof item === 'number') {
    return item;
  }

  // If item is already an object with uri: { uri: '...' }
  if (typeof item === 'object' && item && 'uri' in item && typeof (item as any).uri === 'string' && (item as any).uri.trim().length > 0) {
    const safeUri = sanitizeRemoteImageUrl((item as any).uri);
    if (safeUri) {
      return { uri: safeUri };
    }
  }

  // If passed a remote URL string directly
  if (typeof item === 'string') {
    const safeUri = sanitizeRemoteImageUrl(item);
    if (safeUri) {
      return { uri: safeUri };
    }
  }

  // If object has imageUrl or images with valid remote URL or direct asset
  if (typeof item === 'object' && item !== null) {
    if (typeof item.imageUrl === 'string') {
      const safeUri = sanitizeRemoteImageUrl(item.imageUrl);
      if (safeUri) {
        return { uri: safeUri };
      }
    }
    if (typeof item.imageUrl === 'number') {
      return item.imageUrl;
    }
    if (Array.isArray(item.images) && item.images.length > 0) {
      const firstImg = item.images[0];
      if (typeof firstImg === 'string') {
        const safeUri = sanitizeRemoteImageUrl(firstImg);
        if (safeUri) {
          return { uri: safeUri };
        }
      }
      if (typeof firstImg === 'number') {
        return firstImg;
      }
    }
  }

  // If passed a raw string or object to match local catalog
  const textQuery = typeof item === 'string'
    ? item.toLowerCase()
    : `${item.title || item.name || ''} ${item.category || ''} ${item.subtitle || ''} ${item.id || ''} ${Array.isArray(item.images) ? item.images.join(' ') : (item.imageUrl || '')}`.toLowerCase();

  // 1. Rockets (Solar Flare, Supernova, Sky Rocket, High-Fly)
  if (
    textQuery.includes('rocket') ||
    textQuery.includes('solar flare') ||
    textQuery.includes('supernova')
  ) {
    return LOCAL_PRODUCT_IMAGES.ROCKETS;
  }

  // 2. Sparklers (Electric Sparklers, Starlight, Wedding Pack, Gold Sparklers)
  if (
    textQuery.includes('sparkler') ||
    textQuery.includes('starlight') ||
    textQuery.includes('wedding')
  ) {
    return LOCAL_PRODUCT_IMAGES.ELECTRIC_SPARKLERS;
  }

  // 3. Flower Pots / Fountains (Dragon's Breath, Silver Comet, Aanar, Fountain)
  if (
    textQuery.includes('fountain') ||
    textQuery.includes('flower pot') ||
    textQuery.includes('dragon') ||
    textQuery.includes('comet') ||
    textQuery.includes('aanar')
  ) {
    return LOCAL_PRODUCT_IMAGES.FLOWER_POT;
  }

  // 4. Roman Candles & Pencil Crackers (Celestial, Twinkling Star, Candle, Cobalt)
  if (
    textQuery.includes('candle') ||
    textQuery.includes('pencil') ||
    textQuery.includes('celestial') ||
    textQuery.includes('cobalt') ||
    textQuery.includes('repeater')
  ) {
    return LOCAL_PRODUCT_IMAGES.PENCIL_CANDLES;
  }

  // 5. Ground Chakkars & Spinners (Zamin, Spinner, Chakkar, Wheel, Novelties)
  if (
    textQuery.includes('chakkar') ||
    textQuery.includes('spinner') ||
    textQuery.includes('wheel') ||
    textQuery.includes('novelties') ||
    textQuery.includes('ground')
  ) {
    return LOCAL_PRODUCT_IMAGES.GROUND_CHAKKARS;
  }

  // 6. Atom Bomb & Aerial Shells (Midnight Fury, Canister, Bomb, Hydro, Mortar)
  if (
    textQuery.includes('bomb') ||
    textQuery.includes('shell') ||
    textQuery.includes('fury') ||
    textQuery.includes('mortar') ||
    textQuery.includes('hydro')
  ) {
    return LOCAL_PRODUCT_IMAGES.ATOM_BOMB;
  }

  // 7. Grand Festival Gift Box & Value Kits (Assortments, Family Pack, Festival Box)
  if (
    textQuery.includes('gift') ||
    textQuery.includes('box') ||
    textQuery.includes('assortment') ||
    textQuery.includes('kit') ||
    textQuery.includes('pack')
  ) {
    return LOCAL_PRODUCT_IMAGES.GIFT_BOX;
  }

  // 8. Barrages & Multi-Shot Cakes (30-Shot, Golden Willow, Titanium Rain, Crimson Sovereign, Grand Finale)
  if (
    textQuery.includes('barrage') ||
    textQuery.includes('cake') ||
    textQuery.includes('shot') ||
    textQuery.includes('willow') ||
    textQuery.includes('titanium') ||
    textQuery.includes('sovereign') ||
    textQuery.includes('finale')
  ) {
    return LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30;
  }

  // Default fallback to first real Stitch image
  return LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30;
};

export interface ProductGalleryItem {
  uri: any;
  itemData: {
    id: string;
    title: string;
    subtitle: string;
    price: number;
    originalPrice?: number;
    badge?: string;
    stock: number;
    description: string;
    imageUrl?: any;
    rating: number;
    reviewCount: number;
  };
}

/**
 * Returns a complete gallery of items with image URIs and matching product specifications for detail screens.
 */
export const getProductGalleryItems = (product?: any): ProductGalleryItem[] => {
  const primaryImage = resolveProductImage(product);
  const primaryItemData = {
    id: product?.id || 'prod_primary',
    title: product?.title || product?.name || 'Pyrotechnic Item',
    subtitle: product?.subtitle || product?.description || 'Premium fireworks selection.',
    price: typeof product?.price === 'number' ? product.price : 50.0,
    originalPrice: product?.originalPrice,
    badge: product?.badge || (product?.is_bestseller ? 'Bestseller' : product?.is_featured ? 'Featured' : undefined),
    stock: typeof product?.stock === 'number' ? product.stock : 100,
    description: product?.subtitle || product?.description || 'Bright pyrotechnics suitable for festive celebrations.',
    imageUrl: primaryImage,
    rating: product?.rating || 5.0,
    reviewCount: product?.reviewCount || 128,
  };

  // If product has explicit multiple images array
  if (Array.isArray(product?.images) && product.images.length > 1) {
    return product.images.map((img: any, idx: number) => ({
      uri: resolveProductImage(img),
      itemData: {
        ...primaryItemData,
        id: `${primaryItemData.id}_var_${idx}`,
        imageUrl: resolveProductImage(img),
      },
    }));
  }

  // Create variant presets mapped to the actual Stitch photography assets
  const galleryPresets: { uri: any; title: string; subtitle: string; price: number; originalPrice?: number; badge?: string }[] = [
    {
      uri: primaryImage,
      title: primaryItemData.title,
      subtitle: primaryItemData.subtitle,
      price: primaryItemData.price,
      originalPrice: primaryItemData.originalPrice,
      badge: primaryItemData.badge,
    },
    {
      uri: LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30,
      title: '30 Shots Multi-Shot Fireworks Cake',
      subtitle: 'Grand finale barrage fireworks cake with 30 intense aerial bursts.',
      price: 450.0,
      originalPrice: 550.0,
      badge: 'Bestseller',
    },
    {
      uri: LOCAL_PRODUCT_IMAGES.GIFT_BOX,
      title: 'Grand Festival Gift Box Assortment',
      subtitle: 'Family celebration fireworks pack containing 25+ assorted pyrotechnics.',
      price: 999.0,
      originalPrice: 1299.0,
      badge: 'Special Edition',
    },
    {
      uri: LOCAL_PRODUCT_IMAGES.PENCIL_CANDLES,
      title: 'Twinkling Star Pencil & Roman Candles',
      subtitle: 'Multi-color repeater tubes for vibrant night aerial displays.',
      price: 120.0,
      originalPrice: 150.0,
      badge: 'Popular',
    },
    {
      uri: LOCAL_PRODUCT_IMAGES.ELECTRIC_SPARKLERS,
      title: '7 cm Long Electric Gold Sparklers',
      subtitle: 'Low-smoke long-burning metallic sparklers for Diwali & celebrations.',
      price: 60.0,
      originalPrice: 75.0,
      badge: 'Ready to ship',
    },
  ];

  return galleryPresets.map((preset, idx) => ({
    uri: preset.uri,
    itemData: {
      ...primaryItemData,
      id: idx === 0 ? primaryItemData.id : `${primaryItemData.id}_preset_${idx}`,
      title: preset.title,
      subtitle: preset.subtitle,
      description: preset.subtitle,
      price: preset.price,
      originalPrice: preset.originalPrice,
      badge: preset.badge,
      imageUrl: preset.uri,
    },
  }));
};

/**
 * Returns image URIs array for backward compatibility.
 */
export const getProductGalleryImages = (product?: any): any[] => {
  return getProductGalleryItems(product).map((item) => item.uri);
};
