# PWA 実装に関する AI 補完（Assumption）

**Issue ID**: pwa  
**Topic**: BrickBreaker の PWA 化  
**作成日**: 2026-07-18

---

## 補完項目一覧

### 1. アイコンフォーマット: SVG を採用

**【AIによる補完】**: アイコンは PNG ではなく SVG 形式（image/svg+xml）で作成  
**【理由】**: 仕様では「SVGまたはPNG形式」と明記されており、ワークショップ環境に画像生成ツールがないため、コードで完結できる SVG を採用した。Chrome 89 以降・Safari 16.4 以降・Firefox 113 以降で SVG マニフェストアイコンはサポートされている。PWA インストール要件を満たす。  
**【影響範囲】**: Android Chrome でのマスカブルアイコン表示は safe zone（80%内）を想定した余白付きデザインで対応済み。

---

### 2. アイコンデザイン: ブロック4行+ボール+パドル構成

**【AIによる補完】**: ゲームを直感的に表すビジュアル（シアン/ゴールド/グリーン/ピンクのブロック行、白いボール、グラデーションパドル）をブランドカラーで作成  
**【理由】**: 仕様に「ブランドカラーでBrickBreakerらしいデザイン」とある。CSS `--accent: #74f7ff`（シアン）、`--accent-2: #ffd166`（ゴールド）、`--accent-3: #9df87f`（グリーン）を基本色に採用。背景は `--bg: #060816` で統一。

---

### 3. キャッシュ戦略: ローカル = Cache First、CDN = Network First

**【AIによる補完】**:  
- ローカルアセット（HTML/CSS/JS）: **Cache First** — インストール時に事前キャッシュし、オフラインでもゲームプレイ可能  
- Phaser CDN: **Network First with Cache Fallback** — 常に最新の Phaser を取得しようとし、ネットワーク失敗時のみキャッシュを使用  
**【理由】**: 仕様に「Cache First または Network First」と選択肢が示されている。ゲームロジック（ローカルJS）はバージョン管理でキャッシュを刷新する前提のため Cache First が適切。一方、外部CDNライブラリは更新されうるため Network First を採用。

---

### 4. Service Worker スコープ: `./`（BrickBreaker/ 以下）

**【AIによる補完】**: `scope: "./"` を指定し、BrickBreaker/ ディレクトリ以下のみをSWが管理  
**【理由】**: リポジトリルートには BrickBreaker 以外のコンテンツがあるため、SW のスコープを BrickBreaker/ に限定することで他のページへの影響を防ぐ。

---

### 5. キャッシュバージョン管理: `CACHE_VERSION = 'v1'`

**【AIによる補完】**: `sw.js` 先頭の `CACHE_VERSION` 定数を変更することでキャッシュを刷新する設計を採用  
**【理由】**: ゲームに更新があった際に古いキャッシュが残らないよう、バージョン文字列を変えれば activate 時に自動で旧キャッシュを削除する仕組みとした。

---

### 6. iOS 向け追加メタタグ

**【AIによる補完】**: `apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style: black-translucent`、`apple-mobile-web-app-title` を追加  
**【理由】**: 仕様に `apple-touch-icon` の要求はあったが、iOS の standalone 表示を正しく動作させるために上記メタタグも必須。dark テーマに合わせてステータスバーを `black-translucent` に設定。

---

## 仕様書の改善提案

仕様がより明確になるためのフィードバック（教育的観点）:

| 曖昧だった点 | 改善案 |
|-------------|--------|
| アイコン形式「SVGまたはPNG形式」 | 「PWA の幅広い互換性のため PNG を優先。SVG でもよいが理由を明記すること」とするとより具体的 |
| キャッシュ戦略「Cache First または Network First」 | アセットの種類ごとに戦略を指定する（例: 「ローカルJSはCache First、外部CDNはNetwork First」）と実装者の判断余地が減る |
| アイコンデザイン「BrickBreakerらしいデザイン」 | ゲームオブジェクト（ブロック/ボール/パドル）の視覚要素と使用色を指定すると再現性が上がる |
