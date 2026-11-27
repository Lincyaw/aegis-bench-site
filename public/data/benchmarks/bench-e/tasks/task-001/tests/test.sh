#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
python -m checks tests/hidden tests/checks tests/review --workspace /workspace > /logs/verifier/checks.json
