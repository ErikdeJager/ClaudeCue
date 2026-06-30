---
name: cleanup-branches
description: >-
  Safely clean up merged and stale git branches — local, and optionally remote. Use when the
  user invokes /cleanup-branches or asks to clean up / prune / tidy / delete / remove old,
  merged, stale, gone, or "behind" branches, or says "delete branches that are behind". Fetches
  and prunes, fast-forward-updates the default branch, then classifies every local and remote
  branch against the default: it KEEPS any branch with real (non-merge) commits ahead, and
  deletes the rest — and it counts a branch that is ahead ONLY by merge commits as deletable,
  not as ahead. Always asks first whether to clean local-only or local + remote, and shows the
  full deletion plan for confirmation before removing anything. Auto-detects the default branch
  and remote, so it needs no configuration.
allowed-tools: Bash Read
---

# cleanup-branches — delete merged/stale branches, keep anything genuinely ahead

Prune branches that have nothing unique left in them, while never touching a branch that
still holds real work. The decision is made **per branch, against the repository's default
branch**, and the **merge-commit rule** is central:

> A branch is "ahead" — and therefore **kept** — only if it has **non-merge** commits that
> are not in the default branch. A branch whose only unique commits are **merge commits**
> (e.g. someone merged the default branch *into* it but added no work of their own) counts as
> **not ahead**, and is a deletion candidate.

This skill is **destructive** (it deletes branches) and may be **outward-facing** (it can
delete remote branches). It therefore (1) **asks the scope** — local-only vs local + remote —
before doing anything, and (2) **shows the full plan and waits for confirmation** before any
deletion. Until you confirm, everything it runs is read-only.

## What it never deletes

- The **default branch** (auto-detected — `main`, `master`, or whatever the remote's HEAD
  points at). Never deleted, never force-pushed.
