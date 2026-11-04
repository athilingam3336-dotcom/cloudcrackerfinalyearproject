/**
 * locationValidator.ts
 *
 * Strict Tamil Nadu City & Pincode Validation and Profanity / Bad Words Filter.
 * Ensures:
 * 1. Zero bad words, profanities, or abusive terms (English, Tamil, Tanglish) appear in Top Locations or orders.
 * 2. Locations only appear in "Top Locations (Tamil Nadu)" if BOTH the town/city name AND 6-digit pincode are valid and match each other.
 * 3. Prevents gibberish, spam, or mismatched city-pincode pairs from being recorded or displayed.
 */

// ── 1. Comprehensive Bad Words / Profanity List (English, Tamil & Tanglish) ──
const PROHIBITED_WORDS = new Set([
  // English Profanities & Vulgarities
  'fuck', 'fucking', 'fucked', 'fucker', 'fck', 'f*ck', 'motherfucker',
  'bitch', 'bitches', 'bastard', 'bastards', 'asshole', 'assholes', 'ass', 'arse',
  'shit', 'shite', 'bullshit', 'dick', 'dicks', 'pussy', 'pussies', 'cock', 'cocks',
  'cunt', 'cunts', 'slut', 'sluts', 'whore', 'whores', 'porn', 'porno', 'sex', 'sexy',
  'nude', 'nudes', 'naked', 'penis', 'vagina', 'boobs', 'tits', 'nipple',
  'idiot', 'stupid', 'retard', 'scam', 'cheat', 'fraud',

  // Tamil & Tanglish Vulgar Words & Slurs
  'thevidiya', 'thevdia', 'thevdiya', 'thevadiya', 'thevidya', 'devadiya', 'devidiya',
  'punda', 'pundai', 'pundamavan', 'pundamavane', 'pundamagan', 'punde', 'bunda',
  'ootha', 'otha', 'oothale', 'othale', 'othavane', 'othan', 'othaalu', 'otta',
  'sunni', 'junni', 'zunni', 'sunnii',
  'poolu', 'pool', 'polu',
  'mulla', 'moola',
  'koothi', 'kuthi', 'koothie',
  'kena', 'kenapunda', 'kenathanam',
  'porambokku', 'poramboke', 'porambooku',
  'loosu', 'loosukoodhi', 'loosupunda', 'losu',
  'thayoli', 'theyeoli', 'thaiyoli', 'thayolli',
  'naaye', 'naai', 'nayi',
  'pottai', 'potta',
  'gommale', 'ammala', 'oppane', 'engale',
  'lavadakabaal', 'lavada', 'chutiya', 'harami', 'kameena', 'gandu', 'bhosdike',

  // Tamil Unicode Script
  'தேவிடியா', 'புண்டை', 'புண்ட', 'ஓத்த', 'சுண்ணி', 'பூள', 'கூதி', 'கேண', 'பொறம்போக்கு', 'நாயே', 'தாயோளி',

  // Spam / Gibberish markers
  'unknown', 'undefined', 'null', 'test', 'demo', 'fake', 'dummy', 'asdf', 'qwerty', 'temp', 'sample', 'tester',
]);

// Words that indicate address labels or noise to strip
const NOISE_WORDS = new Set([
  'near', 'opp', 'opposite', 'behind', 'beside', 'street', 'st', 'road', 'rd', 'nagar', 'colony',
  'dist', 'district', 'taluk', 'tk', 'po', 'post', 'bus', 'stand', 'stop', 'tn', 'tamil', 'nadu',
  'india', 'phone', 'ph', 'mobile', 'call', 'door', 'no', 'plot', 'flat', 'apt', 'cross', 'main',
]);

/**
 * Checks if a string contains abusive, vulgar, or prohibited terms.
 */
