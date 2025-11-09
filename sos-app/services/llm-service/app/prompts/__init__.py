"""
Prompt templates for LLM interactions
"""

from .emergency_assessment import EMERGENCY_ASSESSMENT_SYSTEM_PROMPT, create_assessment_prompt
from .first_aid import FIRST_AID_SYSTEM_PROMPT, create_first_aid_prompt

__all__ = [
    "EMERGENCY_ASSESSMENT_SYSTEM_PROMPT",
    "create_assessment_prompt",
    "FIRST_AID_SYSTEM_PROMPT",
    "create_first_aid_prompt",
]
