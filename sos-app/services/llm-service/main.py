"""
SOS App - LLM Service
AI-powered emergency assessment and first aid guidance
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routes import llm_routes
from app.utils.logger import setup_logger

# Setup logging
logger = setup_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting LLM Service...")
    logger.info(f"Environment: {settings.ENV}")
    logger.info(f"OpenAI Model: {settings.OPENAI_MODEL}")
    logger.info(f"Anthropic Model: {settings.ANTHROPIC_MODEL}")
    logger.info(f"Caching: {'Enabled' if settings.ENABLE_CACHING else 'Disabled'}")

    yield

    # Shutdown
    logger.info("🛑 Shutting down LLM Service...")


# Initialize FastAPI app
app = FastAPI(
    title="SOS App - LLM Service",
    description="AI-powered emergency assessment and first aid guidance",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse(
        content={
            "status": "healthy",
            "service": "llm-service",
            "version": "1.0.0",
            "environment": settings.ENV,
        }
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SOS App - LLM Service",
        "version": "1.0.0",
        "description": "AI-powered emergency assessment and first aid guidance",
        "endpoints": {
            "health": "/health",
            "api": "/api/v1",
            "docs": "/docs",
        },
    }


# Include API routes
app.include_router(llm_routes.router, prefix="/api/v1")


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "message": str(exc) if settings.ENV == "development" else "An error occurred",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENV == "development",
        log_level=settings.LOG_LEVEL.lower(),
    )