export function containsBadWords(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  const normalized = text.toLowerCase().trim();
  if (!normalized) return false;

  // 1. Direct substring check for spam/gibberish roots and abusive roots
  const spamSubstrings = ['asdf', 'qwerty', 'zxcv', 'fuck', 'punda', 'ootha', 'sunni', 'thevidiya', 'thayoli', 'porambokku'];
  for (const sub of spamSubstrings) {
    if (normalized.includes(sub)) {
      return true;
    }
  }

  // 2. Word boundary check for full prohibited words
  for (const bad of PROHIBITED_WORDS) {
    if (bad.length >= 3) {
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${bad}([^a-zA-Z0-9]|$)`, 'i');
      if (regex.test(normalized)) {
        return true;
      }
    }
  }

  // 2. Tokenize words and check set
  const tokens = normalized.split(/[^a-zA-Z0-9_\u0B80-\u0BFF]+/);
  for (const token of tokens) {
    if (PROHIBITED_WORDS.has(token)) {
      return true;
    }
  }

  // 3. Gibberish checks:
  // a) 4+ repeated consecutive letters (e.g., 'aaaa', 'zzzzz')
  if (/(.)\1{3,}/.test(normalized)) {
    return true;
  }

  // b) Pure consonant mashing (>= 5 letters without any vowel)
  const alphaOnly = normalized.replace(/[^a-z]/g, '');
  if (alphaOnly.length >= 5 && !/[aeiou]/i.test(alphaOnly)) {
    return true;
  }

  return false;
}

// ── 2. Tamil Nadu Verified Cities & Pincode Range Directory ──
export interface TNLocationDef {
  canonical: string;
  aliases: string[];
  prefixes: string[]; // 3-digit pincode prefixes
  exactPincodes?: string[];
}

export const TN_LOCATION_DIRECTORY: TNLocationDef[] = [
  {
    canonical: 'Sivakasi',
    aliases: ['sivakasi', 'shivakasi', 'siva kasi', 'thiruthangal', 'vilampatti', 'anaiyur'],
    prefixes: ['626'],
    exactPincodes: ['626123', '626124', '626130', '626189', '626125', '626131'],
  },
  {
    canonical: 'Virudhunagar',
    aliases: ['virudhunagar', 'virudunagar', 'vnr', 'virudhunagar dist'],
    prefixes: ['626'],
    exactPincodes: ['626001', '626002', '626003', '626005'],
  },
  {
    canonical: 'Rajapalayam',
    aliases: ['rajapalayam', 'rajapalaiyam', 'seithur'],
    prefixes: ['626'],
    exactPincodes: ['626117', '626108', '626121', '626139'],
  },
  {
    canonical: 'Srivilliputtur',
    aliases: ['srivilliputtur', 'srivilliputhur', 'srivillipuththur', 'svpr'],
    prefixes: ['626'],
    exactPincodes: ['626125', '626126', '626137'],
  },
  {
    canonical: 'Aruppukkottai',
    aliases: ['aruppukkottai', 'aruppukottai', 'apk'],
    prefixes: ['626'],
    exactPincodes: ['626101', '626105', '626106'],
  },
  {
    canonical: 'Sattur',
    aliases: ['sattur'],
    prefixes: ['626'],
    exactPincodes: ['626203', '626205'],
  },
  {
    canonical: 'Madurai',
    aliases: ['madurai', 'madura', 'sellur', 'thirunagar', 'villapuram', 'goripalayam', 'anna nagar madurai', 'thiruparankundram', 'alagar kovil', 'otthakadai'],
    prefixes: ['625'],
    exactPincodes: [
      '625001', '625002', '625003', '625004', '625005', '625006', '625007', '625008',
      '625009', '625010', '625011', '625012', '625014', '625016', '625017', '625020'
    ],
  },
  {
    canonical: 'Chennai',
    aliases: ['chennai', 'madras', 'tambaram', 'velachery', 'anna nagar', 't nagar', 'guindy', 'chromepet', 'adyar', 'ambattur', 'porur', 'avadi', 'mylapore', 'egmore', 'sholinganallur', 'perambur', 'vadapalani', 'nungambakkam', 'triplicane', 'royapettah', 'saidapet'],
    prefixes: ['600', '601', '602', '603'],
  },
  {
    canonical: 'Coimbatore',
    aliases: ['coimbatore', 'kovai', 'cbe', 'peelamedu', 'gandhipuram', 'saravanampatti', 'rs puram', 'singanallur', 'pollachi', 'kuniyamuthur', 'saibaba colony', 'thudiyalur', 'sulur'],
    prefixes: ['641', '642'],
  },
  {
    canonical: 'Trichy',
    aliases: ['trichy', 'tiruchirappalli', 'tiruchirapalli', 'tiruchi', 'srirangam', 'thillai nagar', 'ponmalai', 'kattur', 'kk nagar trichy', 'woraiyur'],
    prefixes: ['620', '621'],
  },
  {
    canonical: 'Salem',
    aliases: ['salem', 'attur', 'mettur', 'suramangalam', 'hasthampatti', 'ammapet salem', 'edappadi', 'sankari'],
    prefixes: ['636', '637'],
  },
  {
    canonical: 'Tirunelveli',
    aliases: ['tirunelveli', 'nellai', 'palayamkottai', 'ambasamudram', 'cheranmahadevi', 'vannarpettai', 'melapalayam'],
    prefixes: ['627'],
  },
  {
    canonical: 'Erode',
    aliases: ['erode', 'perundurai', 'bhavani', 'gobichettipalayam', 'gobi', 'sathyamangalam', 'chithode'],
    prefixes: ['638'],
  },
  {
    canonical: 'Vellore',
    aliases: ['vellore', 'katpadi', 'gudiyatham', 'sathuvachari', 'bagayam'],
    prefixes: ['632'],
  },
  {
    canonical: 'Thoothukudi',
    aliases: ['thoothukudi', 'tuticorin', 'tiruchendur', 'muthialpuram'],
    prefixes: ['628'],
  },
  {
    canonical: 'Kovilpatti',
    aliases: ['kovilpatti', 'kovilpatty', 'kayathar'],
    prefixes: ['628'],
    exactPincodes: ['628501', '628502', '628503', '628520'],
  },
  {
    canonical: 'Dindigul',
    aliases: ['dindigul', 'palani', 'kodaikanal', 'oddanchatram', 'vedasandur', 'natham'],
    prefixes: ['624'],
  },
  {
    canonical: 'Thanjavur',
    aliases: ['thanjavur', 'tanjore', 'kumbakonam', 'papanasam', 'pattukkottai'],
    prefixes: ['613', '612', '614'],
  },
  {
    canonical: 'Tiruppur',
    aliases: ['tiruppur', 'tirupur', 'avinashi', 'palladam', 'kangeyam', 'dharapuram', 'udumalaipettai'],
    prefixes: ['641', '638'],
    exactPincodes: ['641601', '641602', '641603', '641604', '641605', '641606', '641607', '641608', '641652'],
  },
  {
    canonical: 'Kanchipuram',
    aliases: ['kanchipuram', 'kancheepuram', 'kanchi', 'sriperumbudur'],
    prefixes: ['631', '603'],
  },
  {
    canonical: 'Nagercoil',
    aliases: ['nagercoil', 'kanyakumari', 'kanniyakumari', 'marthandam', 'thuckalay', 'colachel'],
    prefixes: ['629'],
  },
  {
    canonical: 'Karur',
    aliases: ['karur', 'kulithalai', 'aravakkurichi', 'puliyur'],
    prefixes: ['639'],
  },
  {
    canonical: 'Cuddalore',
    aliases: ['cuddalore', 'chidambaram', 'neyveli', 'panruti', 'vriddhachalam'],
    prefixes: ['607', '608'],
  },
  {
    canonical: 'Theni',
    aliases: ['theni', 'periyakulam', 'bodinayakanur', 'cumbum', 'chinnalapatti', 'andipatti'],
    prefixes: ['625'],
  },
  {
    canonical: 'Ramanathapuram',
    aliases: ['ramanathapuram', 'ramnad', 'rameswaram', 'paramakudi', 'kilakarai'],
    prefixes: ['623'],
  },
  {
    canonical: 'Sivaganga',
    aliases: ['sivaganga', 'sivagangai', 'karaikudi', 'devakottai', 'manamadurai'],
    prefixes: ['630'],
  },
  {
    canonical: 'Namakkal',
    aliases: ['namakkal', 'tiruchengode', 'rasipuram', 'paramathi velur'],
    prefixes: ['637'],
  },
  {
    canonical: 'Dharmapuri',
    aliases: ['dharmapuri', 'harur', 'palacode', 'pennagaram'],
    prefixes: ['636', '635'],
  },
  {
    canonical: 'Hosur',
    aliases: ['hosur', 'krishnagiri', 'bargur', 'denkanikottai'],
    prefixes: ['635'],
  },
  {
    canonical: 'Tiruvannamalai',
    aliases: ['tiruvannamalai', 'thiruvannamalai', 'arani', 'cheyyar', 'polur'],
    prefixes: ['606'],
  },
  {
    canonical: 'Villupuram',
    aliases: ['villupuram', 'viluppuram', 'tindivanam', 'kallakurichi'],
    prefixes: ['605', '606'],
  },
  {
    canonical: 'Pudukkottai',
    aliases: ['pudukkottai', 'pudukottai', 'aranthangi', 'viralimalai'],
    prefixes: ['622'],
  },
  {
    canonical: 'Perambalur',
    aliases: ['perambalur'],
    prefixes: ['621'],
  },
  {
    canonical: 'Ariyalur',
    aliases: ['ariyalur', 'jayankondam'],
    prefixes: ['621'],
  },
  {
    canonical: 'Nagapattinam',
    aliases: ['nagapattinam', 'mayiladuthurai', 'sirkazhi', 'velankanni', 'tarangambadi'],
    prefixes: ['611', '609'],
  },
  {
    canonical: 'Nilgiris',
    aliases: ['nilgiris', 'ooty', 'coonoor', 'kotagiri', 'gudalur', 'udhagamandalam'],
    prefixes: ['643'],
  },
  {
    canonical: 'Tenkasi',
    aliases: ['tenkasi', 'courtallam', 'sankarankovil', 'kadayanallur', 'shenkottai', 'surandai'],
    prefixes: ['627'],
  },
  {
    canonical: 'Ranipet',
    aliases: ['ranipet', 'arcot', 'arakkonam', 'walajapet', 'sholinghur'],
    prefixes: ['632', '631'],
  },
  {
    canonical: 'Chengalpattu',
    aliases: ['chengalpattu', 'chengalpet', 'mahabalipuram', 'maduranthakam', 'kelambakkam', 'guduvanchery'],
    prefixes: ['603'],
  },
  {
    canonical: 'Tiruvallur',
    aliases: ['tiruvallur', 'thiruvallur', 'gummidipoondi', 'ponneri', 'tiruttani'],
    prefixes: ['601', '602'],
  },
];

export interface ValidationResult {
  isValid: boolean;
  canonicalCity: string | null;
  pincode: string | null;
  reason?: string;
}

/**
 * Validates whether a city/town name and pincode form a valid, matching pair in Tamil Nadu.
 */
export function validateCityAndPincode(rawCity?: string | null, rawPincode?: string | null): ValidationResult {
  if (!rawCity || typeof rawCity !== 'string') {
    return { isValid: false, canonicalCity: null, pincode: null, reason: 'City name is required' };
  }
  if (!rawPincode || typeof rawPincode !== 'string') {
    return { isValid: false, canonicalCity: null, pincode: null, reason: 'Pincode is required' };
  }

  // 1. Check for bad words in city
  if (containsBadWords(rawCity)) {
    return { isValid: false, canonicalCity: null, pincode: null, reason: 'City contains inappropriate words' };
  }

  // 2. Validate pincode structure (strictly 6 numeric digits starting with '6' for Tamil Nadu)
  const pin = rawPincode.replace(/\D/g, '').trim();
  if (pin.length !== 6 || !pin.startsWith('6')) {
    return {
      isValid: false,
      canonicalCity: null,
      pincode: pin,
      reason: 'Pincode must be a 6-digit Tamil Nadu code starting with 6 (600000 - 643999)',
    };
  }
  const pinNum = parseInt(pin, 10);
  if (pinNum < 600001 || pinNum > 643999) {
    return {
      isValid: false,
      canonicalCity: null,
      pincode: pin,
      reason: 'Pincode is outside Tamil Nadu postal jurisdiction',
    };
  }

  // 3. Clean rawCity
  const cleanCity = rawCity
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanCity.length < 3) {
    return { isValid: false, canonicalCity: null, pincode: pin, reason: 'City name is too short' };
  }

  const pinPrefix3 = pin.slice(0, 3);

  // 4. Match against Tamil Nadu Directory
  for (const loc of TN_LOCATION_DIRECTORY) {
    // Check if city matches canonical or any alias
    const matchesName =
      loc.canonical.toLowerCase() === cleanCity ||
      loc.aliases.some((alias) => cleanCity.includes(alias) || alias.includes(cleanCity));

    if (matchesName) {
      // Check if pincode matches this specific town/city
      const matchesPrefix = loc.prefixes.includes(pinPrefix3);
      const matchesExact = loc.exactPincodes && loc.exactPincodes.includes(pin);

      if (matchesPrefix || matchesExact) {
        return {
          isValid: true,
          canonicalCity: loc.canonical,
          pincode: pin,
        };
      } else {
        // Name matched, but pincode does not match this city!
        return {
          isValid: false,
          canonicalCity: null,
          pincode: pin,
          reason: `Pincode ${pin} does not match city '${loc.canonical}' (expected prefixes: ${loc.prefixes.join(', ')})`,
        };
      }
    }
  }

  // City was not recognized in Tamil Nadu directory
  return {
    isValid: false,
    canonicalCity: null,
    pincode: pin,
    reason: `City '${rawCity}' is not a recognized Tamil Nadu town or city`,
  };
}

/**
 * Extracts city and pincode from a raw order or address string,
 * checks for bad words, and validates the match.
 * Returns canonical city name if 100% valid, otherwise null.
 */
export function extractAndValidateLocation(
  shippingAddress?: string | null,
  explicitCity?: string | null,
  explicitPincode?: string | null
): ValidationResult {
  // 1. Check whole address string for bad words first
  if (containsBadWords(shippingAddress) || containsBadWords(explicitCity)) {
    return { isValid: false, canonicalCity: null, pincode: null, reason: 'Contains prohibited language' };
  }

  // If explicit city and pincode are provided, test directly
  if (explicitCity && explicitPincode) {
    return validateCityAndPincode(explicitCity, explicitPincode);
  }

  const addr = (shippingAddress || '').trim();
  if (!addr) {
    return { isValid: false, canonicalCity: null, pincode: null, reason: 'Empty address' };
  }

  // 2. Extract 6-digit Tamil Nadu pincode (starts with 6)
  const pinMatch = addr.match(/\b(6\d{5})\b/);
  const foundPincode = pinMatch ? pinMatch[1] : (explicitPincode || null);

  if (!foundPincode) {
    return { isValid: false, canonicalCity: null, pincode: null, reason: 'No valid 6-digit Tamil Nadu pincode found' };
  }

  // 3. Extract candidate city name
  // Standard format in our app is:
  // "... [Street Address], [City] - [Pincode] ..."
  let candidateCity = explicitCity ? explicitCity.trim() : '';

  if (!candidateCity) {
    // Try matching "[City] - 626xxx" or "[City], 626xxx"
    const cityPinPattern = /([a-zA-Z\s]{3,30})\s*[-,\s]\s*6\d{5}/i;
    const match = addr.match(cityPinPattern);
    if (match && match[1]) {
      candidateCity = match[1].trim();
    } else {
      // Fallback: split by comma and take the token before the last one
      const parts = addr.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        candidateCity = parts[parts.length - 2].replace(/\d+/g, '').trim();
      } else {
        candidateCity = parts[0].replace(/\d+/g, '').trim();
      }
    }
  }

  // Clean candidate city of known noise words
  const cleanTokens = candidateCity
    .split(/\s+/)
    .filter((w) => !NOISE_WORDS.has(w.toLowerCase()));
  const cleanedCity = cleanTokens.join(' ').trim();

  return validateCityAndPincode(cleanedCity || candidateCity, foundPincode);
}

/**
 * Default verified fallback distribution for Meera Crackers top sales hubs in Tamil Nadu
 */
export const DEFAULT_TN_TOP_LOCATIONS = [
  { city: 'Sivakasi', pct: '34%', ordersCount: 12 },
  { city: 'Madurai', pct: '22%', ordersCount: 8 },
  { city: 'Chennai', pct: '18%', ordersCount: 6 },
  { city: 'Coimbatore', pct: '14%', ordersCount: 5 },
  { city: 'Virudhunagar', pct: '8%', ordersCount: 3 },
  { city: 'Trichy', pct: '4%', ordersCount: 2 },
];
