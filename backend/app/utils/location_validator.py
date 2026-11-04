"""
location_validator.py

Strict Tamil Nadu City & Pincode Validation and Profanity Filter.
Ensures:
1. Zero bad words, profanities, or abusive terms (English, Tamil, Tanglish) appear in orders or analytics.
2. Orders for delivery have valid Tamil Nadu city and matching 6-digit pincode (600000 - 643999).
3. Any mismatched or vulgar locations are rejected.
"""

import re
from typing import Optional, Tuple, Set, List, Dict, Any

PROHIBITED_WORDS: Set[str] = {
    # English Profanities & Vulgarities
    "fuck", "fucking", "fucked", "fucker", "fck", "f*ck", "motherfucker",
    "bitch", "bitches", "bastard", "bastards", "asshole", "assholes", "ass", "arse",
    "shit", "shite", "bullshit", "dick", "dicks", "pussy", "pussies", "cock", "cocks",
    "cunt", "cunts", "slut", "sluts", "whore", "whores", "porn", "porno", "sex", "sexy",
    "nude", "nudes", "naked", "penis", "vagina", "boobs", "tits", "nipple",
    "idiot", "stupid", "retard", "scam", "cheat", "fraud",

    # Tamil & Tanglish Vulgar Words & Slurs
    "thevidiya", "thevdia", "thevdiya", "thevadiya", "thevidya", "devadiya", "devidiya",
    "punda", "pundai", "pundamavan", "pundamavane", "pundamagan", "punde", "bunda",
    "ootha", "otha", "oothale", "othale", "othavane", "othan", "othaalu", "otta",
    "sunni", "junni", "zunni", "sunnii",
    "poolu", "pool", "polu",
    "mulla", "moola",
    "koothi", "kuthi", "koothie",
    "kena", "kenapunda", "kenathanam",
    "porambokku", "poramboke", "porambooku",
    "loosu", "loosukoodhi", "loosupunda", "losu",
    "thayoli", "theyeoli", "thaiyoli", "thayolli",
    "naaye", "naai", "nayi",
    "pottai", "potta",
    "gommale", "ammala", "oppane", "engale",
    "lavadakabaal", "lavada", "chutiya", "harami", "kameena", "gandu", "bhosdike",

    # Tamil Unicode Script
    "தேவிடியா", "புண்டை", "புண்ட", "ஓத்த", "சுண்ணி", "பூள", "கூதி", "கேண", "பொறம்போக்கு", "நாயே", "தாயோளி",

    # Spam / Gibberish markers
    "unknown", "undefined", "null", "test", "demo", "fake", "dummy", "asdf", "qwerty", "temp", "sample", "tester",
}

