#!/bin/bash
# Bump package.json version, create git tag, push branch + tags.
# Run `npm run release` first (test + build) and commit any dist/ changes.
set -euo pipefail

if [[ "${1:-}" != "patch" && "${1:-}" != "minor" && "${1:-}" != "major" ]]; then
    echo "Usage: $0 [patch|minor|major]"
    exit 1
fi

cd "$(dirname "$0")"

npm version "$1"
git push
git push --tags
