#!/usr/bin/env bash
#
# analyze-branches.sh — classify local & remote branches against the default branch.
#
# READ-ONLY. Runs only git *read* commands (for-each-ref, rev-list, merge-base,
# symbolic-ref, ls-remote, rev-parse). It never deletes, moves, fetches-into, or commits
# anything. The skill performs deletions itself, after a scope choice and an explicit
# confirmation.
#
# Run `git fetch --all --prune` BEFORE this so the counts reflect the remote.
#
# Usage: analyze-branches.sh [REMOTE] [DEFAULT_BRANCH]
#   REMOTE          default: the only remote, else 'origin', else error.
#   DEFAULT_BRANCH  default: resolved from the remote's HEAD, else main/master/trunk/develop.
#
# Output: a header line `# remote=<r> default=<d> current=<c>`, then a TSV table with a
# header row and one row per branch:
#   scope <TAB> branch <TAB> behind <TAB> ahead <TAB> ahead_nomerge <TAB> contained <TAB> verdict <TAB> tip
#
#   scope    : local | remote
#   behind   : commits in the default branch not in this branch
#   ahead    : commits in this branch not in the default branch (ALL commits)
#   ahead_nomerge : same, but EXCLUDING merge commits — the real, unique work
#   contained: yes if this branch's tip is an ancestor of the default branch (fully merged)
#   verdict  : keep-default | keep-current | keep-ahead | keep-worktree
#              | delete-merged       (contained — safe `git branch -d`)
#              | delete-merge-only   (ahead ONLY by merge commits — needs `git branch -D`)
#
# The merge-commit rule lives here: a branch counts as "ahead" (keep-ahead) ONLY when
# ahead_nomerge > 0. A branch whose unique commits are all merge commits has
# ahead_nomerge == 0, so it is a deletion candidate (delete-merge-only).

set -u

die() { echo "error: $*" >&2; exit 2; }

# --- resolve the remote ---
REMOTE="${1:-}"
if [ -z "$REMOTE" ]; then
  n=$(git remote | grep -c . || true)
  if [ "$n" -eq 0 ]; then
    die "no git remotes configured"
  elif [ "$n" -eq 1 ]; then
    REMOTE=$(git remote)
  elif git remote | grep -qx origin; then
    REMOTE=origin
  else
    die "multiple remotes ($(git remote | tr '\n' ' ')); pass one explicitly as arg 1"
  fi
fi
git remote | grep -qx "$REMOTE" || die "remote '$REMOTE' not found"

# --- resolve the default branch (never hardcode main) ---
DEFAULT="${2:-}"
if [ -z "$DEFAULT" ]; then                       # 1) the local symref, if populated
  ref=$(git symbolic-ref --quiet "refs/remotes/$REMOTE/HEAD" 2>/dev/null || true)
  [ -n "$ref" ] && DEFAULT=${ref#"refs/remotes/$REMOTE/"}
fi
if [ -z "$DEFAULT" ]; then                       # 2) ask the remote (read-only)
  DEFAULT=$(git ls-remote --symref "$REMOTE" HEAD 2>/dev/null \
            | awk '/^ref:/ { sub("refs/heads/", "", $2); print $2; exit }')
fi
if [ -z "$DEFAULT" ]; then                       # 3) common fallbacks
  for cand in main master trunk develop; do
    if git show-ref --verify --quiet "refs/remotes/$REMOTE/$cand"; then DEFAULT=$cand; break; fi
  done
fi
[ -n "$DEFAULT" ] || die "could not determine the default branch; pass it explicitly as arg 2"

BASE="$REMOTE/$DEFAULT"
git rev-parse --verify --quiet "$BASE" >/dev/null || die "base ref '$BASE' not found (did you fetch?)"

CUR=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)   # empty on detached HEAD

printf '# remote=%s default=%s current=%s\n' "$REMOTE" "$DEFAULT" "${CUR:-<detached>}"
printf 'scope\tbranch\tbehind\tahead\tahead_nomerge\tcontained\tverdict\ttip\n'

# classify one ref. args: scope ref displayname is_default is_current worktree
classify() {
  scope=$1; ref=$2; name=$3; is_default=$4; is_current=$5; wt=$6
  behind=$(git rev-list --count "$ref..$BASE" 2>/dev/null || echo 0)
  ahead=$(git rev-list --count "$BASE..$ref" 2>/dev/null || echo 0)
  ahead_nm=$(git rev-list --count --no-merges "$BASE..$ref" 2>/dev/null || echo 0)
  if git merge-base --is-ancestor "$ref" "$BASE" 2>/dev/null; then contained=yes; else contained=no; fi
  tip=$(git rev-parse --short "$ref" 2>/dev/null || echo "?")
  if   [ "$is_default" = yes ]; then verdict=keep-default
  elif [ "$is_current" = yes ]; then verdict=keep-current
  elif [ -n "$wt" ];            then verdict=keep-worktree
  elif [ "$ahead_nm" -gt 0 ];   then verdict=keep-ahead
  elif [ "$contained" = yes ];  then verdict=delete-merged
  else                               verdict=delete-merge-only
  fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$scope" "$name" "$behind" "$ahead" "$ahead_nm" "$contained" "$verdict" "$tip"
}

# --- local branches (worktreepath is non-empty when the branch is checked out somewhere,
#     in which case it cannot be deleted — flag it keep-worktree, never a delete candidate) ---
git for-each-ref --format='%(refname:short)%09%(worktreepath)' refs/heads | \
while IFS=$'\t' read -r name wt; do
  [ -n "$name" ] || continue
  is_default=no; [ "$name" = "$DEFAULT" ] && is_default=yes
  is_current=no; [ -n "$CUR" ] && [ "$name" = "$CUR" ] && is_current=yes
  classify local "$name" "$name" "$is_default" "$is_current" "$wt"
done

# --- remote-tracking branches on $REMOTE (skip the HEAD symref, which shortens to just
#     the remote name, e.g. `origin`) ---
git for-each-ref --format='%(refname)%09%(refname:short)' "refs/remotes/$REMOTE" | \
while IFS=$'\t' read -r fullref full; do
  [ -n "$fullref" ] || continue
  case "$fullref" in */HEAD) continue ;; esac
  short=${full#"$REMOTE/"}
  is_default=no; [ "$short" = "$DEFAULT" ] && is_default=yes
  classify remote "$full" "$short" "$is_default" no ""
done
