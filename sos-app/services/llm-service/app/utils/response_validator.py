"""
LLM Response Validation Utility

Validates LLM responses for safety, accuracy, and appropriate disclaimers
"""

import re
from typing import List, Optional
from pydantic import BaseModel
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class ResponseValidationResult(BaseModel):
    """Result of response validation"""

    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    severity: str = "info"  # info, warning, error


# Harmful content patterns
HARMFUL_PATTERNS = [
    r"(?i)\b(kill|suicide|self-harm|overdose)\b",
    r"(?i)\b(ignore medical advice|don't call|skip)\s+(doctor|hospital|911|emergency)",
    r"(?i)\bguaranteed?\s+(cure|recovery|success)\b",
]

# Required disclaimer keywords
REQUIRED_DISCLAIMER_KEYWORDS = [
    "not a substitute",
    "professional medical",
    "emergency services",
    "911",
]


def validate_llm_response(
    response_text: str,
    response_type: str = "assessment",
    require_disclaimer: bool = True,
) -> ResponseValidationResult:
    """
    Validate LLM response for safety and appropriateness

    Args:
        response_text: The LLM-generated response
        response_type: Type of response (assessment, first_aid)
        require_disclaimer: Whether to require medical disclaimer

    Returns:
        Validation result with errors and warnings
    """
    result = ResponseValidationResult(is_valid=True)

    if not response_text or len(response_text.strip()) == 0:
        result.is_valid = False
        result.errors.append("Response is empty")
        result.severity = "error"
        return result

    # Check for harmful content
    for pattern in HARMFUL_PATTERNS:
        if re.search(pattern, response_text):
            result.errors.append(f"Potentially harmful content detected: {pattern}")
            result.is_valid = False
            result.severity = "error"
            logger.warning(f"Harmful content detected in LLM response: {pattern}")

    # Check for required disclaimer (if applicable)
    if require_disclaimer:
        has_disclaimer = any(
            keyword.lower() in response_text.lower()
            for keyword in REQUIRED_DISCLAIMER_KEYWORDS[:2]  # At least 2 keywords
        )
        if not has_disclaimer:
            result.warnings.append(
                "Response should include appropriate medical disclaimer"
            )
            result.severity = "warning" if result.severity != "error" else "error"

    # Check response length
    if len(response_text) < 50:
        result.warnings.append("Response may be too brief")
    elif len(response_text) > 5000:
        result.warnings.append("Response may be too verbose")

    # Check for medical misinformation markers
    misinformation_patterns = [
        r"(?i)\balways\s+(safe|works|effective)\b",
        r"(?i)\bnever\s+(dangerous|harmful|risky)\b",
        r"(?i)\b100%\s+(safe|effective|certain)\b",
    ]

    for pattern in misinformation_patterns:
        if re.search(pattern, response_text):
            result.warnings.append(f"Overly definitive language detected: {pattern}")

    # Check for appropriate call-to-action for emergencies
    if response_type == "assessment":
        if re.search(r"(?i)\b(severe|critical|life-threatening|serious)\b", response_text):
            if not re.search(r"(?i)\b(call|contact|emergency|911|ambulance)\b", response_text):
                result.warnings.append(
                    "Severe emergency detected but no call to action for emergency services"
                )

    logger.info(
        f"Response validation complete: valid={result.is_valid}, "
        f"errors={len(result.errors)}, warnings={len(result.warnings)}"
    )

    return result


def sanitize_response(response_text: str) -> str:
    """
    Sanitize LLM response by removing potentially problematic content

    Args:
        response_text: Raw LLM response

    Returns:
        Sanitized response
    """
    # Remove any HTML/XML tags
    response_text = re.sub(r"<[^>]+>", "", response_text)

    # Remove excessive whitespace
    response_text = re.sub(r"\s+", " ", response_text).strip()

    # Remove any personal data patterns that might have slipped through
    response_text = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED]", response_text)  # SSN
    response_text = re.sub(
        r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "[REDACTED]", response_text
    )  # Phone

    return response_text


def ensure_disclaimer(response_text: str, disclaimer: str) -> str:
    """
    Ensure disclaimer is present in response

    Args:
        response_text: Original response
        disclaimer: Required disclaimer text

    Returns:
        Response with disclaimer appended if not present
    """
    # Check if any form of disclaimer is already present
    disclaimer_keywords = ["disclaimer", "not a substitute", "professional medical"]

    has_disclaimer = any(
        keyword.lower() in response_text.lower() for keyword in disclaimer_keywords
    )

    if not has_disclaimer:
        # Append disclaimer
        return f"{response_text}\n\n**DISCLAIMER**: {disclaimer}"

    return response_text
