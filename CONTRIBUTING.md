# Contributing to SpEL Editor

## Branch Strategy

- `master` — Stable branch, target for all PR merges

## Development Environment

```bash
# Install dependencies
pnpm install

# Build package
pnpm build

# Run unit tests with coverage
pnpm test

# Run browser tests (Playwright)
pnpm test:browser

# Run all tests
pnpm test:all

# Type check
pnpm typecheck

# Format code
pnpm format

# Format check
pnpm format:check
```

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add context-aware hover tooltips
fix: resolve lint source empty expression crash
docs: update API documentation
test: add branch coverage for completion adapters
chore: configure CI workflow
refactor: extract hover tooltip to separate module
```

## Code Quality Requirements

### Testing
- New features must include tests
- Branch coverage target: ≥ 90%
- Unit tests run in jsdom (vitest)
- Browser integration tests run via Playwright
- nl2spel integration tests require `DEEPSEEK_API_KEY` environment variable
- All tests must pass on CI

### Pre-commit Gates
```bash
# Install git hooks
pnpm install

# Before each commit, ensure:
# - typecheck passes (tsc --noEmit)
# - format:check passes (prettier --check)
# - tests pass (vitest run --coverage)
# - build succeeds (tsup)
```

### CI Requirements
- Zero warnings, zero errors on CI
- Combined lint/test/coverage workflow
- Coverage thresholds enforced in vitest.config.ts

## License

MIT © AgentiX-E
