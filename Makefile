SHELL := /usr/bin/env bash
.SHELLFLAGS := -eo pipefail -c

VERSION ?=
MSG ?= Update

.PHONY: help package install bump release push clean import sync

help:
	@echo "justaperlhacker/vscode-themes"
	@echo
	@echo "  make import ZED=/path/to/theme.json       Convert a Zed theme -> themes/ and sync manifest"
	@echo "  make sync                                 Regenerate contributes.themes from themes/"
	@echo "  make package                              Build the .vsix"
	@echo "  make install                              Package, then install into VS Code (--force)"
	@echo "  make bump VERSION=0.5.0 MSG='Add Foo'     Bump package.json + prepend CHANGELOG entry"
	@echo "  make release VERSION=0.5.0 MSG='Add Foo'  bump + package + install + commit + push"
	@echo "  make push MSG='Add Foo'                   Commit and push current changes"
	@echo "  make clean                                Remove built .vsix files"
	@echo
	@echo "Quick iteration: open this folder in VS Code and press F5 (no install needed)."

import:
	@if [ -z "$(ZED)" ]; then echo "error: ZED is required, e.g. make import ZED=/path/to/theme.json"; exit 2; fi
	node scripts/zed-to-vscode.mjs "$(ZED)" --force
	node scripts/sync-manifest.mjs

sync:
	node scripts/sync-manifest.mjs

package:
	rm -f vscode-themes-*.vsix
	npx --yes @vscode/vsce package

install: package
	code --install-extension "$$(ls -t vscode-themes-*.vsix | head -1)" --force
	@echo "Reload VS Code (Developer: Reload Window) to see the new themes."

bump:
	@if [ -z "$(VERSION)" ]; then echo "error: VERSION is required, e.g. make bump VERSION=0.5.0"; exit 2; fi
	@node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));p.version='$(VERSION)';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
	@tmp=$$(mktemp); { printf '# Changelog\n\n## %s\n\n- %s\n' '$(VERSION)' '$(MSG)'; tail -n +2 CHANGELOG.md; } > $$tmp; mv $$tmp CHANGELOG.md
	@echo "Bumped to $(VERSION)"

release: bump package install push
	@echo "Released v$(VERSION)"

push:
	@git add -A
	@git commit -m "$(MSG) (v$(VERSION))" || echo "Nothing to commit."
	@git push

clean:
	rm -f vscode-themes-*.vsix
