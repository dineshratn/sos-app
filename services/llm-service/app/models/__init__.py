"""
Data models for LLM Service
"""

from .emergency_context import (
    EmergencyContext,
    EmergencyAssessmentRequest,
    EmergencyAssessmentResponse,
    FirstAidRequest,
    FirstAidResponse,
    MedicalProfile,
    Location,
)

__all__ = [
    "EmergencyContext",
    "EmergencyAssessmentRequest",
    "EmergencyAssessmentResponse",
    "FirstAidRequest",
    "FirstAidResponse",
    "MedicalProfile",
    "Location",
]
