"""
LLM API Routes
Endpoints for emergency assessment and first aid guidance
"""

from fastapi import APIRouter, HTTPException, status
from datetime import datetime

from app.models.emergency_context import (
    EmergencyAssessmentRequest,
    EmergencyAssessmentResponse,
    FirstAidRequest,
    FirstAidResponse,
    SeverityLevel,
    LLMError,
)
from app.services.llm_orchestrator import get_llm_orchestrator
from app.services.fallback_service import FallbackService
from app.cache.redis_cache import get_cache
from app.prompts.emergency_assessment import (
    EMERGENCY_ASSESSMENT_SYSTEM_PROMPT,
    create_assessment_prompt,
)
from app.prompts.first_aid import FIRST_AID_SYSTEM_PROMPT, create_first_aid_prompt
from app.utils.anonymizer import anonymize_emergency_context
from app.utils.response_validator import validate_llm_response, sanitize_response
from app.utils.logger import setup_logger
from app.config import settings

logger = setup_logger(__name__)
router = APIRouter(prefix="/llm", tags=["llm"])


@router.post("/assess", response_model=EmergencyAssessmentResponse, status_code=status.HTTP_200_OK)
async def assess_emergency(request: EmergencyAssessmentRequest):
    """
    Assess emergency severity and provide recommendations

    This endpoint uses AI to analyze emergency situations and provide:
    - Severity assessment (CRITICAL, HIGH, MEDIUM, LOW)
    - Situation analysis
    - Actionable recommendations
    - Whether to call emergency services

    **Privacy**: All PII is anonymized before processing
    """
    try:
        logger.info(f"Assessment request for emergency: {request.emergency_context.emergency_id}")

        # Anonymize emergency context
        if settings.ENABLE_PII_ANONYMIZATION:
            anonymized_context = anonymize_emergency_context(request.emergency_context)
        else:
            anonymized_context = request.emergency_context

        # Check cache
        cache = get_cache()
        cached_response = await cache.get_assessment_cache(
            emergency_type=anonymized_context.emergency_type.value,
            description=anonymized_context.description,
        )

        if cached_response:
            logger.info("Returning cached assessment response")
            return EmergencyAssessmentResponse(**cached_response)

        # Try LLM assessment
        orchestrator = get_llm_orchestrator()
        try:
            # Create prompt
            user_prompt = create_assessment_prompt(anonymized_context)

            # Get LLM response
            llm_response = await orchestrator.generate_response(
                system_prompt=EMERGENCY_ASSESSMENT_SYSTEM_PROMPT, user_prompt=user_prompt
            )

            # Validate response
            validation_result = validate_llm_response(llm_response, "assessment")
            if not validation_result.is_valid:
                logger.warning(f"LLM response validation failed: {validation_result.errors}")
                raise Exception("LLM response validation failed")

            # Sanitize response
            llm_response = sanitize_response(llm_response)

            # Parse LLM response
            assessment_data = _parse_assessment_response(llm_response, anonymized_context)

            # Cache response
            await cache.set_assessment_cache(
                emergency_type=anonymized_context.emergency_type.value,
                description=anonymized_context.description,
                response=assessment_data,
            )

            return EmergencyAssessmentResponse(**assessment_data)

        except Exception as e:
            logger.error(f"LLM assessment failed: {e}")

            # Use fallback if enabled
            if settings.ENABLE_FALLBACK_RESPONSES:
                logger.info("Using fallback assessment")
                fallback_data = FallbackService.get_fallback_assessment(
                    anonymized_context.emergency_type
                )
                return EmergencyAssessmentResponse(
                    success=True,
                    emergency_id=request.emergency_context.emergency_id,
                    **fallback_data,
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="LLM service unavailable and fallback is disabled",
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assessment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assess emergency: {str(e)}",
        )


