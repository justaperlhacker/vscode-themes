#!/usr/bin/env node
// Convert a Zed theme file into one or more VS Code color theme files.
//
// Usage:
//   node scripts/zed-to-vscode.mjs <zed-theme.json> [--outdir themes] [--force]
//
// Each Zed variant (dark/light, etc.) becomes its own VS Code theme JSON.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
if (!input) {
  console.error('usage: zed-to-vscode.mjs <zed-theme.json> [--outdir DIR] [--force]');
  process.exit(2);
}
const outdir = (() => {
  const i = args.indexOf('--outdir');
  return i >= 0 ? args[i + 1] : 'themes';
})();
const force = args.includes('--force');

// ---------------------------------------------------------------------------
// Zed syntax token -> VS Code TextMate scopes (ordered: later wins overlaps)
// ---------------------------------------------------------------------------
const SYNTAX = [
  ['comment', ['comment', 'punctuation.definition.comment']],
  ['comment.doc', ['comment.block.documentation', 'comment.line.documentation']],
  ['string', ['string', 'string.quoted', 'string.template']],
  ['string.escape', ['constant.character.escape', 'punctuation.definition.escape']],
  ['string.regex', ['string.regexp']],
  ['string.special', ['string.other', 'string.special']],
  ['string.special.symbol', ['constant.other.symbol', 'string.special.symbol']],
  ['text.literal', ['markup.inline.raw', 'markup.raw', 'text.literal']],
  ['number', ['constant.numeric']],
  ['boolean', ['constant.language.boolean']],
  ['constant', ['constant', 'support.constant']],
  ['character', ['constant.character']],
  ['character.special', ['constant.character.escape']],
  ['variable', ['variable', 'variable.other']],
  ['variable.parameter', ['variable.parameter', 'variable.other.readwrite', 'meta.function.parameters']],
  ['variable.member', ['variable.other.member']],
  ['variable.special', ['variable.language', 'variable.language.this', 'variable.language.self']],
  ['property', ['meta.object-literal.key', 'support.type.property-name', 'variable.other.property']],
  ['function', ['entity.name.function', 'support.function', 'entity.name.method']],
  ['function.call', ['meta.function-call', 'entity.name.function.call']],
  ['function.macro', ['entity.name.function.macro', 'support.function.macro']],
  ['function.method', ['entity.name.function.method', 'meta.method']],
  ['function.method.call', ['meta.function-call.method']],
  ['keyword', ['keyword', 'storage', 'storage.type', 'storage.modifier']],
  ['label', ['entity.name.label']],
  ['title', ['entity.name.section', 'markup.heading', 'markup.heading entity.name']],
  ['operator', ['keyword.operator', 'punctuation.definition.operator']],
  ['preproc', ['meta.preprocessor', 'entity.name.function.preprocessor']],
  ['constructor', ['entity.name.function.constructor', 'support.class']],
  ['module', ['entity.name.namespace', 'support.module']],
  ['namespace', ['entity.name.namespace']],
  ['builtin', ['support.function.builtin', 'support.variable.builtin']],
  ['type', ['entity.name.type', 'support.type', 'meta.type', 'entity.name.class']],
  ['type.builtin', ['support.type.builtin', 'support.class.builtin']],
  ['enum', ['entity.name.enum', 'support.type.enum']],
  ['variant', ['entity.name.enum.variant', 'variable.other.enummember']],
  ['tag', ['entity.name.tag', 'meta.tag']],
  ['tag.attribute', ['entity.other.attribute-name']],
  ['tag.delimiter', ['punctuation.definition.tag']],
  ['attribute', ['meta.decorator', 'punctuation.definition.decorator', 'entity.name.function.decorator']],
  ['attribute.builtin', ['support.attribute.builtin']],
  ['selector', ['entity.other.attribute-name.class', 'entity.other.attribute-name.id']],
  ['selector.pseudo', ['entity.other.attribute-name.pseudo-class', 'entity.other.attribute-name.pseudo-element']],
  ['punctuation', ['punctuation', 'punctuation.separator', 'punctuation.terminator', 'meta.brace']],
  ['punctuation.bracket', ['punctuation.section', 'meta.brace']],
  ['punctuation.delimiter', ['punctuation.separator', 'punctuation.terminator']],
  ['punctuation.special', ['punctuation.special']],
  ['punctuation.list_marker', ['punctuation.list_marker', 'punctuation.definition.list']],
  ['link_text', ['markup.underline.link', 'string.other.link']],
  ['link_uri', ['markup.underline.link']],
  ['emphasis', ['markup.italic']],
  ['emphasis.strong', ['markup.bold']],
  ['embedded', ['meta.embedded']],
];

