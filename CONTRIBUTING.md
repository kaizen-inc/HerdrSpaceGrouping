# Contributing

Open feature and fix PRs against **develop**. Do not push changes directly to **testing** or **stable**. See [Releasing](docs/RELEASING.md) for those branches.

Use Node.js 24, Python 3, Bash (Git Bash on Windows), and Herdr App 0.1.18 for runtime checks. No JavaScript dependencies or compilation are required.

```sh
node --test
python scripts/package.py
```

`mods/grouped-spaces/` renders the sidebar and owns the canonical grouping model; `grouped-spaces-menu/` adapts the stock menu and `space-group-picker/` renders assignment and settings. After editing the model, run `cp mods/grouped-spaces/groups.js mods/space-group-picker/groups.js`. CI checks that the copies match so gallery installs work without running a generator.

Test the installer and the three mods without writing to your normal app home:

```sh
(
  export HERDR_APP_HOME="$(mktemp -d)"
  trap 'rm -rf -- "$HERDR_APP_HOME"' EXIT
  bash install.sh
  for mod in grouped-spaces grouped-spaces-menu space-group-picker; do
    herdr-app check "$HERDR_APP_HOME/mods/$mod"
  done
)
```

The check loads an initial render only. Also smoke-test in a separate Herdr app home: switch layouts; assign and unassign a space; collapse and expand all; rename a group including one without members; reload and confirm state; test narrow mode. Do not put real workspace names or terminals in public screenshots. Review the [upstream mod guide](https://github.com/herdrdev/herdr-app/blob/master/docs/mods.md) for API changes.
