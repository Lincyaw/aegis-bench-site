#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
pytest tests/hidden --junitxml=/logs/verifier/hidden.xml
python -m checks tests/checks tests/review > /logs/verifier/checks.json
