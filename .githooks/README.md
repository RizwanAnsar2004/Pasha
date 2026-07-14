# Deploy pre-push hook

Packages the Next.js **standalone** build into a server-ready tarball whenever
you push the **`deploy`** branch, commits it, and pushes it with the commit.
Pushing any other branch does nothing (immediate push).

## Files

| File            | Role                                                                 |
|-----------------|----------------------------------------------------------------------|
| `pre-push`      | **Default hook — pure POSIX shell.** Works on every Windows dev machine (needs only Git for Windows, which bundles Git Bash + `tar`). No PowerShell dependency. |
| `pre-push.ps1`  | *Optional* PowerShell implementation, same behaviour. Only if you'd rather run PowerShell. |

## Install (run once, per clone)

```sh
git config core.hooksPath .githooks
```

That's it — because `.githooks/` is committed to the repo, every dev gets the
same hook after running that single command. (Git does not auto-run hooks from
a tracked folder without this setting, so each clone runs it once.)

### Want the PowerShell version instead of the shell one?

Replace the shell hook's body with a shim that calls the `.ps1`:

```sh
printf '#!/bin/sh\nexec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(dirname "$0")/pre-push.ps1" "$1" "$2"\n' > .githooks/pre-push
```

## What ends up in the tarball (`next-standalone.tar.gz`, repo root)

A layout you can extract on the server and run with `node server.js`:

```
./              <- contents of .next/standalone (includes server.js + node_modules)
./.next/static  <- from .next/static
./public        <- from public/
```

## Requirements / notes

- Your `next.config.*` must set `output: 'standalone'`.
- On a `deploy` push the hook **builds first** (`npm run build`), then packages —
  so the tarball always matches the latest code. Set env `PREPUSH_SKIP_BUILD=1`
  to skip the rebuild and reuse an existing `.next/standalone`.
- The hook only packages when `deploy` is the **checked-out** branch (it commits
  onto `HEAD`). Pushing `deploy` from another branch just pushes as-is.
- After a successful deploy push you will see a benign
  `error: failed to push some refs` line. **That is expected** — git had already
  locked the pre-tarball commit for the push, so the hook pushes the new
  commit itself and aborts the stale original. The tarball + commit are on the
  remote.
- Committing tarballs grows the git history. For large/very-frequent artifacts,
  consider Git LFS or publishing the tarball as a release asset instead.
