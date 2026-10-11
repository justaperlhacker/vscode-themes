# justaperlhacker Themes

A collection of low-saturation VS Code color themes, ported from the matching
Zed and Fresh themes (themselves derived from the Neovim schemes).

## Included themes

- **Miniwinter Dark / Light** — "icy winter" palette with an azure background.
- **Vague** — muted, desaturated blue/grey palette.
- **Kanso** — minimal, calm neutral palette.
- **Black Metal Gorgoroth Dark / Light** — high-contrast monochrome palette.

## Install

Build and install the extension locally:

```sh
npm install -g @vscode/vsce
vsce package
code --install-extension vscode-themes-*.vsix
```

Then reload VS Code and select a theme from **Preferences: Color Theme**.

## Development

Open this folder in VS Code and press `F5` to launch the Extension Development
Host, then pick a theme from **Preferences: Color Theme** in the new window.

## Adding a theme

1. Drop the color theme JSON into `themes/`.
2. Register it under `contributes.themes` in `package.json`.
3. Bump `version`, rebuild, and reinstall.

## Palettes

### Miniwinter

| Role       | Dark      | Light     |
| ---------- | --------- | --------- |
| Background | `#11262d` | `#dce4e8` |
| Surface    | `#051a20` | `#e5edf1` |
| Foreground | `#d8d4cd` | `#312e29` |
| Accent     | `#b3daf9` | `#014772` |
| Strings    | `#b8e1c1` | `#00562e` |
| Numbers    | `#edc7e7` | `#4f0b46` |
| Properties | `#d9d8aa` | `#565600` |
| Tags       | `#a6e1e2` | `#016d71` |
| Punctuation| `#f2ccad` | `#6c3e00` |
| Comments   | `#98948e` | `#6a6661` |

### Vague

| Role       | Value     |
| ---------- | --------- |
| Background | `#141415` |
| Surface    | `#1c1c24` |
| Foreground | `#cdcdcd` |
| Accent     | `#7e98e8` |
| Strings    | `#e8b589` |
| Numbers    | `#e0a363` |
| Functions  | `#c48282` |
| Types      | `#9bb4bc` |
| Comments   | `#606079` |

### Kanso

| Role       | Value     |
| ---------- | --------- |
| Background | `#14171d` |
| Surface    | `#191c22` |
| Foreground | `#c5c9c7` |
| Accent     | `#7fb4ca` |
| Strings    | `#8a9a7b` |
| Numbers    | `#a292a3` |
| Functions  | `#8ba4b0` |
| Types      | `#8ea4a2` |
| Comments   | `#75797f` |

### Black Metal Gorgoroth

| Role       | Dark      | Light     |
| ---------- | --------- | --------- |
| Background | `#000000` | `#f2f0ec` |
| Surface    | `#060606` | `#eceae6` |
| Foreground | `#c1c1c1` | `#242019` |
| Accent     | `#5f8787` | `#3b5959` |
| Strings    | `#ddeecc` | `#3b6213` |
| Numbers    | `#aaaaaa` | `#6d6d6d` |
| Functions  | `#888888` | `#696969` |
| Types      | `#9b8d7f` | `#655443` |
| Comments   | `#505050` | `#6e685d` |
