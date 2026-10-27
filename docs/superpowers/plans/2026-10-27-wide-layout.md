# 横幅を広く使うレイアウト Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ユーザーが選んだデザイン案（https://claude.ai/artifact/DaLNcbVwjVxDHpUQPa6DmA のストアページ・商品詳細・ダッシュボード）のとおり、PC で横幅を広く使うレイアウトにする。

**Architecture:** 公開ページは最大幅 1440px（左右 32px、スマホは 16px）の 2 列（サイドバー＋メイン）。ダッシュボードは左のナビゲーション＋メインの 2 列を `app/dashboard/layout.tsx` で共通化する。スマホ幅ではどれも縦に積む。shadcn/ui の既存部品（Card・Badge・Button・Table・NativeSelect・Skeleton）を使う。

**Tech Stack:** Next.js 16（App Router）、React 19、Tailwind CSS 4、shadcn/ui

**Spec:** なし（ユーザーが承認したデザイン案が基準）。デザイン案の仮の値（[商品名] など）は実データに置き換える。

## Global Constraints

- サービス・Server Actions・フォームの `name`・hidden input・既存の文言は変えない（新しい見出しやラベルの追加は可）
- 入力エラーは `<p role="alert">`。既存の E2E の意図を保つ（見た目の変化に合わせたロケーターの修正は可）
- 公開ストア・商品ページに `loading.tsx` を置かない（404 が 200 になるため）
- ストアのテーマカラーは `--store-color` で差し色に使う（カバー画像がないときの帯、タブの下線、主ボタン）。主ボタンの文字は白なので、テーマカラーが明るいときに読めなくならないよう、主ボタンは `bg-(--store-color)` に加えて既存の shadcn の `Button` の形を保ち、文字色はテーマカラーの明るさで黒／白を選ぶ関数 `readableTextColor(hex: string): "#000000" | "#ffffff"` を `lib/color.ts` に置く（単体テスト付き）
- スマホ幅（375px）で横スクロールが出ない。表は表の箱の中だけで横スクロール
- ライト／ダークの両方で読める
- 単体・結合・lint・typecheck・build・E2E がすべて通る

## Review Focus

- 絞り込み・並び順の `searchParams` に不正な値が来ても既定値で表示する
- 非公開の商品・ストアの扱い（オーナー本人だけに見える印）が今までどおり
- 「このストアのほかの商品」に今見ている商品と非公開の商品が出ない
- ダッシュボードのレイアウトがストアのないとき（作成画面）にも崩れない
- 詳細ページ・入力画面で一覧用の読み込み中表示が出ない

---

### Task 1: ストアページ

**Files:**
- Create: `lib/color.ts`、`lib/color.test.mts`
- Modify: `app/s/[slug]/page.tsx`、`app/s/[slug]/ProductGrid.tsx`、`app/components/SiteHeader.tsx`（中の幅を `max-w-[1440px]`、左右の余白をデザイン案に合わせる）

- [ ] **Step 1:** `readableTextColor` のテスト（`#ffffff`→黒、`#000000`→白、`#d82887`→白、`#fde047`→黒、3 桁 `#fff`→黒、不正な値→白）を書いて落ちることを確認し、実装して通す（相対輝度で 0.5 を境にする）
- [ ] **Step 2:** カバー：ヘッダー画像があれば幅いっぱい・高さ 200px（スマホ）／320px（PC）、なければ `--store-color` の帯。ロゴ（なければストア名の頭文字をテーマカラーの四角に）をカバーに重ね、ストア名と `/s/<ID>・商品 N 点` を横に並べる。オーナー本人の「非公開です」の帯は今の位置のまま
- [ ] **Step 3:** 2 列：左のサイドバー（幅 280〜320px）に「ストアについて」（説明文、なければ出さない）、「お支払い方法」（`paymentInstructions`、なければ出さない）、「販売中」「売り切れ」の件数。右に商品一覧
- [ ] **Step 4:** 商品一覧の上にタブ（すべて・販売中・売り切れ、`?filter=all|available|soldout`、今のものに `aria-current="page"` とテーマカラーの下線）と並び順（`?sort=new|price`、新しい順・価格の安い順、`<form method="get">` の NativeSelect と「並べ替え」ボタン）。不正な値は既定（all・new）。商品グリッドは `repeat(auto-fill, minmax(220px, 1fr))`、カードは画像（正方形）・商品名・価格・「売り切れ」「非公開」の Badge。0 件は「商品はまだありません」（絞り込みで 0 件なら「該当する商品はありません」）
- [ ] **Step 5:** ライト／ダーク・1440px／375px でスクリーンショットを確認。すべてのテストを通してコミット `feat: ストアページを横幅を広く使うレイアウトにする`

### Task 2: 商品詳細ページ

**Files:**
- Modify: `app/s/[slug]/products/[productId]/page.tsx`、`ProductGallery.tsx`、`AddToCartForm.tsx`（見た目のみ）
- Modify: `services/productService.ts`（`listOtherProducts(deps, storeId: string, excludeProductId: string, limit: number): Promise<ProductCard[]>` を追加、公開中の商品だけ・新しい順）、`tests/integration/productService.test.mts`

