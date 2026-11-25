#!/usr/bin/env bash
set -euo pipefail
mkdir -p /logs/verifier
for mutant in tests/mutants/*.patch; do
  python -m mutants run "$mutant" >> /logs/verifier/mutants.jsonl
done
