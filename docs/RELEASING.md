# Releasing Herdr Space Grouping

| Branch | Ownership |
| --- | --- |
| `develop` (default) | Review and merge feature PRs here. |
| `testing` | CI fast-forwards this to a verified, current develop commit. No direct edits, rebases, or force pushes. |
| `stable` | Maintainers manually open and merge a PR from testing. Never push a release commit or tag by hand. |

1. Set `VERSION` on develop by PR to the intended `X.Y.Z` (patch for fixes, minor for compatible features, major for breaking changes). For the first release, keep the initial `0.1.0` if it still fits. Bootstrap seeds all branches at the same commit; the first promotion PR needs at least one new tested commit. Wait for both CI jobs and the promotion job.
2. Smoke-test the testing commit using [the contributor checklist](../CONTRIBUTING.md). Open **testing → stable** yourself. Check that the PR head is still the exact SHA you smoke-tested before merging; if CI moves testing in the meantime, verify the new head before promoting it. Use **Create a merge commit**, not squash or rebase, so release automation can verify the tested parent. To enforce the tested SHA at merge time, use `gh pr merge PR_NUMBER --merge --match-head-commit TESTED_SHA`.
3. The **Stable release** workflow retests and packages the merge commit, creates the annotated `vX.Y.Z` tag, and publishes the ZIP and SHA-256 sidecar in the [Releases page](https://github.com/kaizen-inc/HerdrSpaceGrouping/releases). Download and verify the checksum, then smoke-test installing/updating from the asset.
4. If publishing fails, inspect Actions and rerun the same workflow. If the tag already points to that merge commit, the workflow reuses it. If it points elsewhere, bump the version through the normal branch flow; never move a published tag. If CI cannot advance testing, fix the permissions or investigate the unexpected divergence rather than force-pushing.

The CI and release jobs use the repository workflow token only. They require permission to update testing and create tags/releases respectively. Protect develop and stable with PR reviews and the **checks (ubuntu-latest)** and **checks (windows-latest)** status checks. Keep merge commits enabled. Restrict non-PR pushes to testing if org policy offers a bypass for Actions; do not set a PR requirement there that blocks the automation.

## Share with Herdr

This is a community **layout containing mods**, because it replaces the Spaces panel and needs a layout file. Herdr's [gallery](https://herdr.dev/layouts) asks for a public GitHub repo with `layouts/`, `mods/`, `RECIPE.md`, and `preview.png` together, and the GitHub topic **herdr-layout**. This project's demo screenshot contains no personal workspace data.

After the first stable release, verify the gallery files on the default branch (develop) and add the topic: `gh repo edit kaizen-inc/HerdrSpaceGrouping --add-topic herdr-layout`. Check the gallery after indexing; Herdr says it usually appears within an hour and screens community images. Users wanting supported code should download the tagged release rather than the default branch. The gallery is not an endorsement or a review. Optionally share the release link on [Herdr Discord](https://discord.gg/PsgRfzmUDg).
