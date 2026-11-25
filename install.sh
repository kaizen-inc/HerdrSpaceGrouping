#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
app_home=${HERDR_APP_HOME:-"$HOME/.config/herdr-app"}
mods=(grouped-spaces grouped-spaces-menu space-group-picker)

update=false
if [[ $# == 1 && $1 == --update ]]; then
  update=true
elif [[ $# != 0 ]]; then
  printf 'Usage: bash install.sh [--update]\n' >&2
  exit 1
fi

layout="$app_home/layouts/grouped-spaces.json"
if $update; then
  for mod in "${mods[@]}"; do
    dir="$app_home/mods/$mod"
    if [[ ! -f "$dir/mod.json" || -L "$dir" ]]; then
      printf 'Expected an installed mod directory: %s\n' "$dir" >&2
      exit 1
    fi
  done
else
  for destination in "$app_home"/mods/{grouped-spaces,grouped-spaces-menu,space-group-picker} "$layout"; do
    if [[ -e "$destination" || -L "$destination" ]]; then
      printf 'Already exists; not overwriting: %s\n' "$destination" >&2
      exit 1
    fi
  done
  mkdir -p -- "$app_home/mods" "$app_home/layouts"
  for mod in "${mods[@]}"; do mkdir -- "$app_home/mods/$mod"; done
fi

copy_mod_file() {
  local source=$1 destination="$app_home/mods/$2/${1##*/}"
  if [[ -L "$destination" || ( -e "$destination" && ! -f "$destination" ) ]]; then
    printf 'Not a regular file; not overwriting: %s\n' "$destination" >&2
    exit 1
  fi
  cp -- "$source" "$destination"
}
for mod in "${mods[@]}"; do
  for file in "mods/$mod/"*.js "mods/$mod/mod.json"; do copy_mod_file "$file" "$mod"; done
done
for icon in mods/grouped-spaces/*.svg; do copy_mod_file "$icon" grouped-spaces; done
if ! $update; then cp -n -- layouts/grouped-spaces.json "$layout"; fi
printf 'Installed in %s. Switch to the grouped-spaces layout in Herdr.\n' "$app_home"
