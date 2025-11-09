"""
Fallback Response Service

Provides pre-defined responses for common emergencies when LLM is unavailable
"""

from typing import List, Dict, Any
from app.models.emergency_context import (
    EmergencyType,
    SeverityLevel,
    FirstAidStep,
)
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class FallbackService:
    """Provides fallback responses for common emergencies"""

    # Pre-defined emergency assessments
    FALLBACK_ASSESSMENTS: Dict[EmergencyType, Dict[str, Any]] = {
        EmergencyType.MEDICAL: {
            "severity": SeverityLevel.HIGH,
            "assessment": "This appears to be a medical emergency. Immediate professional help is recommended.",
            "recommendations": [
                "Call 911 or local emergency services immediately",
                "Stay calm and keep the person comfortable",
                "Do not move the person unless there is immediate danger",
                "Monitor vital signs (breathing, pulse) if possible",
                "Provide emergency information to responders when they arrive",
            ],
            "call_emergency_services": True,
        },
        EmergencyType.ACCIDENT: {
            "severity": SeverityLevel.HIGH,
            "assessment": "Accident situations can involve serious injuries. Professional emergency response is needed.",
            "recommendations": [
                "Call 911 immediately",
                "Ensure the scene is safe before providing assistance",
                "Do not move injured persons unless there is immediate danger",
                "Apply pressure to any bleeding wounds with clean cloth",
                "Keep injured persons calm and still",
            ],
            "call_emergency_services": True,
        },
        EmergencyType.FIRE: {
            "severity": SeverityLevel.CRITICAL,
            "assessment": "Fire is a critical emergency requiring immediate evacuation and professional response.",
            "recommendations": [
                "Call 911 immediately",
                "Evacuate the building using the nearest safe exit",
                "Do not use elevators",
                "Stay low to avoid smoke inhalation",
                "Do not re-enter the building for any reason",
            ],
            "call_emergency_services": True,
        },
        EmergencyType.VIOLENCE: {
            "severity": SeverityLevel.CRITICAL,
            "assessment": "Violence situations require immediate law enforcement response. Your safety is the priority.",
            "recommendations": [
                "Call 911 immediately if safe to do so",
                "Remove yourself from danger if possible",
                "Do not confront the aggressor",
                "Seek shelter in a safe location",
                "Follow law enforcement instructions when they arrive",
            ],
            "call_emergency_services": True,
        },
        EmergencyType.NATURAL_DISASTER: {
            "severity": SeverityLevel.CRITICAL,
            "assessment": "Natural disasters require immediate safety measures and emergency response coordination.",
            "recommendations": [
                "Follow local emergency broadcast instructions",
                "Seek appropriate shelter immediately",
                "Stay away from windows, doors, and external walls",
                "Have emergency supplies ready (water, food, first aid)",
                "Do not venture outside until authorities declare it safe",
            ],
            "call_emergency_services": True,
        },
    }

    # Pre-defined first aid steps
    FALLBACK_FIRST_AID: Dict[EmergencyType, List[FirstAidStep]] = {
        EmergencyType.MEDICAL: [
            FirstAidStep(
                step_number=1,
                instruction="Call 911 or emergency services immediately",
                warnings=["Do not delay emergency call"],
                duration="Immediately",
            ),
            FirstAidStep(
                step_number=2,
                instruction="Keep the person calm and comfortable",
                warnings=["Do not give food or drinks unless instructed"],
                duration="Until help arrives",
            ),
            FirstAidStep(
                step_number=3,
                instruction="Monitor breathing and consciousness",
                warnings=["Be prepared to perform CPR if trained"],
                duration="Continuously",
            ),
            FirstAidStep(
                step_number=4,
                instruction="Gather medical information (medications, allergies, conditions)",
                warnings=["Have this ready for emergency responders"],
                duration="While waiting",
            ),
        ],
        EmergencyType.ACCIDENT: [
            FirstAidStep(
                step_number=1,
                instruction="Ensure scene safety before approaching",
                warnings=["Do not put yourself in danger"],
                duration="First priority",
            ),
            FirstAidStep(
                step_number=2,
                instruction="Call 911 immediately",
                warnings=["Provide clear location and injury description"],
                duration="Immediately",
            ),
            FirstAidStep(
                step_number=3,
                instruction="Apply direct pressure to any bleeding wounds",
                warnings=["Use clean cloth or gauze", "Do not remove objects embedded in wounds"],
                duration="Until bleeding stops or help arrives",
            ),
            FirstAidStep(
                step_number=4,
                instruction="Keep injured person still",
                warnings=["Do not move unless immediate danger", "Suspect spinal injury in serious accidents"],
                duration="Until professional help arrives",
            ),
        ],
    }

    @staticmethod
    def get_fallback_assessment(emergency_type: EmergencyType) -> Dict[str, Any]:
        """
        Get fallback assessment for emergency type

        Args:
            emergency_type: Type of emergency

        Returns:
            Pre-defined assessment dictionary
        """
        assessment = FallbackService.FALLBACK_ASSESSMENTS.get(
            emergency_type,
            {
                "severity": SeverityLevel.HIGH,
                "assessment": "This is an emergency situation requiring professional help.",
                "recommendations": [
                    "Call 911 or local emergency services",
                    "Stay safe and calm",
                    "Wait for professional assistance",
                ],
                "call_emergency_services": True,
            },
        )

        logger.info(f"Returning fallback assessment for {emergency_type.value}")
        return assessment

    @staticmethod
    def get_fallback_first_aid(emergency_type: EmergencyType) -> List[FirstAidStep]:
        """
        Get fallback first aid steps for emergency type

        Args:
            emergency_type: Type of emergency

        Returns:
            List of first aid steps
        """
        steps = FallbackService.FALLBACK_FIRST_AID.get(
            emergency_type,
            [
                FirstAidStep(
                    step_number=1,
                    instruction="Call 911 or emergency services immediately",
                    warnings=["Do not attempt advanced procedures without training"],
                    duration="Immediately",
                ),
                FirstAidStep(
                    step_number=2,
                    instruction="Keep yourself and others safe",
                    warnings=["Assess the situation before acting"],
                    duration="Ongoing",
                ),
                FirstAidStep(
                    step_number=3,
                    instruction="Provide comfort and reassurance",
                    warnings=["Do not move injured persons unnecessarily"],
                    duration="Until help arrives",
                ),
            ],
        )

        logger.info(f"Returning fallback first aid steps for {emergency_type.value}")
        return steps

    @staticmethod
    def get_critical_warnings(emergency_type: EmergencyType) -> List[str]:
        """Get critical warnings for emergency type"""
        common_warnings = [
            "Always call 911 for serious emergencies",
            "Do not provide care beyond your training level",
            "Prioritize scene safety for yourself and others",
        ]

        type_specific_warnings = {
            EmergencyType.MEDICAL: [
                "Do not give medications unless prescribed",
                "Do not give food or drink to unconscious persons",
            ],
            EmergencyType.FIRE: [
                "Never re-enter a burning building",
                "Crawl low under smoke",
            ],
            EmergencyType.VIOLENCE: [
                "Your safety is the top priority",
                "Do not confront violent individuals",
            ],
        }

        warnings = common_warnings + type_specific_warnings.get(emergency_type, [])
        return warnings