TN_LOCATION_DIRECTORY: List[Dict[str, Any]] = [
    {
        "canonical": "Sivakasi",
        "aliases": ["sivakasi", "shivakasi", "siva kasi", "thiruthangal", "vilampatti", "anaiyur"],
        "prefixes": ["626"],
        "exact_pincodes": ["626123", "626124", "626130", "626189", "626125", "626131"],
    },
    {
        "canonical": "Virudhunagar",
        "aliases": ["virudhunagar", "virudunagar", "vnr", "virudhunagar dist"],
        "prefixes": ["626"],
        "exact_pincodes": ["626001", "626002", "626003", "626005"],
    },
    {
        "canonical": "Rajapalayam",
        "aliases": ["rajapalayam", "rajapalaiyam", "seithur"],
        "prefixes": ["626"],
        "exact_pincodes": ["626117", "626108", "626121", "626139"],
    },
    {
        "canonical": "Srivilliputtur",
        "aliases": ["srivilliputtur", "srivilliputhur", "srivillipuththur", "svpr"],
        "prefixes": ["626"],
        "exact_pincodes": ["626125", "626126", "626137"],
    },
    {
        "canonical": "Aruppukkottai",
        "aliases": ["aruppukkottai", "aruppukottai", "apk"],
        "prefixes": ["626"],
        "exact_pincodes": ["626101", "626105", "626106"],
    },
    {
        "canonical": "Sattur",
        "aliases": ["sattur"],
        "prefixes": ["626"],
        "exact_pincodes": ["626203", "626205"],
    },
    {
        "canonical": "Madurai",
        "aliases": ["madurai", "madura", "sellur", "thirunagar", "villapuram", "goripalayam", "anna nagar madurai", "thiruparankundram", "alagar kovil", "otthakadai"],
        "prefixes": ["625"],
        "exact_pincodes": [
            "625001", "625002", "625003", "625004", "625005", "625006", "625007", "625008",
            "625009", "625010", "625011", "625012", "625014", "625016", "625017", "625020"
        ],
    },
    {
        "canonical": "Chennai",
        "aliases": ["chennai", "madras", "tambaram", "velachery", "anna nagar", "t nagar", "guindy", "chromepet", "adyar", "ambattur", "porur", "avadi", "mylapore", "egmore", "sholinganallur", "perambur", "vadapalani", "nungambakkam", "triplicane", "royapettah", "saidapet"],
        "prefixes": ["600", "601", "602", "603"],
    },
    {
        "canonical": "Coimbatore",
        "aliases": ["coimbatore", "kovai", "cbe", "peelamedu", "gandhipuram", "saravanampatti", "rs puram", "singanallur", "pollachi", "kuniyamuthur", "saibaba colony", "thudiyalur", "sulur"],
        "prefixes": ["641", "642"],
    },
    {
        "canonical": "Trichy",
        "aliases": ["trichy", "tiruchirappalli", "tiruchirapalli", "tiruchi", "srirangam", "thillai nagar", "ponmalai", "kattur", "kk nagar trichy", "woraiyur"],
        "prefixes": ["620", "621"],
    },
    {
        "canonical": "Salem",
        "aliases": ["salem", "attur", "mettur", "suramangalam", "hasthampatti", "ammapet salem", "edappadi", "sankari"],
        "prefixes": ["636", "637"],
    },
    {
        "canonical": "Tirunelveli",
        "aliases": ["tirunelveli", "nellai", "palayamkottai", "ambasamudram", "cheranmahadevi", "vannarpettai", "melapalayam"],
        "prefixes": ["627"],
    },
    {
        "canonical": "Erode",
        "aliases": ["erode", "perundurai", "bhavani", "gobichettipalayam", "gobi", "sathyamangalam", "chithode"],
        "prefixes": ["638"],
    },
    {
        "canonical": "Vellore",
        "aliases": ["vellore", "katpadi", "gudiyatham", "sathuvachari", "bagayam"],
        "prefixes": ["632"],
    },
    {
        "canonical": "Thoothukudi",
        "aliases": ["thoothukudi", "tuticorin", "tiruchendur", "muthialpuram"],
        "prefixes": ["628"],
    },
    {
        "canonical": "Kovilpatti",
        "aliases": ["kovilpatti", "kovilpatty", "kayathar"],
        "prefixes": ["628"],
        "exact_pincodes": ["628501", "628502", "628503", "628520"],
    },
    {
        "canonical": "Dindigul",
        "aliases": ["dindigul", "palani", "kodaikanal", "oddanchatram", "vedasandur", "natham"],
        "prefixes": ["624"],
    },
    {
        "canonical": "Thanjavur",
        "aliases": ["thanjavur", "tanjore", "kumbakonam", "papanasam", "pattukkottai"],
        "prefixes": ["613", "612", "614"],
    },
    {
        "canonical": "Tiruppur",
        "aliases": ["tiruppur", "tirupur", "avinashi", "palladam", "kangeyam", "dharapuram", "udumalaipettai"],
        "prefixes": ["641", "638"],
        "exact_pincodes": ["641601", "641602", "641603", "641604", "641605", "641606", "641607", "641608", "641652"],
    },
    {
        "canonical": "Kanchipuram",
        "aliases": ["kanchipuram", "kancheepuram", "kanchi", "sriperumbudur"],
        "prefixes": ["631", "603"],
    },
    {
        "canonical": "Nagercoil",
        "aliases": ["nagercoil", "kanyakumari", "kanniyakumari", "marthandam", "thuckalay", "colachel"],
        "prefixes": ["629"],
    },
    {
        "canonical": "Karur",
        "aliases": ["karur", "kulithalai", "aravakkurichi", "puliyur"],
        "prefixes": ["639"],
    },
    {
        "canonical": "Cuddalore",
        "aliases": ["cuddalore", "chidambaram", "neyveli", "panruti", "vriddhachalam"],
        "prefixes": ["607", "608"],
    },
    {
        "canonical": "Theni",
        "aliases": ["theni", "periyakulam", "bodinayakanur", "cumbum", "chinnalapatti", "andipatti"],
        "prefixes": ["625"],
    },
    {
        "canonical": "Ramanathapuram",
        "aliases": ["ramanathapuram", "ramnad", "rameswaram", "paramakudi", "kilakarai"],
        "prefixes": ["623"],
    },
    {
        "canonical": "Sivaganga",
        "aliases": ["sivaganga", "sivagangai", "karaikudi", "devakottai", "manamadurai"],
        "prefixes": ["630"],
    },
    {
        "canonical": "Namakkal",
        "aliases": ["namakkal", "tiruchengode", "rasipuram", "paramathi velur"],
        "prefixes": ["637"],
    },
    {
        "canonical": "Dharmapuri",
        "aliases": ["dharmapuri", "harur", "palacode", "pennagaram"],
        "prefixes": ["636", "635"],
    },
    {
        "canonical": "Hosur",
        "aliases": ["hosur", "krishnagiri", "bargur", "denkanikottai"],
        "prefixes": ["635"],
    },
    {
        "canonical": "Tiruvannamalai",
        "aliases": ["tiruvannamalai", "thiruvannamalai", "arani", "cheyyar", "polur"],
        "prefixes": ["606"],
    },
    {
        "canonical": "Villupuram",
        "aliases": ["villupuram", "viluppuram", "tindivanam", "kallakurichi"],
        "prefixes": ["605", "606"],
    },
    {
        "canonical": "Pudukkottai",
        "aliases": ["pudukkottai", "pudukottai", "aranthangi", "viralimalai"],
        "prefixes": ["622"],
    },
    {
        "canonical": "Perambalur",
        "aliases": ["perambalur"],
        "prefixes": ["621"],
    },
    {
        "canonical": "Ariyalur",
        "aliases": ["ariyalur", "jayankondam"],
        "prefixes": ["621"],
    },
    {
        "canonical": "Nagapattinam",
        "aliases": ["nagapattinam", "mayiladuthurai", "sirkazhi", "velankanni", "tarangambadi"],
        "prefixes": ["611", "609"],
    },
    {
        "canonical": "Nilgiris",
        "aliases": ["nilgiris", "ooty", "coonoor", "kotagiri", "gudalur", "udhagamandalam"],
        "prefixes": ["643"],
    },
    {
        "canonical": "Tenkasi",
        "aliases": ["tenkasi", "courtallam", "sankarankovil", "kadayanallur", "shenkottai", "surandai"],
        "prefixes": ["627"],
    },
    {
        "canonical": "Ranipet",
        "aliases": ["ranipet", "arcot", "arakkonam", "walajapet", "sholinghur"],
        "prefixes": ["632", "631"],
    },
    {
        "canonical": "Chengalpattu",
        "aliases": ["chengalpattu", "chengalpet", "mahabalipuram", "maduranthakam", "kelambakkam", "guduvanchery"],
        "prefixes": ["603"],
    },
    {
        "canonical": "Tiruvallur",
        "aliases": ["tiruvallur", "thiruvallur", "gummidipoondi", "ponneri", "tiruttani"],
        "prefixes": ["601", "602"],
    },
]


