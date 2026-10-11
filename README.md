# justaperlhacker Themes

A collection of low-saturation VS Code color themes, ported from the matching
Zed and Fresh themes (themselves derived from the Neovim schemes).

## Included themes

Dark themes with a light counterpart:

- **Miniwinter** / **Miniwinter Light** — "icy winter" palette, azure background.
- **Black Metal** / **Black Metal Light**
- **Black Metal Gorgoroth** / **Black Metal Gorgoroth Light**
- **Miniautumn** / **Miniautumn Light**
- **Minispring** / **Minispring Light**
- **Minisummer** / **Minisummer Light**
- **DankShell Dark** / **DankShell Light** (plus transparent variants)

Dark themes:

- **Batman**, **Fleury**, **Kanso**, **Kimbie Dark**, **Kimbox**, **Kraihnight**
- **Monochrome** (plus **Green**, **Amber**, **Chroma**)
- **Naysayer**, **Vague**, **VSCode Red**

## Install

```sh
make install          # package + install into VS Code
```

Or manually:

```sh
npx @vscode/vsce package
code --install-extension vscode-themes-*.vsix --force
```

Then reload VS Code and select a theme from **Preferences: Color Theme**.

## Development

Open this folder in VS Code and press `F5` to launch the Extension Development
Host, then pick a theme from **Preferences: Color Theme** in the new window.

## Adding a theme

From an existing Zed theme file:

```sh
make import ZED=/path/to/zed-theme.json   # convert + register
make release VERSION=0.5.0 MSG="Add Foo theme"
```

Or drop a VS Code theme JSON into `themes/` and run `make sync` to register
everything in `contributes.themes` automatically.

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
