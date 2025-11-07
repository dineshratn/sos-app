"""
LLM Orchestrator Service

Manages LLM interactions with OpenAI (primary) and Anthropic (fallback)
using LangChain for orchestration
"""

from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.schema import SystemMessage, HumanMessage

from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class LLMOrchestrator:
    """Orchestrates LLM calls with automatic fallback"""

    def __init__(self):
        """Initialize LLM providers"""
        self.primary_llm: Optional[ChatOpenAI] = None
        self.fallback_llm: Optional[ChatAnthropic] = None

        # Initialize OpenAI (Primary)
        if settings.OPENAI_API_KEY:
            try:
                self.primary_llm = ChatOpenAI(
                    model=settings.OPENAI_MODEL,
                    temperature=settings.OPENAI_TEMPERATURE,
                    max_tokens=settings.OPENAI_MAX_TOKENS,
                    api_key=settings.OPENAI_API_KEY,
                )
                logger.info(f"Initialized OpenAI LLM: {settings.OPENAI_MODEL}")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI: {e}")

        # Initialize Anthropic (Fallback)
        if settings.ANTHROPIC_API_KEY:
            try:
                self.fallback_llm = ChatAnthropic(
                    model=settings.ANTHROPIC_MODEL,
                    max_tokens=settings.ANTHROPIC_MAX_TOKENS,
                    api_key=settings.ANTHROPIC_API_KEY,
                )
                logger.info(f"Initialized Anthropic LLM: {settings.ANTHROPIC_MODEL}")
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic: {e}")

    async def generate_response(
        self, system_prompt: str, user_prompt: str, use_fallback: bool = False
    ) -> str:
        """
        Generate LLM response with automatic fallback

        Args:
            system_prompt: System instructions for the LLM
            user_prompt: User query/prompt
            use_fallback: Force use of fallback LLM

        Returns:
            LLM-generated response text

        Raises:
            Exception: If both primary and fallback LLMs fail
        """
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]

        # Try primary LLM first (unless fallback is forced)
        if not use_fallback and self.primary_llm:
            try:
                logger.info("Calling primary LLM (OpenAI)...")
                response = await self.primary_llm.ainvoke(messages)
                logger.info("Primary LLM response received")
                return response.content
            except Exception as e:
                logger.error(f"Primary LLM failed: {e}")
                logger.info("Falling back to secondary LLM...")

        # Fallback to Anthropic
        if self.fallback_llm:
            try:
                logger.info("Calling fallback LLM (Anthropic)...")
                response = await self.fallback_llm.ainvoke(messages)
                logger.info("Fallback LLM response received")
                return response.content
            except Exception as e:
                logger.error(f"Fallback LLM failed: {e}")
                raise Exception("All LLM providers failed")

        raise Exception("No LLM providers available")

    async def check_availability(self) -> dict:
        """
        Check availability of LLM providers

        Returns:
            Dictionary with provider status
        """
        status = {"primary": False, "fallback": False, "available": False}

        # Check OpenAI
        if self.primary_llm:
            try:
                await self.primary_llm.ainvoke(
                    [HumanMessage(content="test")]
                )
                status["primary"] = True
            except Exception as e:
                logger.debug(f"Primary LLM health check failed: {e}")

        # Check Anthropic
        if self.fallback_llm:
            try:
                await self.fallback_llm.ainvoke(
                    [HumanMessage(content="test")]
                )
                status["fallback"] = True
            except Exception as e:
                logger.debug(f"Fallback LLM health check failed: {e}")

        status["available"] = status["primary"] or status["fallback"]
        return status


# Singleton instance
_orchestrator: Optional[LLMOrchestrator] = None


def get_llm_orchestrator() -> LLMOrchestrator:
    """Get or create LLM orchestrator singleton"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = LLMOrchestrator()
    return _orchestrator
