# @sos-app/shared

Shared utilities, types, and common code for the SOS App platform.

## Purpose

This library provides:
- **Common Types**: Shared TypeScript interfaces and types used across all services
- **Utility Functions**: Reusable helper functions (logging, validation, formatting)
- **Constants**: Application-wide constants and enums
- **Error Handling**: Standardized error classes and error handling utilities

## Usage

Import shared utilities in any service or application:

```typescript
import { Logger, validateLocation, EmergencyType } from '@sos-app/shared';
import type { Location, Emergency, User } from '@sos-app/shared/types';

const logger = Logger.getInstance('my-service');
logger.info('Service started');

const location: Location = {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 10
};

if (validateLocation(location)) {
  logger.debug('Valid location', { location });
}
```

## Structure

```
libs/shared/
├── src/
│   ├── index.ts              # Main barrel export
│   ├── types/                # Type definitions
│   │   ├── common.ts         # Common types (UUID, Timestamp, etc.)
│   │   ├── user.ts           # User-related types
│   │   ├── emergency.ts      # Emergency-related types
│   │   ├── location.ts       # Location types
│   │   └── index.ts          # Type exports
│   ├── utils/                # Utility functions
│   │   ├── logger.ts         # Logging utility
│   │   ├── validation.ts     # Validation helpers
│   │   ├── errors.ts         # Error classes
│   │   └── index.ts          # Utility exports
│   └── constants/            # Constants and enums
│       ├── emergency.ts      # Emergency-related constants
│       └── index.ts          # Constant exports
├── tsconfig.json             # TypeScript configuration
├── tsconfig.lib.json         # Library build configuration
├── tsconfig.spec.json        # Test configuration
├── package.json              # Package metadata
└── README.md                 # This file
```

## TypeScript Configuration

The shared library uses strict TypeScript settings:

- **Strict Mode**: All strict checks enabled
- **No Implicit Any**: All types must be explicitly defined
- **Strict Null Checks**: Proper null/undefined handling required
- **No Unused Variables**: Clean code enforcement
- **Module Resolution**: Node-style resolution with path aliases

## Building

```bash
# Build the library
npm run build

# Type check without emitting
npm run typecheck

# Run tests
npm run test

# Lint code
npm run lint
```

## Adding New Shared Code

1. Create your utility/type in the appropriate directory
2. Export it from the directory's index.ts
3. Ensure it's exported from the main src/index.ts
4. Add unit tests for utilities
5. Update this README if adding new categories

## Best Practices

- **Keep it Pure**: No side effects in shared utilities
- **Type Everything**: Leverage TypeScript's type system fully
- **Test Thoroughly**: All utilities must have unit tests
- **Document Well**: Add JSDoc comments for complex functions
- **Stay Generic**: Avoid business logic specific to one service
