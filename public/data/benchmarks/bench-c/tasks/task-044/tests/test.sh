#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
python -m checks tests/checks tests/review --reference tests/ground_truth.json > /logs/verifier/checks.json