def contains_bad_words(text: Optional[str]) -> bool:
    """Returns True if the text contains vulgar, abusive, profanity or gibberish."""
    if not text or not isinstance(text, str):
        return False
    normalized = text.lower().strip()
    if not normalized:
        return False

    # 1. Direct substring check for spam/gibberish roots and abusive terms
    spam_substrings = ["asdf", "qwerty", "zxcv", "fuck", "punda", "ootha", "sunni", "thevidiya", "thayoli", "porambokku"]
    for sub in spam_substrings:
        if sub in normalized:
            return True

    # 2. Regex check for word boundaries for all prohibited words
    for bad in PROHIBITED_WORDS:
        pattern = r"(^|[^a-zA-Z0-9])" + re.escape(bad) + r"([^a-zA-Z0-9]|$)"
        if re.search(pattern, normalized):
            return True

    # 2. Token set check
    tokens = re.split(r"[^a-zA-Z0-9_\u0B80-\u0BFF]+", normalized)
    for tok in tokens:
        if tok in PROHIBITED_WORDS:
            return True

    # 3. Repeated consecutive characters check (4+ identical letters e.g. 'aaaa')
    if re.search(r"(.)\1{3,}", normalized):
        return True

    # 4. Pure consonant gibberish
    alpha_only = re.sub(r"[^a-z]", "", normalized)
    if len(alpha_only) >= 5 and not re.search(r"[aeiou]", alpha_only):
        return True

    return False


