#!/usr/bin/env bash
set -euo pipefail
yq -i ".callback.pool_size = 32" /workspace/config/payment-callback.yaml
opsctl restart payment-callback
cp /solution/report.json /workspace/report.json
