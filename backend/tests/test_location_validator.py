"""
Unit tests for location_validator.py
Verifies:
1. Rejection of abusive/bad words (English, Tamil, Tanglish).
2. Proper detection of Tamil Nadu cities and matching 6-digit pincodes.
3. Rejection of mismatched pincodes, non-TN pincodes, and gibberish.
"""

import pytest
from app.utils.location_validator import (
    contains_bad_words,
    validate_city_and_pincode,
    extract_and_validate_location,
)


def test_contains_bad_words():
    # Bad words should be flagged
    assert contains_bad_words("fuck") is True
    assert contains_bad_words("punda") is True
    assert contains_bad_words("ootha") is True
    assert contains_bad_words("sunni") is True
    assert contains_bad_words("koothi") is True
    assert contains_bad_words("thevidiya") is True
    assert contains_bad_words("thayoli") is True
    assert contains_bad_words("porambokku") is True
    assert contains_bad_words("bastard") is True
    assert contains_bad_words("bitch") is True
    assert contains_bad_words("zzzzz") is True  # 4+ repeated
    assert contains_bad_words("asdfgh") is True  # 5+ consonant mashing without vowels
    assert contains_bad_words("fake") is True

    # Genuine text should not be flagged
    assert contains_bad_words("Sivakasi") is False
    assert contains_bad_words("Madurai") is False
    assert contains_bad_words("Chennai") is False
    assert contains_bad_words("Coimbatore") is False
    assert contains_bad_words("Virudhunagar") is False
    assert contains_bad_words("Trichy") is False
    assert contains_bad_words("12 Gandhi Road, Sivakasi") is False


def test_validate_city_and_pincode_valid():
    # Sivakasi
    ok, canon, _ = validate_city_and_pincode("Sivakasi", "626189")
    assert ok is True
    assert canon == "Sivakasi"

    ok, canon, _ = validate_city_and_pincode("siva kasi", "626123")
    assert ok is True
    assert canon == "Sivakasi"

    # Madurai
    ok, canon, _ = validate_city_and_pincode("Madurai", "625001")
    assert ok is True
    assert canon == "Madurai"

    # Chennai
    ok, canon, _ = validate_city_and_pincode("Chennai", "600001")
    assert ok is True
    assert canon == "Chennai"

    ok, canon, _ = validate_city_and_pincode("Tambaram", "600045")
    assert ok is True
    assert canon == "Chennai"

    # Coimbatore
    ok, canon, _ = validate_city_and_pincode("Coimbatore", "641001")
    assert ok is True
    assert canon == "Coimbatore"

    # Virudhunagar
    ok, canon, _ = validate_city_and_pincode("Virudhunagar", "626001")
    assert ok is True
    assert canon == "Virudhunagar"

    # Trichy
    ok, canon, _ = validate_city_and_pincode("Trichy", "620001")
    assert ok is True
    assert canon == "Trichy"


def test_validate_city_and_pincode_mismatch_and_bad_words():
    # Mismatched pincode (Madurai with Chennai pincode)
    ok, canon, reason = validate_city_and_pincode("Madurai", "600001")
    assert ok is False
    assert canon is None
    assert "does not match" in reason

    # Mismatched pincode (Sivakasi with Coimbatore pincode)
    ok, canon, reason = validate_city_and_pincode("Sivakasi", "641001")
    assert ok is False
    assert canon is None

    # Bad words as city name
    ok, canon, reason = validate_city_and_pincode("punda", "626189")
    assert ok is False
    assert canon is None
    assert "inappropriate" in reason.lower()

    ok, canon, reason = validate_city_and_pincode("fuck", "625001")
    assert ok is False
    assert canon is None

    # Out of state pincode (Delhi pincode 110001)
    ok, canon, reason = validate_city_and_pincode("Sivakasi", "110001")
    assert ok is False
    assert canon is None

    # Invalid length pincode
    ok, canon, reason = validate_city_and_pincode("Sivakasi", "626")
    assert ok is False
    assert canon is None


def test_extract_and_validate_location():
    # Full address format from checkout
    addr1 = "John Doe (john@gmail.com), 45 Cross St, Sivakasi - 626189 (Phone: 9876543210)"
    ok, canon = extract_and_validate_location(addr1)
    assert ok is True
    assert canon == "Sivakasi"

    # Full address with Madurai
    addr2 = "Mani (mani@gmail.com), 10 North Masi Street, Madurai - 625001 (Phone: 9876543210)"
    ok, canon = extract_and_validate_location(addr2)
    assert ok is True
    assert canon == "Madurai"

    # Address with bad words
    addr_bad = "Bad User, Street 1, punda - 626189"
    ok, canon = extract_and_validate_location(addr_bad)
    assert ok is False
    assert canon is None

    # Address with mismatched pincode
    addr_mismatch = "Customer, 12 Park Ave, Chennai - 626189"
    ok, canon = extract_and_validate_location(addr_mismatch)
    assert ok is False
    assert canon is None

