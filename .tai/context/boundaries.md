# Architecture Boundaries

<!--
  Define forbidden import paths here. The boundary hook scans staged files
  for these patterns and blocks commits that introduce violations.

  Format:
  FORBIDDEN IMPORTS:
    source/path/** → target/path/**

  Example:
  FORBIDDEN IMPORTS:
    src/services/extraction/** → src/services/pricing/**
    src/services/pricing/** → src/services/extraction/**
    src/services/extraction/** → src/models/rate_cards.*

  Each rule prevents any file matching the source glob from importing
  any file matching the target glob. Violations are logged to
  .tai/telemetry/boundaries.jsonl.
-->

FORBIDDEN IMPORTS:
  # Add project-specific boundary rules here