def validate_city_and_pincode(city: Optional[str], pincode: Optional[str]) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates that the city and pincode match a recognized Tamil Nadu hub.
    Returns (is_valid, canonical_city, reason).
    """
    if not city or not city.strip():
        return False, None, "City name is required."
    if not pincode or not pincode.strip():
        return False, None, "Pincode is required."

    if contains_bad_words(city):
        return False, None, "City contains inappropriate or offensive language."

    pin = re.sub(r"\D", "", pincode.strip())
    if len(pin) != 6 or not pin.startswith("6"):
        return False, None, "Pincode must be a 6-digit Tamil Nadu code starting with 6."

    pin_num = int(pin)
    if pin_num < 600001 or pin_num > 643999:
        return False, None, "Pincode is outside Tamil Nadu postal jurisdiction (600001 - 643999)."

    clean_city = re.sub(r"[^a-z\s]", " ", city.lower()).strip()
    clean_city = re.sub(r"\s+", " ", clean_city)

    if len(clean_city) < 3:
        return False, None, "City name is too short."

    pin_prefix3 = pin[:3]

    for loc in TN_LOCATION_DIRECTORY:
        matches_name = (
            loc["canonical"].lower() == clean_city or
            any(alias in clean_city or clean_city in alias for alias in loc["aliases"])
        )
        if matches_name:
            matches_prefix = pin_prefix3 in loc["prefixes"]
            matches_exact = "exact_pincodes" in loc and pin in loc["exact_pincodes"]
            if matches_prefix or matches_exact:
                return True, loc["canonical"], None
            else:
                return False, None, f"Pincode {pin} does not match city '{loc['canonical']}'."

    return False, None, f"City '{city}' is not a recognized Tamil Nadu town or city."


def extract_and_validate_location(
    shipping_address: Optional[str],
    explicit_city: Optional[str] = None,
    explicit_pincode: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Parses and cross-validates location from a raw address string or fields.
    Returns (is_valid, canonical_city).
    """
    if contains_bad_words(shipping_address) or contains_bad_words(explicit_city):
        return False, None

    if explicit_city and explicit_pincode:
        ok, canon, _ = validate_city_and_pincode(explicit_city, explicit_pincode)
        return ok, canon

    addr = (shipping_address or "").strip()
    if not addr:
        return False, None

    pin_match = re.search(r"\b(6\d{5})\b", addr)
    if not pin_match:
        return False, None
    found_pin = pin_match.group(1)

    city_cand = explicit_city.strip() if explicit_city else ""
    if not city_cand:
        m = re.search(r"([a-zA-Z\s]{3,30})\s*[-,\s]\s*6\d{5}", addr)
        if m and m.group(1):
            city_cand = m.group(1).strip()
        else:
            parts = [p.strip() for p in addr.split(",") if p.strip()]
            if len(parts) >= 2:
                city_cand = re.sub(r"\d+", "", parts[-2]).strip()
            elif parts:
                city_cand = re.sub(r"\d+", "", parts[0]).strip()

    ok, canon, _ = validate_city_and_pincode(city_cand, found_pin)
    return ok, canon
