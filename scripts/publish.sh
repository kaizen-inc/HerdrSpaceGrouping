#!/usr/bin/env bash
set -euo pipefail

commit=${1:?Expected stable merge SHA}
tested=${2:?Expected testing head SHA}
git fetch --no-tags origin refs/heads/stable:refs/remotes/origin/stable refs/heads/testing:refs/remotes/origin/testing
git merge-base --is-ancestor "$commit" origin/stable
git merge-base --is-ancestor "$tested" origin/testing
[[ $(git rev-parse HEAD) == "$commit" && $(git rev-parse "$commit^2") == "$tested" ]] ||
  { echo 'Release requires a regular testing -> stable merge commit.' >&2; exit 1; }

version=$(<VERSION)
[[ $version =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || { echo 'Invalid VERSION' >&2; exit 1; }
tag=v$version
zip="herdr-space-grouping-$tag.zip"
ref="refs/tags/$tag"
if [[ -n $(git ls-remote --refs origin "$ref") ]]; then
  git fetch --no-tags origin "$ref"
  [[ $(git rev-parse 'FETCH_HEAD^{commit}') == "$commit" ]] ||
    { echo "$tag already points to a different commit; bump VERSION." >&2; exit 1; }
else
  git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' tag -a "$tag" "$commit" -m "Release $tag"
  git push origin "$ref"
fi

if gh release view "$tag" --json tagName >/dev/null 2>&1; then
  echo "Release $tag already exists."
else
  gh release create "$tag" ".dist/$zip" ".dist/$zip.sha256" --verify-tag --generate-notes --title "$tag"
fi
