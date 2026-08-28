# yab2karabiner

やまぶきRの設定ファイル（`*.yab`）を Karabiner-Elements 用の Complex Modifications JSON に変換する Node.js CLI ツールです。

## 概要

Web アプリケーション [Yama2Kara](https://potting.syuriken.jp/webApps/Yama2Kara/index.html) の変換ロジックを Node.js 環境向けに移植したスクリプトです。

## 必要要件

- Node.js (v14以上推奨)

## 使い方

```bash
# 基本的な変換（標準出力にJSONを出力）
node yab2karabiner.js <input.yab>

# ファイルに出力
node yab2karabiner.js <input.yab> -o output.json

# US配列、親指シフトキーを一括指定して出力
node yab2karabiner.js <input.yab> -k US -L spacebar -R right_command -o output.json

# JIS配列、同手・異手を個別に指定して出力（例: 左異手に英数、右異手にかな）
node yab2karabiner.js <input.yab> -l spacebar -a japanese_eisuu -r right_command -b japanese_kana -o output.json
```

### コマンドライン引数

| 引数 | 説明 | デフォルト値 |
| :--- | :--- | :--- |
| `<input.yab>` / `-i, --input` | 入力となるやまぶきR設定ファイルパス | (必須、または標準入力) |
| `-o, --output <file>` | 出力先 JSON ファイルパス | 標準出力 |
| `-t, --title <title>` | ルールのタイトル | `yab` ファイル先頭のコメント |
| `-k, --layout <JP\|US>` | キーボードの物理的配列 (`JP` / `US`) | `JP` |
| `-L, --left-thumb <key>` | 左親指シフトキー（同手・異手一括指定） | - |
| `-R, --right-thumb <key>` | 右親指シフトキー（同手・異手一括指定） | - |
| `-l, --left-thumb-1 <key>` | 左同手親指シフトキー | `spacebar` |
| `-a, --left-thumb-2 <key>` | 左異手親指シフトキー | `spacebar` |
| `-r, --right-thumb-1 <key>` | 右同手親指シフトキー | `insert` |
| `-b, --right-thumb-2 <key>` | 右異手親指シフトキー | `insert` |
| `-h, --help` | ヘルプメッセージを表示 | - |

## Karabiner-Elements への適用

生成された JSON ファイルを `~/.config/karabiner/assets/complex_modifications/` に配置すると、Karabiner-Elements の「Complex Modifications」→「Add rule」から有効化できます。

## ライセンス・著作権表示

本ツールの変換ロジックおよび原案の著作権は、[Yama2Kara](https://potting.syuriken.jp/webApps/Yama2Kara/index.html) の作者である **potting** 氏に帰属します。
- 原作URL: https://potting.syuriken.jp/webApps/Yama2Kara/index.html
- 作者サイト: https://potting.syuriken.jp/

