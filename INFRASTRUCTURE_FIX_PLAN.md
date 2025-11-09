# Infrastructure Fix Plan - Kafka, Redis, Zookeeper Issues

## Problem Analysis

### Current Issues (Typical Kafka/Redis/Zookeeper problems)

1. **Kafka Issues:**
   - Zookeeper dependency fails first
   - Kafka broker can't connect to Zookeeper
   - Port conflicts (9092 vs 29092)
   - Memory constraints in containers
   - Confluentinc images may be too heavy

2. **Zookeeper Issues:**
   - No healthcheck configured
   - Memory constraints
   - No ports exposed
   - Confluentinc image very large

3. **Redis Issues:**
   - AOF (Append Only File) enabled by default - requires write permissions
   - Volume permission issues
   - Memory limits

## Proposed Solutions

### Option 1: Lightweight Implementation (RECOMMENDED)
- Replace Confluentinc with lightweight Kafka/Zookeeper
- Use Bitnami images (optimized, smaller)
- Simplify dependencies
- Add proper healthchecks

### Option 2: Remove Kafka (Event-based to Database)
- Use PostgreSQL for event streaming
- Eliminate Zookeeper entirely
- Reduce complexity
- Better for small-medium deployments

### Option 3: Docker Compose with Better Resource Management
- Add memory limits
- Optimize startup order
- Add proper wait-for-it scripts
- Configure restart policies

## Recommended Plan: Hybrid Approach

### Phase 1: Analyze Current Setup
- Check what services actually NEED Kafka
- Reduce dependencies where possible

### Phase 2: Implement Lightweight Solution
1. Replace Zookeeper + Kafka with Bitnami images
2. Fix Redis configuration
3. Add proper health checks
4. Optimize resource usage

### Phase 3: Fallback Strategy
- Add PostgreSQL event table (if Kafka fails)
- Make Kafka optional
- Services degrade gracefully

### Phase 4: Testing
- Verify all services start
- Test service communication
- Monitor resource usage
- Verify healthchecks work

## Implementation Steps

1. **Analyze Service Dependencies**
   - Check which services use Kafka
   - Check if we can use PostgreSQL instead

2. **Update docker-compose.yml**
   - Use lightweight images
   - Add proper configurations
   - Fix volume issues

3. **Create Fallback Configuration**
   - Optional Kafka setup
   - Database-based alternatives

4. **Add Startup Scripts**
   - Wait-for-it dependencies
   - Health verification

5. **Documentation**
   - Setup guide
   - Troubleshooting
   - Performance notes
