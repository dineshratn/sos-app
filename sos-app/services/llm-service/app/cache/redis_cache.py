"""
Redis Cache Service for LLM Responses
"""

import json
import hashlib
from typing import Optional, Any
import redis.asyncio as redis

from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)


class RedisCache:
    """Redis cache for LLM responses"""

    def __init__(self):
        """Initialize Redis connection"""
        self.client: Optional[redis.Redis] = None
        self.enabled = settings.ENABLE_CACHING

        if self.enabled:
            try:
                self.client = redis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    password=settings.REDIS_PASSWORD,
                    db=settings.REDIS_DB,
                    decode_responses=True,
                )
                logger.info("Redis cache initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Redis cache: {e}")
                self.enabled = False

    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """
        Generate cache key from parameters

        Args:
            prefix: Key prefix (e.g., 'assessment', 'first_aid')
            **kwargs: Parameters to include in cache key

        Returns:
            Hashed cache key
        """
        # Sort kwargs for consistent hashing
        sorted_params = sorted(kwargs.items())
        params_str = json.dumps(sorted_params, sort_keys=True)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()
        return f"llm:{prefix}:{params_hash}"

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache

        Args:
            key: Cache key

        Returns:
            Cached value or None
        """
        if not self.enabled or not self.client:
            return None

        try:
            value = await self.client.get(key)
            if value:
                logger.info(f"Cache hit: {key}")
                return json.loads(value)
            logger.debug(f"Cache miss: {key}")
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default: settings.CACHE_TTL)

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.client:
            return False

        try:
            ttl = ttl or settings.CACHE_TTL
            serialized_value = json.dumps(value)
            await self.client.setex(key, ttl, serialized_value)
            logger.info(f"Cache set: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete value from cache

        Args:
            key: Cache key

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.client:
            return False

        try:
            await self.client.delete(key)
            logger.info(f"Cache deleted: {key}")
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False

    async def get_assessment_cache(self, emergency_type: str, description: str) -> Optional[dict]:
        """Get cached assessment response"""
        key = self._generate_cache_key("assessment", type=emergency_type, desc=description[:100])
        return await self.get(key)

    async def set_assessment_cache(
        self, emergency_type: str, description: str, response: dict
    ) -> bool:
        """Set assessment response in cache"""
        key = self._generate_cache_key("assessment", type=emergency_type, desc=description[:100])
        return await self.set(key, response)

    async def get_first_aid_cache(self, emergency_type: str, description: str) -> Optional[dict]:
        """Get cached first aid response"""
        key = self._generate_cache_key("first_aid", type=emergency_type, desc=description[:100])
        return await self.get(key)

    async def set_first_aid_cache(
        self, emergency_type: str, description: str, response: dict
    ) -> bool:
        """Set first aid response in cache"""
        key = self._generate_cache_key("first_aid", type=emergency_type, desc=description[:100])
        return await self.set(key, response)

    async def close(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()
            logger.info("Redis cache connection closed")


# Singleton instance
_cache: Optional[RedisCache] = None


def get_cache() -> RedisCache:
    """Get or create Redis cache singleton"""
    global _cache
    if _cache is None:
        _cache = RedisCache()
    return _cache
