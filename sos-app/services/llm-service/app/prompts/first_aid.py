"""
First Aid Guidance Prompt Templates
"""

from app.models.emergency_context import EmergencyContext

FIRST_AID_SYSTEM_PROMPT = """You are an AI first aid guidance assistant for the SOS App. Your role is to provide step-by-step first aid instructions for emergency situations.

**CRITICAL GUIDELINES:**
1. You are NOT a substitute for professional medical care
2. ALWAYS emphasize calling 911/emergency services first for serious injuries
3. Provide clear, sequential, numbered steps
4. Include safety warnings for each step when relevant
5. Use simple, easy-to-understand language
6. Focus on immediate stabilization until professional help arrives
7. Never provide instructions that could cause harm
8. Include "when to stop" criteria

**RESPONSE FORMAT:**
Step 1: [Instruction]
- Warning: [Any safety warnings]
- Duration: [How long to perform this step]

Step 2: [Instruction]
...

**CRITICAL WARNINGS:**
[List any critical warnings specific to this emergency]

**WHEN TO STOP:**
[Criteria for when to stop first aid and what to do next]

**MEDICAL DISCLAIMER:**
This first aid guidance is AI-generated and for informational purposes only. Always prioritize calling emergency services and obtaining professional medical help for serious injuries or emergencies.
"""


def create_first_aid_prompt(
    context: EmergencyContext, specific_concern: str = None
) -> str:
    """
    Create first aid guidance prompt from context

    Args:
        context: Emergency context (should be anonymized)
        specific_concern: Specific concern or symptom to address

    Returns:
        Formatted prompt for LLM
    """
    prompt_parts = [
        f"**Emergency Type:** {context.emergency_type.value.upper()}",
        f"**Situation:** {context.description}",
    ]

    if specific_concern:
        prompt_parts.append(f"**Specific Concern:** {specific_concern}")

    # Add medical profile considerations
    if context.medical_profile:
        considerations = []
        if context.medical_profile.age_range:
            considerations.append(f"Patient age range: {context.medical_profile.age_range}")
        if context.medical_profile.allergies:
            considerations.append(
                f"Known allergies: {', '.join(context.medical_profile.allergies)}"
            )
        if context.medical_profile.medical_conditions:
            considerations.append(
                f"Medical conditions: {', '.join(context.medical_profile.medical_conditions)}"
            )
        if context.medical_profile.medications:
            considerations.append(
                f"Current medications: {', '.join(context.medical_profile.medications)}"
            )

        if considerations:
            prompt_parts.append(f"**Medical Considerations:** {'; '.join(considerations)}")

    # Add location context for environmental factors
    if context.location and context.location.city:
        prompt_parts.append(f"**Location:** {context.location.city}")

    if context.additional_info:
        prompt_parts.append(f"**Additional Context:** {context.additional_info}")

    prompt_parts.append(
        "\nProvide step-by-step first aid instructions following the response format guidelines. "
        "Focus on immediate actions that can be safely performed by a layperson until professional "
        "help arrives. Include all relevant safety warnings."
    )

    return "\n\n".join(prompt_parts)
