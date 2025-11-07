# LLM Service - SOS App

AI-powered emergency assessment and first aid guidance service using LangChain, OpenAI, and Anthropic.

## Features

- **Emergency Assessment**: AI-powered severity assessment with actionable recommendations
- **First Aid Guidance**: Step-by-step first aid instructions tailored to the emergency
- **Privacy-First**: Automatic PII anonymization before sending to LLMs
- **High Availability**: Automatic fallback from OpenAI to Anthropic Claude
- **Response Validation**: Safety checks and content validation for all AI responses
- **Caching**: Redis caching to reduce latency and costs
- **Fallback Responses**: Pre-defined responses when AI is unavailable

## Technology Stack

- **FastAPI**: High-performance async Python web framework
- **LangChain**: LLM orchestration and prompt management
- **OpenAI GPT-4**: Primary LLM for assessments
- **Anthropic Claude**: Fallback LLM
- **Redis**: Response caching
- **Pydantic**: Data validation and settings management

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       v
┌──────────────────┐
│  API Gateway     │
└──────┬───────────┘
       │
       v
┌──────────────────┐     ┌──────────────┐
│  LLM Service     │────→│ Redis Cache  │
└──────┬───────────┘     └──────────────┘
       │
       ├─────→ PII Anonymization
       │
       ├─────→ LangChain Orchestrator
       │              │
       │              ├─→ OpenAI GPT-4 (Primary)
       │              │
       │              └─→ Anthropic Claude (Fallback)
       │
       ├─────→ Response Validation
       │
       └─────→ Fallback Service (Pre-defined responses)
```

## API Endpoints

### POST /api/v1/llm/assess
Assess emergency severity and get recommendations

**Request:**
```json
{
  "emergency_context": {
    "emergency_id": "123",
    "emergency_type": "medical",
    "description": "Person experiencing chest pain and shortness of breath",
    "location": {
      "city": "San Francisco",
      "country": "USA"
    },
    "medical_profile": {
      "age_range": "50-70",
      "medical_conditions": ["hypertension"],
      "medications": ["lisinopril"]
    }
  },
  "include_recommendations": true
}
```

**Response:**
```json
{
  "success": true,
  "emergency_id": "123",
  "severity": "CRITICAL",
  "assessment": "This appears to be a potential cardiac emergency...",
  "recommendations": [
    "Call 911 immediately",
    "Have person sit down and stay calm",
    "Give aspirin if available and no allergies",
    "Monitor breathing and consciousness"
  ],
  "call_emergency_services": true,
  "disclaimer": "This is an AI-generated assessment..."
}
```

### POST /api/v1/llm/first-aid
Get step-by-step first aid guidance

**Request:**
```json
{
  "emergency_context": {
    "emergency_id": "123",
    "emergency_type": "accident",
    "description": "Person fell and has severe bleeding from arm"
  },
  "specific_concern": "How to stop the bleeding"
}
```

**Response:**
```json
{
  "success": true,
  "emergency_id": "123",
  "emergency_type": "accident",
  "steps": [
    {
      "step_number": 1,
      "instruction": "Call 911 immediately",
      "warnings": ["Do not delay emergency call"],
      "duration": "Immediately"
    },
    {
      "step_number": 2,
      "instruction": "Apply direct pressure to the wound with clean cloth",
      "warnings": ["Maintain constant pressure", "Do not remove cloth if soaked"],
      "duration": "10-15 minutes or until bleeding stops"
    }
  ],
  "critical_warnings": [
    "Always call 911 for severe bleeding",
    "Do not remove embedded objects"
  ],
  "when_to_stop": "Stop if person becomes unresponsive",
  "disclaimer": "This first aid guidance is AI-generated..."
}
```

## Environment Variables

```bash
# Server
PORT=3007
HOST=0.0.0.0
ENV=development

# OpenAI
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic (Fallback)
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# Features
ENABLE_CACHING=true
ENABLE_PII_ANONYMIZATION=true
ENABLE_FALLBACK_RESPONSES=true
```

## Running Locally

### With Python

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your API keys

# Run server
python main.py

# Or with uvicorn
uvicorn main:app --reload --port 3007
```

### With Docker

```bash
# Build image
docker build -t sos-llm-service .

# Run container
docker run -p 3007:3007 --env-file .env sos-llm-service
```

### With Docker Compose

```bash
# From sos-app root
docker-compose up llm-service
```

## Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=app tests/

# Run specific test
pytest tests/test_llm_service.py -v
```

## Safety Features

1. **PII Anonymization**: Removes names, addresses, phone numbers, emails before LLM processing
2. **Response Validation**: Checks for harmful content, medical misinformation
3. **Disclaimer Enforcement**: Ensures all responses include medical disclaimers
4. **Fallback System**: Pre-defined safe responses when AI unavailable
5. **Content Sanitization**: Removes HTML, excessive whitespace, leaked PII

## Monitoring

Health check endpoint: `GET /health`

```json
{
  "status": "healthy",
  "service": "llm-service",
  "version": "1.0.0",
  "environment": "production"
}
```

## License

MIT License - See LICENSE file for details
