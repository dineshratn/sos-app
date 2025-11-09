"""
Unit tests for LLM Service
"""

import pytest
from app.models.emergency_context import (
    EmergencyContext,
    EmergencyType,
    Location,
    MedicalProfile,
)
from app.utils.anonymizer import anonymize_text, anonymize_emergency_context, detect_pii
from app.utils.response_validator import validate_llm_response
from app.services.fallback_service import FallbackService


class TestAnonymizer:
    """Test PII anonymization"""

    def test_anonymize_phone_number(self):
        text = "Call me at 555-123-4567"
        anonymized = anonymize_text(text)
        assert "555-123-4567" not in anonymized
        assert "[PHONE]" in anonymized

    def test_anonymize_email(self):
        text = "Email me at john.doe@example.com"
        anonymized = anonymize_text(text)
        assert "john.doe@example.com" not in anonymized
        assert "[EMAIL]" in anonymized

    def test_anonymize_address(self):
        text = "I live at 123 Main Street"
        anonymized = anonymize_text(text)
        assert "[ADDRESS]" in anonymized

    def test_detect_pii(self):
        text = "Call 555-1234 or email test@example.com"
        pii_info = detect_pii(text)
        assert pii_info["has_pii"] is True
        assert pii_info["phone_numbers"] > 0
        assert pii_info["emails"] > 0

    def test_anonymize_emergency_context(self):
        context = EmergencyContext(
            emergency_id="123",
            emergency_type=EmergencyType.MEDICAL,
            description="John Doe fell at 123 Main Street. Call 555-1234.",
            location=Location(
                latitude=37.7749,
                longitude=-122.4194,
                address="123 Main Street",
                city="San Francisco",
            ),
        )

        anonymized = anonymize_emergency_context(context)

        # Phone should be anonymized
        assert "[PHONE]" in anonymized.description or "555-1234" not in anonymized.description

        # Location should be anonymized
        assert anonymized.location.latitude is None
        assert anonymized.location.longitude is None
        assert anonymized.location.address == "[ADDRESS]"

        # City should be preserved
        assert anonymized.location.city == "San Francisco"


class TestResponseValidator:
    """Test LLM response validation"""

    def test_valid_response(self):
        response = """
        Severity: HIGH
        This is a medical emergency requiring professional help.

        Recommendations:
        - Call 911 immediately
        - Keep patient calm

        This is not a substitute for professional medical advice.
        Always call emergency services for serious situations.
        """
        result = validate_llm_response(response)
        assert result.is_valid is True

    def test_empty_response(self):
        response = ""
        result = validate_llm_response(response)
        assert result.is_valid is False
        assert "empty" in result.errors[0].lower()

    def test_harmful_content(self):
        response = "You should ignore medical advice and just wait it out."
        result = validate_llm_response(response)
        assert result.is_valid is False
        assert len(result.errors) > 0

    def test_missing_disclaimer(self):
        response = "This is severe. Do something immediately."
        result = validate_llm_response(response, require_disclaimer=True)
        # Should have warning about missing disclaimer
        assert len(result.warnings) > 0


class TestFallbackService:
    """Test fallback response service"""

    def test_medical_fallback_assessment(self):
        assessment = FallbackService.get_fallback_assessment(EmergencyType.MEDICAL)
        assert assessment["severity"] is not None
        assert assessment["assessment"] is not None
        assert len(assessment["recommendations"]) > 0
        assert assessment["call_emergency_services"] is True

    def test_fire_fallback_assessment(self):
        assessment = FallbackService.get_fallback_assessment(EmergencyType.FIRE)
        assert assessment["severity"] == "critical"
        assert "evacuate" in assessment["assessment"].lower()

    def test_fallback_first_aid(self):
        steps = FallbackService.get_fallback_first_aid(EmergencyType.ACCIDENT)
        assert len(steps) > 0
        assert all(hasattr(step, "step_number") for step in steps)
        assert all(hasattr(step, "instruction") for step in steps)

    def test_critical_warnings(self):
        warnings = FallbackService.get_critical_warnings(EmergencyType.MEDICAL)
        assert len(warnings) > 0
        assert any("911" in w or "emergency" in w.lower() for w in warnings)


class TestMedicalProfile:
    """Test medical profile age anonymization"""

    def test_age_range_conversion(self):
        profile = MedicalProfile(age_range="25")
        assert "-" in profile.age_range or "+" in profile.age_range

    def test_age_range_preservation(self):
        profile = MedicalProfile(age_range="30-50")
        assert profile.age_range == "30-50"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