// VS Code semantic token -> Zed syntax token it draws its color from.
const SEMANTIC = {
  variable: 'variable',
  'variable.readonly': 'variable.special',
  parameter: 'variable.parameter',
  property: 'property',
  function: 'function',
  method: 'function.method',
  class: 'type',
  struct: 'type',
  interface: 'type',
  enum: 'enum',
  enumMember: 'variant',
  type: 'type',
  typeParameter: 'type',
  namespace: 'namespace',
  keyword: 'keyword',
  modifier: 'keyword',
  comment: 'comment',
  string: 'string',
  number: 'number',
  regexp: 'string.regex',
  operator: 'operator',
  decorator: 'attribute',
  macro: 'function.macro',
  label: 'label',
};

function tokenSettings(entry) {
  if (!entry || !entry.color) return undefined;
  const s = { foreground: entry.color };
  const fs = [];
  if (entry.font_style === 'italic') fs.push('italic');
  if (typeof entry.font_weight === 'number' && entry.font_weight >= 600) fs.push('bold');
  if (fs.length) s.fontStyle = fs.join(' ');
  return s;
}

function lum(hex) {
  const h = hex.replace('#', '').slice(0, 6);
  const f = (x) => {
    const v = parseInt(x, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(h.slice(0, 2)) + 0.7152 * f(h.slice(2, 4)) + 0.0722 * f(h.slice(4, 6));
}
function contrast(a, b) {
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function pickFg(bg, c1, c2) {
  return contrast(bg, c1) >= contrast(bg, c2) ? c1 : c2;
}
function withAlpha(hex, aa) {
  if (!hex || typeof hex !== 'string' || hex[0] !== '#') return undefined;
  const h = hex.slice(1);
  if (h.length === 8) return '#' + h.slice(0, 6) + aa;
  if (h.length === 6) return '#' + h + aa;
  return hex;
}
function opaque(hex, fallback) {
  if (!hex || typeof hex !== 'string' || hex[0] !== '#') return fallback;
  const h = hex.slice(1);
  return '#' + h.slice(0, 6);
}

function buildColors(s, variant) {
  const c = {};
  const set = (k, v) => {
    if (v) c[k] = v;
  };

  const surface = s['surface.background'] || s['background'];
  const elevated = s['elevated_surface.background'] || surface;
  const border = s['border'] || surface;
  const borderVar = s['border.variant'] || border;
  const text = s['text'] || s['editor.foreground'] || '#cccccc';
  const textMuted = s['text.muted'] || text;
  const accent =
    s['text.accent'] || s['border.focused'] || (s.accents && s.accents[0]) || s['icon.accent'] || '#888888';
  const bg = opaque(s['background'], surface);
  const editorBg = opaque(s['editor.background'], bg);
  const editorFg = s['editor.foreground'] || text;
  const player = (s.players && s.players[0]) || {};
  const cursor = player.cursor || accent;
  const selected = s['element.selected'] || surface;
  const hover = s['element.hover'] || surface;
  const active = s['element.active'] || surface;
  const accentFg = pickFg(accent, '#000000', '#ffffff');

  // editor
  set('foreground', editorFg);
  set('disabledForeground', textMuted);
  set('descriptionForeground', textMuted);
  set('icon.foreground', s['icon'] || textMuted);
  set('errorForeground', s['error']);
  set('focusBorder', withAlpha(accent, '66'));
  set('widget.shadow', '#00000066');
  set('selection.background', selected);
  set('window.activeBorder', border);
  set('window.inactiveBorder', border);
  set('sash.hoverBorder', accent);
  set('editor.background', editorBg);
  set('editor.foreground', editorFg);
  set('editorLineNumber.foreground', s['editor.line_number']);
  set('editorLineNumber.activeForeground', s['editor.active_line_number']);
  set('editorCursor.foreground', cursor);
  set('editor.selectionBackground', player.selection || selected);
  set('editor.inactiveSelectionBackground', selected);
  set('editor.selectionHighlightBackground', player.selection || selected);
  set('editor.wordHighlightBackground', withAlpha(selected, '60'));
  set('editor.wordHighlightStrongBackground', withAlpha(selected, '80'));
  set('editor.lineHighlightBackground', s['editor.active_line.background']);
  set('editor.lineHighlightBorder', '#00000000');
  set('editorWhitespace.foreground', s['editor.invisible']);
  set('editorIndentGuide.background1', s['editor.indent_guide']);
  set('editorIndentGuide.activeBackground1', s['editor.indent_guide_active']);
  set('editorRuler.foreground', s['editor.wrap_guide']);
  set('editorBracketMatch.background', withAlpha(accent, '22'));
  set('editorBracketMatch.border', withAlpha(accent, '66'));
  set('editorGutter.background', s['editor.gutter.background'] || editorBg);
  set('editorGutter.addedBackground', s['created'] || s['version_control.added']);
  set('editorGutter.modifiedBackground', s['modified']);
  set('editorGutter.deletedBackground', s['deleted']);
  set('editorError.foreground', s['error']);
  set('editorWarning.foreground', s['warning']);
  set('editorInfo.foreground', s['info']);
  set('editorHint.foreground', s['hint']);
  set('editorCodeLens.foreground', textMuted);
  set('editorLink.activeForeground', accent);
  set('editorLightBulb.foreground', s['warning']);
  set('problemsErrorIcon.foreground', s['error']);
  set('problemsWarningIcon.foreground', s['warning']);
  set('problemsInfoIcon.foreground', s['info']);
  set('editorOverviewRuler.border', '#00000000');
  set('editorOverviewRuler.findMatchForeground', s['warning']);
  set('editorOverviewRuler.rangeHighlightForeground', accent);
  set('editorOverviewRuler.errorForeground', s['error']);
  set('editorOverviewRuler.warningForeground', s['warning']);
  set('editorOverviewRuler.infoForeground', s['info']);
  set('editorStickyScroll.background', surface);
  set('editorStickyScrollHover.background', selected);

  // widgets / suggest / hover
  set('editorWidget.background', elevated);
  set('editorWidget.border', border);
  set('editorSuggestWidget.background', elevated);
  set('editorSuggestWidget.border', border);
  set('editorSuggestWidget.foreground', text);
  set('editorSuggestWidget.highlightForeground', accent);
  set('editorSuggestWidget.selectedBackground', selected);
  set('editorHoverWidget.background', elevated);
  set('editorHoverWidget.border', border);
  set('editorHoverWidget.foreground', text);
  set('peekView.border', accent);
  set('peekViewEditor.background', elevated);
  set('peekViewResult.background', editorBg);
  set('peekViewTitle.background', surface);
  set('editorMarkerNavigation.background', elevated);

  // find
  set('editor.findMatchBackground', s['search.match_background']);
  set('editor.findMatchHighlightBackground', s['search.active_match_background']);
  set('editor.findRangeHighlightBackground', withAlpha(selected, '66'));

  // diff
  set('diffEditor.insertedTextBackground', withAlpha(s['created'] || s['version_control.added'], '33'));
  set('diffEditor.removedTextBackground', withAlpha(s['deleted'] || s['version_control.deleted'], '33'));
  set('diffEditor.insertedLineBackground', withAlpha(s['created'] || s['version_control.added'], '1a'));
  set('diffEditor.removedLineBackground', withAlpha(s['deleted'] || s['version_control.deleted'], '1a'));

  // side bar / activity bar
  set('sideBar.background', surface);
  set('sideBar.foreground', text);
  set('sideBar.border', border);
  set('sideBarTitle.foreground', text);
  set('sideBarSectionHeader.background', surface);
  set('sideBarSectionHeader.foreground', textMuted);
  set('sideBarSectionHeader.border', border);
  set('sideBar.dropBackground', withAlpha(accent, '80'));
  set('activityBar.background', surface);
  set('activityBar.foreground', text);
  set('activityBar.inactiveForeground', textMuted);
  set('activityBar.border', border);
  set('activityBarBadge.background', accent);
  set('activityBarBadge.foreground', accentFg);
  set('activityBar.activeBorder', accent);
  set('activityBar.activeBackground', elevated);
  set('activityBar.dropBorder', withAlpha(accent, '66'));

  // status / title bar
  set('statusBar.background', s['status_bar.background'] || elevated);
  set('statusBar.foreground', s['status_bar.foreground'] || text);
  set('statusBar.border', border);
  set('statusBar.noFolderBackground', s['status_bar.background'] || elevated);
  set('statusBar.debuggingBackground', s['warning']);
  set('statusBar.debuggingForeground', pickFg(s['warning'] || accent, '#000000', '#ffffff'));
  set('statusBarItem.remoteBackground', accent);
  set('statusBarItem.remoteForeground', accentFg);
  set('statusBarItem.hoverBackground', hover);
  set('titleBar.activeBackground', s['title_bar.background'] || elevated);
  set('titleBar.activeForeground', text);
  set('titleBar.inactiveBackground', s['title_bar.inactive_background'] || bg);
  set('titleBar.inactiveForeground', textMuted);
  set('titleBar.border', border);

  // menus
  set('menu.background', elevated);
  set('menu.foreground', text);
  set('menu.selectionBackground', selected);
  set('menu.selectionForeground', text);
  set('menu.border', border);
  set('menu.separatorBackground', borderVar);

  // tabs
  set('tab.activeBackground', s['tab.active_background'] || editorBg);
  set('tab.activeForeground', s['tab.active_foreground'] || text);
  set('tab.activeBorderTop', accent);
  set('tab.activeBorder', '#00000000');
  set('tab.inactiveBackground', s['tab.inactive_background'] || surface);
  set('tab.inactiveForeground', textMuted);
  set('tab.border', borderVar);
  set('tab.hoverBackground', hover);
  set('tab.hoverForeground', text);
  set('tab.unfocusedActiveForeground', s['tab.active_foreground'] || text);
  set('tab.unfocusedInactiveForeground', textMuted);
  set('editorGroupHeader.tabsBackground', s['tab_bar.background'] || surface);
  set('editorGroupHeader.tabsBorder', border);
  set('editorGroupHeader.noTabsBackground', s['tab_bar.background'] || surface);
  set('editorGroupHeader.border', border);
  set('editorGroup.border', border);
  set('editorGroup.dropBackground', withAlpha(accent, '80'));

  // breadcrumb
  set('breadcrumb.background', editorBg);
  set('breadcrumb.foreground', textMuted);
  set('breadcrumb.focusForeground', text);
  set('breadcrumb.activeSelectionForeground', accent);
  set('breadcrumbPicker.background', elevated);

  // lists
  set('list.activeSelectionBackground', selected);
  set('list.activeSelectionForeground', text);
  set('list.inactiveSelectionBackground', active);
  set('list.inactiveSelectionForeground', text);
  set('list.hoverBackground', hover);
  set('list.focusBackground', selected);
  set('list.focusForeground', text);
  set('list.highlightForeground', accent);
  set('list.errorForeground', s['error']);
  set('list.warningForeground', s['warning']);
  set('list.dropBackground', withAlpha(accent, '80'));
  set('listFilterWidget.background', elevated);
  set('listFilterWidget.outline', accent);

  // inputs / dropdowns / buttons
  set('input.background', s['element.background'] || elevated);
  set('input.foreground', text);
  set('input.border', border);
  set('input.placeholderForeground', textMuted);
  set('inputOption.activeBorder', accent);
  set('inputOption.activeForeground', text);
  set('inputValidation.errorBackground', s['error.background']);
  set('inputValidation.errorBorder', s['error']);
  set('inputValidation.warningBackground', s['warning.background']);
  set('inputValidation.warningBorder', s['warning']);
  set('inputValidation.infoBackground', s['info.background']);
  set('inputValidation.infoBorder', s['info']);
  set('dropdown.background', elevated);
  set('dropdown.foreground', text);
  set('dropdown.border', border);
  set('button.background', accent);
  set('button.foreground', accentFg);
  set('button.hoverBackground', accent);
  set('button.secondaryBackground', selected);
  set('button.secondaryForeground', text);
  set('button.secondaryHoverBackground', hover);
  set('button.border', border);
  set('badge.background', accent);
  set('badge.foreground', accentFg);
  set('progressBar.background', accent);

  // scrollbar
  set('scrollbar.shadow', '#00000055');
  set('scrollbarSlider.background', s['scrollbar.thumb.background']);
  set('scrollbarSlider.hoverBackground', s['scrollbar.thumb.hover_background']);
  set('scrollbarSlider.activeBackground', s['scrollbar.thumb.hover_background']);

  // panel
  set('panel.background', s['panel.background'] || surface);
  set('panel.border', border);
  set('panelTitle.activeBorder', accent);
  set('panelTitle.activeForeground', text);
  set('panelTitle.inactiveForeground', textMuted);
  set('panel.dropBorder', withAlpha(accent, '66'));

  // terminal
  set('terminal.background', s['terminal.background'] || editorBg);
  set('terminal.foreground', s['terminal.foreground'] || text);
  set('terminalCursor.foreground', cursor);
  set('terminal.selectionBackground', selected);
  for (const name of [
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
    'bright_black', 'bright_red', 'bright_green', 'bright_yellow', 'bright_blue',
    'bright_magenta', 'bright_cyan', 'bright_white',
  ]) {
    set('terminal.ansi' + name.replace(/(^|_)(\w)/g, (m, a, b) => b.toUpperCase()), s['terminal.ansi.' + name]);
  }

  // source control / diagnostics
  set('gitDecoration.addedResourceForeground', s['version_control.added'] || s['created']);
  set('gitDecoration.modifiedResourceForeground', s['version_control.modified'] || s['modified']);
  set('gitDecoration.deletedResourceForeground', s['version_control.deleted'] || s['deleted']);
  set('gitDecoration.renamedResourceForeground', s['renamed']);
  set('gitDecoration.untrackedResourceForeground', textMuted);
  set('gitDecoration.ignoredResourceForeground', s['ignored']);
  set('gitDecoration.conflictingResourceForeground', s['conflict']);
  set('notifications.background', elevated);
  set('notifications.foreground', text);
  set('notifications.border', border);
  set('notificationCenterHeader.background', elevated);
  set('notificationsErrorIcon.foreground', s['error']);
  set('notificationsWarningIcon.foreground', s['warning']);
  set('notificationsInfoIcon.foreground', s['info']);

  // quick input / picker / minimap
  set('quickInput.background', elevated);
  set('quickInput.foreground', text);
  set('quickInputList.focusBackground', selected);
  set('quickInputList.focusForeground', text);
  set('pickerGroup.border', border);
  set('pickerGroup.foreground', accent);
  set('minimap.background', editorBg);
  set('minimap.selectionHighlight', selected);
  set('minimap.findMatchHighlight', s['warning']);

  return c;
}

function buildTokenColors(syntax) {
  const out = [];
  for (const [zed, scopes] of SYNTAX) {
    const settings = tokenSettings(syntax[zed]);
    if (settings) out.push({ scope: scopes, settings });
  }
  // JSON keys use the scope `support.type.property-name.json`, which also
  // matches a bare `support.type` selector. Re-assert the property color last
  // so a bold `support.type` rule can't make JSON keys bold.
  const prop = tokenSettings(syntax.property);
  if (prop) {
    out.push({ scope: ['support.type.property-name', 'support.type.property-name.json'], settings: prop });
  }
  return out;
}

function buildSemantic(syntax) {
  const out = {};
  for (const [sem, zed] of Object.entries(SEMANTIC)) {
    const e = syntax[zed];
    if (!e || !e.color) continue;
    if (typeof e.font_weight === 'number' && e.font_weight >= 600) {
      out[sem] = { foreground: e.color, bold: true };
    } else {
      out[sem] = e.color;
    }
  }
  return out;
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
const data = JSON.parse(readFileSync(input, 'utf8'));
mkdirSync(outdir, { recursive: true });

const written = [];
for (const variant of data.themes || []) {
  const s = variant.style || {};
  const theme = {
    $schema: 'vscode://schemas/color-theme',
    name: variant.name,
    type: variant.appearance === 'light' ? 'light' : 'dark',
    colors: buildColors(s, variant),
    semanticHighlighting: true,
    semanticTokenColors: buildSemantic(s.syntax || {}),
    tokenColors: buildTokenColors(s.syntax || {}),
  };
  const file = join(outdir, `${slug(variant.name)}-color-theme.json`);
  if (existsSync(file) && !force) {
    console.error(`skip (exists, use --force): ${file}`);
    continue;
  }
  writeFileSync(file, JSON.stringify(theme, null, 2) + '\n');
  written.push(file);
}

for (const f of written) console.log('wrote', f);
if (!written.length) console.log('nothing written');
