#!/bin/bash
#
# The built app on :8790, for screenshots and layout checks.
#
#     npm run ux:up        # build and serve
#     npm run ux:shots     # every screen, desktop and phone, every skin and scheme
#     npm run ux:measure   # phone widths; fails while any screen is wider than 390px
#     npm run ux:down
#
# There is no server-side data: whatever a screenshot shows was typed by the script.

set -euo pipefail

PORT=8790
BASE="http://localhost:$PORT"
ROOT="${TMPDIR:-/tmp}/paystream-ux"
LOG="$ROOT/preview.log"

if curl -sf "$BASE/" >/dev/null 2>&1; then
  echo "Something is already on :$PORT — run npm run ux:down first." >&2
  exit 1
fi
mkdir -p "$ROOT"

echo "building"
npm run build >/dev/null

echo "serving on :$PORT (log: $LOG)"
nohup npx vite preview --port "$PORT" --strictPort >"$LOG" 2>&1 &

for _ in $(seq 1 30); do
  curl -sf "$BASE/" >/dev/null 2>&1 && { echo "  $BASE"; exit 0; }
  sleep 1
done
echo "Preview did not start; see $LOG" >&2
exit 1
