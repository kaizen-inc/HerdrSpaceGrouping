#!/usr/bin/env bash
set -euo pipefail
scripts=$(cd -- "$(dirname -- "$0")/../scripts" && pwd)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
cd "$work"
git init -q --bare origin.git
git init -q -b develop repo
cd repo
git config user.email test@example.invalid
git config user.name Test
git remote add origin ../origin.git
printf '0.1.0\n' > VERSION
git add VERSION
git commit -qm base
base=$(git rev-parse HEAD)
git push -q origin develop HEAD:testing HEAD:stable

git commit -qm newer --allow-empty
tip=$(git rev-parse HEAD)
git push -q origin develop
bash "$scripts/promote.sh" "$base"
[[ $(git ls-remote origin refs/heads/testing | cut -f1) == "$base" ]]
bash "$scripts/promote.sh" "$tip"
[[ $(git ls-remote origin refs/heads/testing | cut -f1) == "$tip" ]]

git switch -qc stable "$base"
git merge -q --no-ff develop -m 'Promote testing'
merge=$(git rev-parse HEAD)
git push -q origin stable
git tag -am Conflict v0.1.0 "$base"
git push -q origin v0.1.0
if bash "$scripts/publish.sh" "$merge" "$tip"; then
  echo 'Publication accepted a conflicting tag' >&2; exit 1
fi
[[ $(git rev-parse 'v0.1.0^{commit}') == "$base" ]]
# A divergent testing branch cannot be overwritten by the promoter.
git switch -qc divergent "$tip"
git commit -qm divergent --allow-empty
git push -q origin HEAD:testing
git switch -q develop
git commit -qm next --allow-empty
git push -q origin develop
if bash "$scripts/promote.sh" "$(git rev-parse HEAD)"; then
  echo 'Promotion overwrote divergent testing' >&2; exit 1
fi
printf 'Promotion and tag safety checks passed.\n'
