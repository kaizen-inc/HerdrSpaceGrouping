#!/usr/bin/env bash
set -euo pipefail

tested_sha=${1:?Expected tested SHA}
git fetch --no-tags origin refs/heads/develop refs/heads/testing
read -r tip _ < <(git ls-remote --exit-code origin refs/heads/develop)
if [[ $tested_sha != "$tip" ]]; then
  echo "Skipping superseded develop commit: $tested_sha"
  exit 0
fi
# Refuse divergent history at the server, even if testing moved since the fetch.
git push origin "$tested_sha:refs/heads/testing"
