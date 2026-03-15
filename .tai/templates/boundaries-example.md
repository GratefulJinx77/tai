# Architecture Boundaries — Example Configuration

This file shows example boundary rules for a multi-service application.
Copy the relevant patterns to `.tai/context/boundaries.md` and adapt
to your project's module structure.

## Example: Service Isolation

```
FORBIDDEN IMPORTS:
  # Extraction service cannot access pricing data
  src/services/extraction/** → src/services/pricing/**
  src/services/pricing/** → src/services/extraction/**
  src/services/extraction/** → src/models/rate_cards.*
  src/services/extraction/** → src/models/formulas.*
```

## Example: Layer Separation

```
FORBIDDEN IMPORTS:
  # Routes cannot access database directly (must go through services)
  src/routes/** → src/db/**
  src/routes/** → src/models/**

  # Services cannot import from routes
  src/services/** → src/routes/**
```

## Example: Package Boundaries (Monorepo)

```
FORBIDDEN IMPORTS:
  # Frontend cannot import backend code
  packages/web/** → packages/api/**

  # Shared types package cannot import from either
  packages/types/** → packages/web/**
  packages/types/** → packages/api/**
```

## Rule Format

Each rule follows the pattern:
```
source/glob/** → target/glob/**
```

- `**` matches any subdirectory depth
- `*` matches any single file or directory name
- Rules are checked against import/require statements in staged files
- Violations block the commit and log to `.tai/telemetry/boundaries.jsonl`
