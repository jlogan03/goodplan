#!/usr/bin/env bash
# Thin wrapper to run the trust layer smoke test via bun.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bun "$SCRIPT_DIR/smoke-trust.ts"
