# 共通部品の置き場所の整理 設計

- 日付：2026-11-16
- 対象：candy-rain-stores
- 規模：小さな変更（動きは変えない）

## なぜやるか

機能を足そうとしたとき、どこを直せばいいか分からなかった。`docs/feature-guide.md` を書く中で、全体で使う部品がストア用・商品用・オーナー画面用のファイルに置かれていて、「なぜここから読み込むのか」が分かりにくい箇所が見つかった。置き場所を役割どおりにして、新しい機能を足すときに迷わないようにする。

## ゴール

- 全サービス共通のもの（`StoreDeps` 型・`deps()`）は `services/deps.ts` にある
- 汎用の確認関数 `isUuid` は `lib/uuid.ts` にある
- Server Action で使うフォームの値の取り出し `text()` と「保存できませんでした」の文言は 1 か所にあり、各 actions はそこから読み込む
- 受付処理（`actions.ts`）は `prisma` を直接使わない

## やらないこと

- 動き・画面・文言を変えない（テストの期待値も変えない。例外は `deleteStore` の戻り値に slug が増えること）
- 購入者用とオーナー用の注文詳細ページはまとめない（似ているのは 2 枚のカードだけで、まとめると分岐が増えて読みにくくなるため）
- 購入者用注文詳細で長い商品名がはみ出す件は表示の修正なので別に扱う

## 進め方（選んだもの）

| 案 | 内容 | 判断 |
|---|---|---|
| 1 ブランチ・候補ごとにコミット | 1 つずつ差分を読める。マージは 1 回 | **採用** |
| 候補ごとに別 PR | 読みやすいが手間が 5 倍 | 不採用 |
| 機能ごとのフォルダに組み直す | 変更が大きく、`app/` との 2 か所に分かれるので目的に合わない | 不採用 |

## 変更

1. `services/deps.ts` を作り、`StoreDeps` 型（`storeService.ts` から）と `deps()`（`app/dashboard/deps.ts` から）を移す。古いファイルは消し、読み込み元をすべて書き換える
2. `isUuid` を `services/productService.ts` から `lib/uuid.ts` へ移す（ユニットテストを足す）
3. `text()` と `SAVE_FAILED` を `lib/formData.ts` へ移し、各 `actions.ts` から読み込む
4. `deleteStore` が削除したストアの slug を返すようにし、`deleteStoreAction` から `prisma` の直接利用をなくす
5. `docs/feature-guide.md` の該当箇所と付録を新しい置き場所に合わせる

## 確認

`npm test`・`npm run lint`・`npm run typecheck`・`npm run test:integration` がすべて通る。

## 作業者に任せること

- `deps.ts` に `import "server-only"` を付けるかどうか（テストから読み込めることを優先）
- `lib/formData.ts` の関数名（`text` のままでもよい）
