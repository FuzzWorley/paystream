#!/usr/bin/env bash
# PreToolUse Bash gate — PROJECT-SCOPED to this repository.
#
# Policy:
#   1. ASK for destructive / irreversible / outward-facing commands.
#   2. ASK for any command that appears to touch a path outside this project.
#      Exceptions: Claude's scratchpad (read+write), this project's Claude memory
#      (read+write) and system/tooling prefixes (read). Writes into system prefixes ask.
#   3. ALLOW everything else with no prompt.
#
# Fails CLOSED: an unparseable payload or a missing jq asks rather than allows.
# Deleting this file + its entry in .claude/settings.json reverts to normal prompting.
#
# Known limit: this matches command TEXT, not resolved paths. That is why `..` in any
# form asks instead of being resolved (`rm -rf ./scratch/../../real-project`).

# The project root is two levels above this file, unless Claude Code says otherwise.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

ask() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"%s"}}' "$1"
  exit 0
}
allow() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
}

command -v jq >/dev/null 2>&1 || ask "Permission gate cannot run (jq not found) — failing closed."

cmd=$(cat | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -n "$cmd" ] || ask "Permission gate could not read the command — failing closed."

m() { printf '%s' "$cmd" | grep -Eq "$1"; }

# ---------------------------------------------------------------------------
# 1. Destructive / irreversible / outward-facing
# ---------------------------------------------------------------------------

# Git operation touching the main branch (a mutating git verb AND a `main` ref token).
if m 'git[[:space:]]+(push|pull|fetch|merge|reset|checkout|switch|rebase|branch|cherry-pick|revert|clean|tag)' \
   && m '(^|[[:space:]/:])main([[:space:]~^:]|$)'; then
  ask "Git operation referencing the main branch."
fi

# --force / --hard flags (NOT bare -f, which is benign in tar/curl/grep/docker/etc.).
if m '(--force|--force-with-lease|--hard)([[:space:]=]|$)'; then
  ask "Command uses a --force / --hard flag."
fi

# Destructive / outward-facing filesystem + system commands.
if m '(^|[|&;[:space:]])(rmdir|dd|shred|truncate|sudo|sftp|scp)([[:space:]]|$)'; then
  ask "Destructive or outward-facing command."
fi

# `rm` of one named file inside the project is ordinary work; recursion, wildcards and
# anything beyond the project are what cause damage. `destructive` makes the path scan
# below require a WRITE_OK root, so `rm /etc/hosts` asks although /etc is readable.
destructive=0
if m '(^|[|&;[:space:]])rm([[:space:]]|$)'; then
  destructive=1
  if m '(^|[[:space:]])-[A-Za-z]*[rR]' ; then
    ask "Recursive rm."
  fi
  if m 'rm[[:space:]][^|;&]*[*?\[]'; then
    ask "rm with a wildcard."
  fi
  if ! m 'rm([[:space:]]+-[A-Za-z]+)*[[:space:]]+[^-|;&[:space:]]'; then
    ask "rm with no explicit path."
  fi
fi

# History-rewriting / discarding git subcommands. `commit` is absent on purpose: each
# commit is already approved in conversation, so a prompt here only asked twice.
if m 'git[[:space:]]+(push|reset|clean|restore|rebase|filter-branch|cherry-pick)([[:space:]]|$)' \
   || m 'git[[:space:]]+commit[[:space:]][^|;&]*--amend' \
   || m 'git[[:space:]]+(stash[[:space:]]+(drop|clear)|worktree[[:space:]]+remove|branch[[:space:]]+-[DfF])'; then
  ask "Potentially destructive git command."
fi
# git checkout that discards working-tree changes (checkout -- <file>, checkout .).
if m 'git[[:space:]]+checkout[[:space:]]+(--([[:space:]]|$)|\.([[:space:]]|$))'; then
  ask "git checkout that discards working-tree changes."
fi

# Outward-facing publish / merge / deploy.
if m '(gh[[:space:]]+(pr[[:space:]]+merge|release[[:space:]]+create|repo[[:space:]]+(create|delete|edit))|npm[[:space:]]+publish|gem[[:space:]]+push)'; then
  ask "Outward-facing publish / merge."
