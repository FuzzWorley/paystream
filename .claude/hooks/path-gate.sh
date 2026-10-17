#!/usr/bin/env bash
# PreToolUse gate for the file tools (Read / Write / Edit / NotebookEdit / Glob / Grep).
#
# The Bash gate matches command text; this one inspects the tool's actual path
# argument, so it is the reliable half of the "nothing outside this directory" rule.
#
# Policy:
#   - Writes (Write/Edit/NotebookEdit): project, scratchpad or this project's memory.
#   - Reads  (Read/Glob/Grep):          those, plus system/tooling prefixes.
#   - Anything else ASKS.
#
# Fails CLOSED: an unparseable payload or a missing jq asks rather than allows.
#
# A hook has four replies: deny, ask, allow and silence. "allow" skips the permission
# system entirely, including the editor's Manual / edit-automatically toggle, so
# in-project writes get silence and the toggle decides. Reads keep the fast path.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

ask() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"%s"}}' "$1"
  exit 0
}
# `writing` defaults to 0 because `allow` can run before it is assigned.
allow() {
  [ "${writing:-0}" -eq 1 ] ||
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
}

command -v jq >/dev/null 2>&1 || ask "Permission gate cannot run (jq not found) — failing closed."

payload=$(cat)
tool=$(printf '%s' "$payload" | jq -r '.tool_name // empty' 2>/dev/null) \
  || ask "Permission gate could not read the tool name — failing closed."

paths=$(printf '%s' "$payload" | jq -r '
  [.tool_input.file_path?, .tool_input.notebook_path?, .tool_input.path?]
  | map(select(type == "string" and . != ""))
  | .[]' 2>/dev/null) \
  || ask "Permission gate could not read the target path — failing closed."

# No path argument at all (e.g. Grep scoped to the working directory): nothing to check.
[ -n "$paths" ] || allow

MEMORY_DIR="${HOME}/.claude/projects/${PROJECT_DIR//\//-}/memory"
SCRATCH="/private/tmp/claude-$(id -u)|/tmp/claude-$(id -u)"

WRITE_OK="^(${PROJECT_DIR}|${MEMORY_DIR}|${SCRATCH})(/|\$)"
READ_OK='^(/usr|/bin|/sbin|/opt|/etc|/Library|/System|/Applications|/dev|/var/folders|/private/var/folders)(/|$)'

case "$tool" in
  Write|Edit|MultiEdit|NotebookEdit) writing=1 ;;
  *)                                 writing=0 ;;
esac

while IFS= read -r p; do
  [ -n "$p" ] || continue

  # Unresolvable traversal — treat as outside.
  case "$p" in
    */../*|../*|*/..) ask "Path ${p} contains a '..' segment and may resolve outside this project." ;;
  esac

  # The gate's own configuration lives inside the project, so confinement alone would
  # let it be rewritten. Changing what protects you is always your call.
  if [ "$writing" -eq 1 ]; then
    case "$p" in
      "${PROJECT_DIR}"/.claude/*|.claude/*) ask "${tool} modifies the permission gate's own configuration (${p})." ;;
    esac
  fi

  # Relative paths resolve against the working directory, which is the project.
  case "$p" in
    /*) ;;
    *)  continue ;;
  esac

  printf '%s' "$p" | grep -Eq "$WRITE_OK" && continue
  if [ "$writing" -eq 0 ] && printf '%s' "$p" | grep -Eq "$READ_OK"; then continue; fi

  ask "${tool} targets ${p}, which is outside this project directory."
done <<EOF
$paths
EOF

allow
