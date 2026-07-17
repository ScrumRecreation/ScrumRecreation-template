# リポジトリ向け Copilot 指示

## エージェントの使い分け

### BrickBreaker の仕様実装
- 仕様に基づいて BrickBreaker を実装・修正する依頼では、カスタムエージェント `brickbreaker` を使う。

### 手書き仕様の転記
- `Templates/Spec.md` をもとに印刷した仕様テンプレートへの手書き内容（写真・PDF・OCRテキスト）を markdown に転記する依頼では、カスタムエージェント `spec_intake_handwritten` を使う。

## 検証（全エージェント共通）
- 編集後は、可能な範囲でエラー確認や実行確認を行い、結果を報告する。