@router.post("/first-aid", response_model=FirstAidResponse, status_code=status.HTTP_200_OK)
async def get_first_aid_guidance(request: FirstAidRequest):
    """
    Get AI-powered first aid guidance

    Provides step-by-step first aid instructions tailored to:
    - Emergency type
    - Medical profile (allergies, conditions, medications)
    - Specific concerns

    **Important**: This is for informational purposes only.
    Always call emergency services for serious injuries.

    **Privacy**: All PII is anonymized before processing
    """
    try:
        logger.info(f"First aid request for emergency: {request.emergency_context.emergency_id}")

        # Anonymize emergency context
        if settings.ENABLE_PII_ANONYMIZATION:
            anonymized_context = anonymize_emergency_context(request.emergency_context)
        else:
            anonymized_context = request.emergency_context

        # Check cache
        cache = get_cache()
        cached_response = await cache.get_first_aid_cache(
            emergency_type=anonymized_context.emergency_type.value,
            description=anonymized_context.description,
        )

        if cached_response:
            logger.info("Returning cached first aid response")
            return FirstAidResponse(**cached_response)

        # Try LLM first aid
        orchestrator = get_llm_orchestrator()
        try:
            # Create prompt
            user_prompt = create_first_aid_prompt(
                anonymized_context, request.specific_concern
            )

            # Get LLM response
            llm_response = await orchestrator.generate_response(
                system_prompt=FIRST_AID_SYSTEM_PROMPT, user_prompt=user_prompt
            )

            # Validate response
            validation_result = validate_llm_response(llm_response, "first_aid")
            if not validation_result.is_valid:
                logger.warning(f"LLM response validation failed: {validation_result.errors}")
                raise Exception("LLM response validation failed")

            # Sanitize response
            llm_response = sanitize_response(llm_response)

            # Parse LLM response
            first_aid_data = _parse_first_aid_response(llm_response, anonymized_context)

            # Cache response
            await cache.set_first_aid_cache(
                emergency_type=anonymized_context.emergency_type.value,
                description=anonymized_context.description,
                response=first_aid_data,
            )

            return FirstAidResponse(**first_aid_data)

        except Exception as e:
            logger.error(f"LLM first aid failed: {e}")

            # Use fallback if enabled
            if settings.ENABLE_FALLBACK_RESPONSES:
                logger.info("Using fallback first aid")
                fallback_steps = FallbackService.get_fallback_first_aid(
                    anonymized_context.emergency_type
                )
                fallback_warnings = FallbackService.get_critical_warnings(
                    anonymized_context.emergency_type
                )

                return FirstAidResponse(
                    success=True,
                    emergency_id=request.emergency_context.emergency_id,
                    emergency_type=anonymized_context.emergency_type,
                    steps=fallback_steps,
                    critical_warnings=fallback_warnings,
                    when_to_stop="Stop and seek immediate professional help if the person's condition worsens or you feel unsafe continuing.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="LLM service unavailable and fallback is disabled",
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"First aid error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get first aid guidance: {str(e)}",
        )


def _parse_assessment_response(llm_response: str, context) -> dict:
    """
    Parse LLM assessment response into structured data

    Args:
        llm_response: Raw LLM response
        context: Emergency context

    Returns:
        Structured assessment data
    """
    # Simple parsing - extract severity, assessment, and recommendations
    # In production, use more robust parsing (e.g., structured output from LLM)

    severity = SeverityLevel.HIGH  # Default
    if "CRITICAL" in llm_response.upper():
        severity = SeverityLevel.CRITICAL
    elif "MEDIUM" in llm_response.upper():
        severity = SeverityLevel.MEDIUM
    elif "LOW" in llm_response.upper():
        severity = SeverityLevel.LOW

    call_emergency = "YES" in llm_response.upper() or "911" in llm_response

    # Extract recommendations (look for bullet points or numbered lists)
    recommendations = []
    lines = llm_response.split("\n")
    for line in lines:
        line = line.strip()
        if line and (line.startswith("-") or line.startswith("•") or line[0].isdigit()):
            # Clean up the line
            clean_line = line.lstrip("-•0123456789. ").strip()
            if clean_line:
                recommendations.append(clean_line)

    if not recommendations:
        recommendations = [
            "Call emergency services if the situation worsens",
            "Monitor the person's condition closely",
            "Keep the person calm and comfortable",
        ]

    return {
        "success": True,
        "emergency_id": context.emergency_id,
        "severity": severity,
        "assessment": llm_response[:500],  # First 500 chars as assessment
        "recommendations": recommendations[:5],  # Top 5 recommendations
        "call_emergency_services": call_emergency,
    }


def _parse_first_aid_response(llm_response: str, context) -> dict:
    """
    Parse LLM first aid response into structured data

    Args:
        llm_response: Raw LLM response
        context: Emergency context

    Returns:
        Structured first aid data
    """
    from app.models.emergency_context import FirstAidStep

    steps = []
    warnings = []

    # Extract steps (look for "Step N:" patterns)
    lines = llm_response.split("\n")
    current_step = None

    for line in lines:
        line = line.strip()

        # Detect step headers
        if "step" in line.lower() and ":" in line:
            if current_step:
                steps.append(current_step)

            step_number = len(steps) + 1
            instruction = line.split(":", 1)[1].strip() if ":" in line else line
            current_step = FirstAidStep(step_number=step_number, instruction=instruction)

        # Detect warnings
        elif "warning" in line.lower() and current_step:
            warning_text = line.split(":", 1)[1].strip() if ":" in line else line
            current_step.warnings.append(warning_text)

        # Detect duration
        elif "duration" in line.lower() and current_step:
            duration_text = line.split(":", 1)[1].strip() if ":" in line else line
            current_step.duration = duration_text

        # Critical warnings section
        elif "critical warning" in line.lower():
            warnings.append(line)

    # Add last step
    if current_step:
        steps.append(current_step)

    # If no steps parsed, create basic steps
    if not steps:
        steps = FallbackService.get_fallback_first_aid(context.emergency_type)

    return {
        "success": True,
        "emergency_id": context.emergency_id,
        "emergency_type": context.emergency_type,
        "steps": [step.model_dump() for step in steps[:10]],  # Max 10 steps
        "critical_warnings": warnings[:5] if warnings else ["Always prioritize safety"],
        "when_to_stop": "Stop immediately if the person's condition worsens or you feel unsafe.",
    }
