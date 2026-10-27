# shadcn/ui の作り込み Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 自作していた確認表示・通知・メニュー・読み込み中の表示を shadcn/ui の本格的な部品に置き換える。

**Architecture:** `components/ui/` に alert-dialog・checkbox・dropdown-menu・skeleton・sonner を足し、各画面の手作りの確認表示などを置き換える。データの流れ（Server Actions・サービス）は変えない。

**Tech Stack:** Next.js 16、React 19、Tailwind CSS 4、shadcn/ui（`@radix-ui/react-alert-dialog`・`@radix-ui/react-checkbox`・`@radix-ui/react-dropdown-menu`・`sonner`）

**Spec:** なし（ユーザーの指示「stores の UI をさらに作り込む」）。前段の計画 `docs/superpowers/plans/2026-10-27-shadcn-ui.md` の決定（ネイティブ select、OS に従うダーク、手で置く shadcn ソース）を引き継ぐ。

## Global Constraints

- `ui.shadcn.com` には接続できない。部品は shadcn/ui new-york v4（Tailwind 4 版、`data-slot` 付き）のソースどおりに手で置き、npm パッケージは npm から入れる
- Sonner の `Toaster` は shadcn の版（`next-themes` は使わず、テーマは `prefers-color-scheme` に合わせて `theme="system"`）
- Server Actions・サービス・URL・フォームの `name`・hidden input は変えない
- 既存の文言は残す。確認の文言（「本当に削除しますか？」「本当にキャンセルしますか？」など）は AlertDialog のタイトル・説明に移す。ボタン名は変えない
- 入力エラーは引き続き `<p role="alert">`
- E2E は確認の操作をダイアログ越しに行う形に合わせて直してよい（意図は変えない）。単体・結合・lint・typecheck・build・E2E 3 本が通る
- ライト／ダーク・375px で崩れない

## Review Focus

- AlertDialog の確定ボタンが Server Action を確実に呼ぶ（送信中は無効、失敗のメッセージが見える）
- ダイアログを閉じたときのフォーカスの戻り、Esc で閉じる
- トーストが既存のメッセージと二重にならない（同じ文言を 2 か所に出さない）
- ドロップダウンメニューのキーボード操作、未ログイン時のヘッダー
- loading.tsx の骨組みが実際のレイアウトと大きくずれない

---

### Task 1: 確認ダイアログとチェックボックス

**Files:**
- Create: `components/ui/alert-dialog.tsx`、`components/ui/checkbox.tsx`
- Modify: `app/dashboard/DeleteStoreForm.tsx`、`app/dashboard/products/DeleteProductForm.tsx`、`app/orders/[orderId]/CancelOrderForm.tsx`、`app/dashboard/orders/OrderStatusButtons.tsx`（キャンセル）、`app/dashboard/StoreForm.tsx`・`app/dashboard/products/ProductImages.tsx`（削除の確認があれば同様、ロゴ・ヘッダー削除のチェックは `Checkbox`）、該当する `e2e/*.spec.ts`

- [ ] **Step 1:** 部品を置く。`AlertDialogAction` は既定でダイアログを閉じるので、Server Action を呼ぶ確定ボタンは `AlertDialogAction asChild` で `Button variant="destructive"` を包むか、閉じる前に送信が始まるようにする
- [ ] **Step 2:** 4 つの確認表示を AlertDialog に置き換える（トリガーは今のボタン名、確定は今の確定ボタン名、取り消しは「やめる」）。失敗メッセージ（「注文の状態が変わりました…」など）はダイアログを閉じた後も見えるように元の場所に出す
- [ ] **Step 3:** ネイティブのチェックボックスを `Checkbox` に（`name` と `value` を保つ。Radix Checkbox はフォーム送信用の hidden input を出すので `name` を渡す）
- [ ] **Step 4:** E2E を合わせて直し、すべて通す。ライト／ダーク・375px でダイアログのスクリーンショットを確認。コミット `feat: 確認をダイアログにし、チェックボックスを shadcn/ui にする`

### Task 2: 通知・メニュー・読み込み中の表示

**Files:**
- Create: `components/ui/sonner.tsx`、`components/ui/dropdown-menu.tsx`、`components/ui/skeleton.tsx`、`app/cart/loading.tsx`、`app/orders/loading.tsx`、`app/dashboard/loading.tsx`、`app/dashboard/products/loading.tsx`、`app/dashboard/orders/loading.tsx`、`app/s/[slug]/loading.tsx`
- Modify: `app/layout.tsx`（`<Toaster />`）、`app/components/SiteHeader.tsx`、`app/components/SignOutButton.tsx`、`app/dashboard/StoreForm.tsx`・`app/dashboard/products/ProductForm.tsx`（「保存しました」）、`app/s/[slug]/products/[productId]/AddToCartForm.tsx`

- [ ] **Step 1:** Sonner：「保存しました」と「カートに入れました」／「1 商品 10 個までです」をトーストで出す。画面内の同じ文言は消して二重にしない（「カートを見る」リンクはトーストの action にする）。E2E がこれらの文言を見ている場合はトーストの中の文言で確かめるよう直す
- [ ] **Step 2:** ヘッダー：ログイン中は利用者名のボタンから DropdownMenu（「ダッシュボード」「注文履歴」「ログアウト」）。カートの件数バッジはメニューの外に残す。未ログインは今のまま「ログイン」
- [ ] **Step 3:** loading.tsx：各画面の形に合わせた `Skeleton`
- [ ] **Step 4:** すべてのテストを通し、ライト／ダーク・375px でスクリーンショットを確認。コミット `feat: 通知・メニュー・読み込み中の表示を shadcn/ui にする`
