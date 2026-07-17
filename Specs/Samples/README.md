# Specs/Samples README

このフォルダには、仕様書テンプレート（Templates/Spec.md）に沿って書かれたサンプルが入っています。

## 使い方
- まず1つ読んで、書き方の流れをつかみます。
- 自分の仕様を書くときは、項目の順番（TRIGGER/ACTION/CONDITION/表示/UI/INPUT/Acceptance Criteria/備考）をまねします。
- そのままコピーせず、数字や条件は自分の案に合わせて書きます。

## サンプル一覧
- score_on_hit.md: ブロック1個の点数を変更する、かんたんな例
- speed_powerup.md: 一定時間だけ速くなるイベントの例
- extra_life.md: アイテムを取るとライフが増える例
- multiball.md: ボールが増える機能の例
- missing_respawn_rule.md: 仕様だけでは足りず、追加提案が必要になる例

## 補足
- missing_respawn_rule.md のように、仕様が足りない場合は、Assumptions ログに「何を追加で決める必要があるか」を残します。
- Assumptions ログの保存先は Specs/Assumptions です。
