"""
PII Anonymization Utility

Removes or anonymizes personally identifiable information (PII)
before sending data to LLM providers.
"""

import re
from typing import Dict, Any
from app.models.emergency_context import EmergencyContext
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


# Regex patterns for PII detection
PHONE_PATTERN = re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b")
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
SSN_PATTERN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
CREDIT_CARD_PATTERN = re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b")
URL_PATTERN = re.compile(r"https?://[^\s]+")

# Common name patterns (simple heuristic)
NAME_TITLES = ["mr", "mrs", "ms", "dr", "prof", "miss"]


def anonymize_text(text: str) -> str:
    """
    Anonymize PII in text

    Args:
        text: Input text potentially containing PII

    Returns:
        Anonymized text with PII replaced by placeholders
    """
    if not text:
        return text

    # Replace phone numbers
    text = PHONE_PATTERN.sub("[PHONE]", text)

    # Replace email addresses
    text = EMAIL_PATTERN.sub("[EMAIL]", text)

    # Replace SSN
    text = SSN_PATTERN.sub("[SSN]", text)

    # Replace credit card numbers
    text = CREDIT_CARD_PATTERN.sub("[CREDIT_CARD]", text)

    # Replace URLs
    text = URL_PATTERN.sub("[URL]", text)

    # Replace specific names with titles
    for title in NAME_TITLES:
        # Match "Mr. John Doe" or "Dr Smith" patterns
        pattern = re.compile(
            rf"\b{title}\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", re.IGNORECASE
        )
        text = pattern.sub(f"[{title.upper()}]", text)

    # Replace street addresses (basic pattern)
    # Matches patterns like "123 Main Street" or "456 Oak Ave"
    address_pattern = re.compile(r"\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b", re.IGNORECASE)
    text = address_pattern.sub("[ADDRESS]", text)

    return text


def anonymize_emergency_context(context: EmergencyContext) -> EmergencyContext:
    """
    Anonymize an emergency context object

    Args:
        context: Emergency context with potential PII

    Returns:
        Anonymized emergency context
    """
    # Create a copy to avoid modifying original
    anonymized = context.model_copy(deep=True)

    # Anonymize description
    anonymized.description = anonymize_text(context.description)

    # Anonymize additional info
    if context.additional_info:
        anonymized.additional_info = anonymize_text(context.additional_info)

    # Anonymize location (keep city/country, remove exact address)
    if context.location:
        if context.location.address:
            # Keep only city and state from address if present
            anonymized.location.address = "[ADDRESS]"
        # Remove exact coordinates for privacy
        anonymized.location.latitude = None
        anonymized.location.longitude = None

    # Medical profile is already anonymized in the model
    # (age ranges instead of exact age, no names, etc.)

    logger.info(f"Anonymized emergency context: {context.emergency_id}")

    return anonymized


def detect_pii(text: str) -> Dict[str, Any]:
    """
    Detect PII in text without anonymizing

    Args:
        text: Input text to analyze

    Returns:
        Dictionary with detected PII types and counts
    """
    pii_detected = {
        "has_pii": False,
        "phone_numbers": 0,
        "emails": 0,
        "ssn": 0,
        "credit_cards": 0,
        "urls": 0,
        "addresses": 0,
    }

    if not text:
        return pii_detected

    pii_detected["phone_numbers"] = len(PHONE_PATTERN.findall(text))
    pii_detected["emails"] = len(EMAIL_PATTERN.findall(text))
    pii_detected["ssn"] = len(SSN_PATTERN.findall(text))
    pii_detected["credit_cards"] = len(CREDIT_CARD_PATTERN.findall(text))
    pii_detected["urls"] = len(URL_PATTERN.findall(text))

    # Check for addresses
    address_pattern = re.compile(r"\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(Street|St|Avenue|Ave|Road|Rd)\b", re.IGNORECASE)
    pii_detected["addresses"] = len(address_pattern.findall(text))

    # Set has_pii flag
    pii_detected["has_pii"] = any(
        v > 0 for k, v in pii_detected.items() if k != "has_pii"
    )

    return pii_detected
