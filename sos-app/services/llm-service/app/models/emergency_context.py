"""
Pydantic models for emergency context and LLM requests/responses
"""

from typing import Optional, List
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field, validator


class EmergencyType(str, Enum):
    """Types of emergencies"""

    MEDICAL = "medical"
    ACCIDENT = "accident"
    FIRE = "fire"
    VIOLENCE = "violence"
    NATURAL_DISASTER = "natural_disaster"
    OTHER = "other"


class SeverityLevel(str, Enum):
    """Emergency severity levels"""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Location(BaseModel):
    """Location information"""

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class MedicalProfile(BaseModel):
    """User's medical profile (anonymized)"""

    blood_type: Optional[str] = None
    allergies: List[str] = Field(default_factory=list)
    medical_conditions: List[str] = Field(default_factory=list)
    medications: List[str] = Field(default_factory=list)
    age_range: Optional[str] = None  # e.g., "20-30", "60+"

    @validator("age_range")
    def validate_age_range(cls, v):
        """Ensure age is provided as range for privacy"""
        if v and not any(char in v for char in ["-", "+"]):
            # Convert specific age to range
            try:
                age = int(v)
                if age < 18:
                    return "0-18"
                elif age < 30:
                    return "18-30"
                elif age < 50:
                    return "30-50"
                elif age < 70:
                    return "50-70"
                else:
                    return "70+"
            except ValueError:
                return v
        return v


class EmergencyContext(BaseModel):
    """Complete emergency context for LLM processing"""

    emergency_id: str
    emergency_type: EmergencyType
    description: str = Field(..., min_length=10, max_length=1000)
    location: Optional[Location] = None
    medical_profile: Optional[MedicalProfile] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    additional_info: Optional[str] = None


class EmergencyAssessmentRequest(BaseModel):
    """Request for emergency assessment"""

    emergency_context: EmergencyContext
    include_recommendations: bool = True


class EmergencyAssessmentResponse(BaseModel):
    """Response for emergency assessment"""

    success: bool
    emergency_id: str
    severity: SeverityLevel
    assessment: str
    recommendations: List[str] = Field(default_factory=list)
    call_emergency_services: bool
    disclaimer: str = Field(
        default="This is an AI-generated assessment and should not replace professional medical "
        "advice. Always call emergency services (911) for life-threatening emergencies."
    )
    processed_at: datetime = Field(default_factory=datetime.utcnow)


class FirstAidRequest(BaseModel):
    """Request for first aid guidance"""

    emergency_context: EmergencyContext
    specific_concern: Optional[str] = None


class FirstAidStep(BaseModel):
    """A single first aid step"""

    step_number: int
    instruction: str
    warnings: List[str] = Field(default_factory=list)
    duration: Optional[str] = None  # e.g., "2 minutes", "until help arrives"


class FirstAidResponse(BaseModel):
    """Response for first aid guidance"""

    success: bool
    emergency_id: str
    emergency_type: EmergencyType
    steps: List[FirstAidStep]
    critical_warnings: List[str] = Field(default_factory=list)
    when_to_stop: str
    disclaimer: str = Field(
        default="This first aid guidance is AI-generated and for informational purposes only. "
        "Always prioritize professional medical help for serious injuries or emergencies."
    )
    processed_at: datetime = Field(default_factory=datetime.utcnow)


class LLMError(BaseModel):
    """Error response from LLM service"""

    success: bool = False
    error: str
    error_code: str
    message: str
