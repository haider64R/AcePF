#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if command -v node >/dev/null 2>&1; then
  exec node scripts/server.js
fi
runtime_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [[ -x "$runtime_node" ]]; then
  exec "$runtime_node" scripts/server.js
fi
print 'Install Node.js 22 or newer, then run this launcher again.'
read '?Press Return to close.'