- [ ] **Step 1:** `listOtherProducts` の結合テスト（今の商品と非公開を含まない、新しい順、`limit` 件まで、他ストアの商品を含まない）を書いて落ちることを確認し、実装して通す。戻り値の形は `listProductsForStorePage` の 1 件と同じにする
- [ ] **Step 2:** パンくず（ストア名 / 商品名）。2 列：左に大きな画像（4:3）とその下の小さい画像の列、右に情報のカード（商品名・価格・在庫・数量とカートに入れる・ストアへのリンク）と「商品の説明」のカード
- [ ] **Step 3:** ページ下に「このストアのほかの商品」（6 件、なければ出さない）。オーナー本人の「非公開です」の帯は今の位置のまま
- [ ] **Step 4:** スクリーンショット確認、すべてのテストを通してコミット `feat: 商品詳細ページを横幅を広く使うレイアウトにする`

### Task 3: ダッシュボード

**Files:**
- Create: `app/dashboard/layout.tsx`、`app/dashboard/DashboardNav.tsx`（現在地の判定にクライアント側で `usePathname`）、`app/dashboard/products/new/loading.tsx`・`app/dashboard/products/[productId]/loading.tsx`・`app/dashboard/orders/[orderId]/loading.tsx`・`app/orders/[orderId]/loading.tsx`（各画面の形の Skeleton）
- Modify: `app/dashboard/page.tsx`、`app/dashboard/orders/page.tsx`、`app/dashboard/orders/[orderId]/page.tsx`、`app/dashboard/products/page.tsx` ほか、ダッシュボード配下の各ページの外側の余白・幅

- [ ] **Step 1:** レイアウト：ストアがあるとき、左にナビ（ストアのロゴと名前・公開状態、「ストアの設定」「商品を管理」「注文を管理（受付件数の Badge）」「ストアページを見る」、今のページに `aria-current="page"`）、右にメイン（`flex: 999 1 560px`）。スマホ幅ではナビが上に積まれ、横並びのリンクになる。ストアがないときはナビを出さずメインだけ
- [ ] **Step 2:** 各ページの外側の `max-w-2xl` などをやめ、メイン列の幅を使う（入力フォームは読みやすい幅 `max-w-3xl` に収める）
- [ ] **Step 3:** 注文管理の一覧の上に状態ごとの件数カード（受付・支払確認・発送済み・キャンセル）。件数は 1 回のクエリで数える関数 `countStoreOrdersByStatus(deps, ownerSub): Promise<Record<OrderStatus, number> | null>` を `services/orderService.ts` に追加（結合テスト付き、他ストアの注文を数えない）
- [ ] **Step 4:** 注文の詳細は 2 列（左：購入者・お届け先・注文内容、右：状態と操作ボタン）
- [ ] **Step 5:** 詳細・入力画面に専用の `loading.tsx`
- [ ] **Step 6:** スクリーンショット確認、すべてのテストを通してコミット `feat: ダッシュボードを横幅を広く使うレイアウトにする`

### Task 4: トップバーのプロフィール画像とメニュー（ユーザーの追加依頼）

Candy Rain ID が OIDC の `picture` クレーム（`<ISSUER>/avatars/<sub>?v=<etag>`、画像がない人には出さない）を返すようになる（IDサーバー側は別ブランチ `feat/avatar`）。

**Files:**
- Modify: `auth.ts`（`picture` をセッションの `user.image` に残す）、`lib/session.ts`（`Buyer` に `image: string | null`）、`app/components/SiteHeader.tsx`、`app/components/UserMenu.tsx`
- Create: `app/new/page.tsx`（新着商品・準備中）、`app/following/page.tsx`（フォロー・準備中）、`app/components/Avatar.tsx`（画像、なければ灰色の丸）

- [ ] **Step 1:** ログイン中のトップバー右端に丸いプロフィール画像（32px、`picture` がなければ `bg-muted` の灰色の丸）。これがメニューのトリガー（`aria-label="アカウントメニュー"`）。カート件数はメニューの外に残す。利用者名のボタンは画像に置き換え、名前とメールはメニューの先頭（`DropdownMenuLabel`）に表示
- [ ] **Step 2:** メニュー：「新着商品」（`/new`）「フォロー」（`/following`）「購入履歴」（`/orders`）、区切り線、「ダッシュボード」「ログアウト」（今と同じ `signOut`）
- [ ] **Step 3:** `/new` と `/following`：トップバー付きで、見出し（「新着商品」「フォロー」）と「準備中です」の短い案内。ログイン不要
- [ ] **Step 4:** 画像は外部の ID サーバーから来るので `<img>`（`next/image` の設定は不要）。`referrerPolicy="no-referrer"`、読み込みに失敗したら灰色の丸に戻す
- [ ] **Step 5:** すべてのテストを通し、ライト／ダーク・1440／375 でスクリーンショット確認。コミット `feat: トップバーにプロフィール画像のメニューを追加`
