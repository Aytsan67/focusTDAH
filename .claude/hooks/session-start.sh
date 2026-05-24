#!/bin/bash
set -euo pipefail

# Only run in remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Configure le remote GitHub avec le token (lu depuis la variable d'env GH_TOKEN)
# Pour configurer : Claude Code sur le web → Settings → Environment variables → GH_TOKEN
if [ -n "${GH_TOKEN:-}" ]; then
  git -C "${CLAUDE_PROJECT_DIR}" remote set-url origin \
    "https://${GH_TOKEN}@github.com/anastasyabm-stack/Tache-.git"
  echo "Remote git configuré avec GH_TOKEN ✓"
else
  echo "⚠️  GH_TOKEN non défini — configure-le dans Settings → Environment variables"
fi
