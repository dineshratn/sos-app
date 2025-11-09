# Contributing to SOS App

Thank you for your interest in contributing to the SOS App! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/sos-app.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`

## Development Guidelines

### Code Style

- Follow the existing code style
- Use TypeScript for all Node.js code
- Run `npm run format` before committing
- Ensure `npm run lint` passes without errors

### Testing

- Write tests for all new features
- Maintain minimum 80% code coverage
- Run `npm test` before submitting PR
- Add integration tests for service interactions

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(auth): add OAuth 2.0 support`
- `fix(emergency): handle null location data`
- `docs(readme): update installation instructions`

### Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the CHANGELOG.md
5. Request review from maintainers

## Project Structure

- `apps/` - Client applications
- `services/` - Backend microservices
- `libs/` - Shared libraries
- `infrastructure/` - IaC and deployment configs
- `tools/` - Build and development tools

## Questions?

Open an issue or reach out on Slack.