fi
if m '(wrangler[[:space:]]+(deploy|delete|secret)|npm[[:space:]]+run[[:space:]]+deploy)'; then
  ask "Deploys or changes the live site."
fi

# Pipe-to-shell installers (untrusted remote code execution).
if m '(curl|wget)[[:space:]].*\|[[:space:]]*(sudo[[:space:]]+)?(ba)?sh([[:space:]]|$)'; then
  ask "Piping downloaded content into a shell."
fi

# The gate's own configuration, reached through the shell rather than an edit tool.
# path-gate.sh covers Write/Edit; this stops `ln`/`cp`/a redirect weakening the gate.
if m '(^|[[:space:]|&;])(ln|cp|mv|install|touch|mkdir|chmod|rm|tee)([[:space:]][^|;&]*)?\.claude/' \
   || m '>>?[[:space:]]*[^|;&]*\.claude/' \
   || m 'sed[[:space:]][^|;&]*-i[^|;&]*\.claude/'; then
  ask "Command modifies the permission gate's own configuration (.claude/)."
fi

# ---------------------------------------------------------------------------
# 2. Confinement — nothing outside this project without explicit permission
# ---------------------------------------------------------------------------

# This project's Claude memory store: Claude's own notes, written often. The rest of
# ~/.claude is deliberately NOT exempt, so changes to settings still prompt.
MEMORY_DIR="${HOME}/.claude/projects/${PROJECT_DIR//\//-}/memory"
SCRATCH="/private/tmp/claude-$(id -u)|/tmp/claude-$(id -u)"

WRITE_OK="^(${PROJECT_DIR}|${MEMORY_DIR}|${SCRATCH})(/|\$)"
READ_OK='^(/usr|/bin|/sbin|/opt|/etc|/Library|/System|/Applications|/dev|/var/folders|/private/var/folders)(/|$)'

# Home-directory shorthands reach outside the project by definition.
if m '(^|[[:space:]"'"'"'=<>|&(])(~|\$HOME|\$\{HOME\})(/|[[:space:]]|$)'; then
  ask "Command references the home directory, which is outside this project."
fi

# Parent-directory traversal, deliberately not resolved.
if m '(^|[[:space:]"'"'"'=<>|&(/])\.\.(/|[[:space:]]|$)'; then
  ask "Command contains a '..' parent-directory reference; it may resolve outside this project."
fi

# Output redirected into a system prefix (the scan below cannot tell a read from a write).
if m '>>?[[:space:]]*(/usr|/bin|/sbin|/opt|/etc|/Library|/System|/Applications|/var)(/|$)'; then
  ask "Command redirects output into a system path outside this project."
fi

# Every absolute-path token must sit under an allowed root. The leading character
# class keeps URLs (`https://…`) out of the scan.
tokens=$(printf '%s' "$cmd" \
  | grep -oE '(^|[[:space:]"'"'"'=<>|&(])/[A-Za-z0-9._@%+-]+[A-Za-z0-9._@%+/-]*' \
  | sed -E 's/^[^/]*//')

# Only tokens whose first segment is a real top-level directory count as paths, so
# `s/x/y/g` in a sed script or an API route like `/api/rates` does not prompt.
KNOWN_ROOTS='^/(Users|Volumes|home|root|Applications|Library|System|usr|bin|sbin|etc|var|tmp|private|opt|dev|net|mnt|srv)(/|$)'

while IFS= read -r p; do
  [ -n "$p" ] || continue
  printf '%s' "$p" | grep -Eq "$KNOWN_ROOTS" || continue
  printf '%s' "$p" | grep -Eq "$WRITE_OK" && continue
  [ "$destructive" -eq 1 ] && ask "Deleting ${p}, which is outside this project directory."
  printf '%s' "$p" | grep -Eq "$READ_OK" && continue
  ask "Command references ${p}, which is outside this project directory."
done <<EOF
$tokens
EOF

# ---------------------------------------------------------------------------
# 3. Everything else: allow with no prompt.
# ---------------------------------------------------------------------------
allow
