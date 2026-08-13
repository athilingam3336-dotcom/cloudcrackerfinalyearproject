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
    return item;
  }

  // If passed a remote URL string directly
  if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://') || item.startsWith('data:image/'))) {
    return { uri: item };
  }

  // If object has imageUrl or images with valid remote URL or direct asset
  if (typeof item === 'object' && item !== null) {
    if (typeof item.imageUrl === 'string' && (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://') || item.imageUrl.startsWith('data:image/'))) {
      return { uri: item.imageUrl };
    }
    if (typeof item.imageUrl === 'number') {
      return item.imageUrl;
    }
    if (Array.isArray(item.images) && item.images.length > 0) {
      const firstImg = item.images[0];
      if (typeof firstImg === 'string' && (firstImg.startsWith('http://') || firstImg.startsWith('https://') || firstImg.startsWith('data:image/'))) {
        return { uri: firstImg };
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

/**
 * Returns a complete gallery of real local Stitch images for product detail screens.
 */
export const getProductGalleryImages = (product?: any): any[] => {
  const primary = resolveProductImage(product);
  return [
    primary,
    LOCAL_PRODUCT_IMAGES.MULTI_SHOT_30,
    LOCAL_PRODUCT_IMAGES.GIFT_BOX,
    LOCAL_PRODUCT_IMAGES.ROCKETS,
    LOCAL_PRODUCT_IMAGES.ELECTRIC_SPARKLERS,
  ];
};