- The **currently checked-out branch** (`HEAD`).
- A branch **checked out in another worktree** (git won't delete it; the skill skips it).
- Any branch with **real non-merge commits ahead** of the default branch — that's unmerged
  work; it is reported and kept.

## Steps

### 1 · Fetch and prune

```bash
git fetch --all --prune
```

This refreshes every remote-tracking ref and drops ones whose upstream is gone, so the
ahead/behind counts are accurate and "[gone]" branches surface.

### 2 · Resolve the remote and the default branch (no hardcoding)

The analysis script (next step) auto-detects both, but resolve them yourself too so you can
report them and update the default branch:

```bash
# remote: the only remote, else 'origin', else ask the user which one
REMOTE=$(git remote | grep -qx origin && echo origin || git remote | head -n1)
# default branch: the remote's HEAD, else fall back
DEF=$(git symbolic-ref --quiet --short "refs/remotes/$REMOTE/HEAD" 2>/dev/null | sed "s#^$REMOTE/##")
[ -z "$DEF" ] && DEF=$(git ls-remote --symref "$REMOTE" HEAD 2>/dev/null | awk '/^ref:/{sub("refs/heads/","",$2);print $2;exit}')
[ -z "$DEF" ] && for c in main master trunk develop; do git show-ref -q --verify "refs/remotes/$REMOTE/$c" && DEF=$c && break; done
echo "remote=$REMOTE default=$DEF"
```

If there are **multiple remotes** and none is `origin`, or the default branch can't be
resolved, **ask the user** rather than guess.

### 3 · Update the default branch (fast-forward only)

Bring the local default branch up to its upstream — **only** as a fast-forward, never a merge
commit, never a force:

```bash
CUR=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || echo "")
if [ "$CUR" = "$DEF" ]; then
  git pull --ff-only
else
  # fast-forward the local default branch WITHOUT checking it out; refuses if not a ff
  git fetch "$REMOTE" "$DEF:$DEF"
fi
```

If this reports a non-fast-forward rejection, the default branch has diverged from its
upstream — **report that and stop updating it** (do not force). Branch cleanup can still
proceed against `"$REMOTE/$DEF"`.

### 4 · Classify every branch (read-only)

Run the bundled analyzer. It is strictly read-only (only git read commands) and prints a TSV
table classifying each local and remote branch against `"$REMOTE/$DEF"`:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/analyze-branches.sh"
# or pass overrides:  ... analyze-branches.sh "$REMOTE" "$DEF"
```

Columns: `scope  branch  behind  ahead  ahead_nomerge  contained  verdict  tip`. The
`verdict` encodes the rule above:

| verdict | meaning | action |
|---|---|---|
| `keep-default` | the default branch | never delete |
| `keep-current` | the checked-out branch | never delete |
| `keep-worktree` | checked out in another worktree | skip (cannot delete) |
| `keep-ahead` | has real non-merge commits ahead (`ahead_nomerge > 0`) | **keep — unmerged work** |
| `delete-merged` | fully contained in the default branch | delete (safe `git branch -d`) |
| `delete-merge-only` | ahead **only** by merge commits (`ahead_nomerge == 0`, not contained) | delete (force `git branch -D`) |

`delete-merged` and `delete-merge-only` are the only deletion candidates. Read the table; do
not re-derive the counts by hand.

### 5 · Ask the scope (before any deletion)

Use `AskUserQuestion` to ask whether to clean **local only** or **local + remote**:

- **Local only** — delete only local branches; report stale remote branches but leave them.
- **Local + remote** — also delete the stale branches on `"$REMOTE"` (needs push access).

Do not assume; this gates whether remote branches are touched at all.

### 6 · Present the plan and confirm

Show the user a concise plan built from the table, grouped by action:

- **Will delete (local):** each `delete-merged` / `delete-merge-only` local branch — mark
  which need a **force delete** (`delete-merge-only`) and why ("ahead only by a merge
  commit").
- **Will delete (remote):** each remote deletion candidate — **only if scope is local +
  remote**; otherwise list them under "left untouched (local-only scope)".
- **Kept:** `keep-ahead` branches (with their `ahead_nomerge` count) and the default/current
  branches — so the user sees nothing with real work is being removed.

**Wait for explicit confirmation.** If the user declines or wants to adjust, stop or amend the
set. Never delete a branch that isn't a deletion candidate in the table.

### 7 · Delete

Record each branch's tip SHA first (so the user can recover it), then delete per verdict.

**Local — contained (`delete-merged`)** — safe delete:

```bash
git branch -d <branch>      # refuses if not fully merged; that's a safety net
```

**Local — merge-only (`delete-merge-only`)** — `git branch -d` will refuse these ("not fully
merged"), because the merge commit isn't in the default branch. Only because the analyzer
verified `ahead_nomerge == 0` (no real unique work) is a **force delete** correct:

```bash
git rev-parse <branch>      # note the SHA for recovery
git branch -D <branch>      # force; justified ONLY for verified delete-merge-only branches
```

**Remote (local + remote scope only)** — for each remote deletion candidate (use the short
branch name, without the `<remote>/` prefix):

```bash
git push "$REMOTE" --delete <branch>
```

If a remote deletion fails (no push access, protected branch), report it and continue with
the rest. Never force-delete a branch the table classified `keep-ahead`.

### 8 · Report

- The resolved **remote** and **default branch**, and whether the default branch was
  fast-forwarded (and to what), or left alone (and why).
- **Deleted** branches (local and, if in scope, remote), each with its recorded tip SHA.
- **Kept** branches that had real commits ahead (with `ahead_nomerge` counts) — so it's clear
  nothing unmerged was lost.
- **Skipped** branches (worktree-checked-out, failed remote deletes) and why.
- **Recovery:** a local branch is restorable with `git branch <name> <sha>`; a remote branch
  with `git push "$REMOTE" <sha>:refs/heads/<name>` (from the recorded SHAs).

## Guardrails

- **Read-only until confirmed.** Fetch, the default-branch fast-forward, and the analyzer are
  the only things that run before the scope choice + confirmation; nothing is deleted until
  the user approves the plan.
- **The merge-commit rule is the whole point.** A branch ahead only by merge commits is
  deletable; a branch ahead by even one real (non-merge) commit is kept. Trust the analyzer's
  `ahead_nomerge` column for this — don't eyeball `git log`.
- **Force-delete only verified candidates.** `git branch -D` is used solely for
  `delete-merge-only` branches the analyzer confirmed have `ahead_nomerge == 0`. Never force
  a `keep-ahead` branch.
- **Default and current branches are sacred** — never deleted, the default branch is only ever
  fast-forwarded.
- **When unsure** — multiple remotes with no `origin`, an undetectable default branch, a
  diverged default branch, or an ambiguous plan — **ask**, don't guess. This deletes things.
