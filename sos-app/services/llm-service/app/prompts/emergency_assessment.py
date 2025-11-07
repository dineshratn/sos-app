"""
Emergency Assessment Prompt Templates
"""

from app.models.emergency_context import EmergencyContext

EMERGENCY_ASSESSMENT_SYSTEM_PROMPT = """You are an AI emergency assessment assistant for the SOS App. Your role is to analyze emergency situations and provide severity assessments with appropriate recommendations.

**CRITICAL GUIDELINES:**
1. You are NOT a substitute for professional medical advice or emergency services
2. ALWAYS recommend calling 911/emergency services for life-threatening situations
3. Provide clear, actionable recommendations
4. Be concise but thorough
5. Include appropriate disclaimers
6. Consider the context: location, medical profile, emergency type
7. Assess severity as: CRITICAL, HIGH, MEDIUM, or LOW

**RESPONSE FORMAT:**
- Severity Level: [CRITICAL/HIGH/MEDIUM/LOW]
- Assessment: [2-3 sentence assessment of the situation]
- Immediate Actions: [List 3-5 specific recommendations]
- Call Emergency Services: [YES/NO with justification]

**MEDICAL DISCLAIMER:**
This assessment is AI-generated and should not replace professional medical advice. Always call emergency services (911) for life-threatening emergencies or when in doubt.
"""


def create_assessment_prompt(context: EmergencyContext) -> str:
    """
    Create emergency assessment prompt from context

    Args:
        context: Emergency context (should be anonymized)

    Returns:
        Formatted prompt for LLM
    """
    prompt_parts = [
        f"**Emergency Type:** {context.emergency_type.value.upper()}",
        f"**Description:** {context.description}",
    ]

    # Add location context (anonymized)
    if context.location:
        location_parts = []
        if context.location.city:
            location_parts.append(f"City: {context.location.city}")
        if context.location.country:
            location_parts.append(f"Country: {context.location.country}")
        if location_parts:
            prompt_parts.append(f"**Location:** {', '.join(location_parts)}")

    # Add medical profile if available
    if context.medical_profile:
        medical_parts = []
        if context.medical_profile.age_range:
            medical_parts.append(f"Age: {context.medical_profile.age_range}")
        if context.medical_profile.blood_type:
            medical_parts.append(f"Blood Type: {context.medical_profile.blood_type}")
        if context.medical_profile.allergies:
            medical_parts.append(f"Allergies: {', '.join(context.medical_profile.allergies)}")
        if context.medical_profile.medical_conditions:
            medical_parts.append(
                f"Conditions: {', '.join(context.medical_profile.medical_conditions)}"
            )
        if medical_parts:
            prompt_parts.append(f"**Medical Profile:** {'; '.join(medical_parts)}")

    # Add additional info
    if context.additional_info:
        prompt_parts.append(f"**Additional Information:** {context.additional_info}")

    prompt_parts.append("\nProvide your emergency assessment following the response format guidelines.")

    return "\n\n".join(prompt_parts)
