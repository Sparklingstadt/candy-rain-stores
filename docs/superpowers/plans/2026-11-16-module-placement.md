# 共通部品の置き場所の整理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全体で使う部品（`deps()`・`StoreDeps`・`isUuid`・`text()`・`SAVE_FAILED`）を役割どおりの場所へ移し、受付処理から `prisma` の直接利用をなくす。動きは変えない。

**Architecture:** 置き場所を移して読み込み元を書き換えるだけ。新しいファイルは `services/deps.ts`・`lib/uuid.ts`・`lib/formData.ts` の 3 つ。候補ごとに 1 コミット。

**Tech Stack:** Next.js 16（Server Actions）、TypeScript、Prisma 7、node:test（tsx）

**Spec:** `docs/superpowers/specs/2026-11-16-module-placement-design.md`

## Global Constraints

- 動き・画面・文言を変えない。テストの期待値も変えない（例外：`deleteStore` の成功時の戻り値に `slug` が増える）
- 移したあと、古い場所からの再エクスポートは残さない（読み込み元をすべて書き換える）
- 各タスクの最後に `npm test`・`npm run lint`・`npm run typecheck` が通る。DB を触るタスク（1・4）は `npm run test:integration` も通る

## Review Focus

- `services/*.ts` が `services/deps.ts` を `import type` で読むこと（値として読むと `lib/prisma` が読み込まれ、結合テストで本番用クライアントが作られる）
- `lib/uuid.ts`・`lib/formData.ts` が `server-only` や Prisma を読み込まないこと（ユニットテストから読めるように）
- `deleteStoreAction` が失敗時（`confirm_mismatch`・`has_open_orders`・`not_found`）にストアページを再生成しないこと（今と同じ）
- `"use server"` のファイルから `SAVE_FAILED` などの定数を export しないこと（Server Action ファイルは async 関数しか export できない）
- 古いパス（`app/dashboard/deps`、`storeService` の `StoreDeps`、`productService` の `isUuid`）への参照が 1 つも残らないこと（Task 3・4 の最後の grep で確認）

---

### Task 1: `deps()` と `StoreDeps` を `services/deps.ts` へ

**Files:**
- Create: `services/deps.ts`
- Delete: `app/dashboard/deps.ts`
- Modify: `services/storeService.ts:13`（`StoreDeps` の定義を消し、`import type { StoreDeps } from "./deps"` に）、`services/productService.ts`、`services/cartService.ts`、`services/orderService.ts`
- Modify（`deps()` の読み込み元 18 ファイル）: `app/stores/page.tsx`、`app/s/[slug]/page.tsx`、`app/s/[slug]/products/[productId]/page.tsx`、`app/checkout/actions.ts`、`app/checkout/page.tsx`、`app/dashboard/layout.tsx`、`app/dashboard/actions.ts`、`app/dashboard/page.tsx`、`app/dashboard/products/actions.ts`、`app/dashboard/products/page.tsx`、`app/dashboard/orders/actions.ts`、`app/dashboard/orders/page.tsx`、`app/components/SiteHeader.tsx`、`app/cart/actions.ts`、`app/cart/page.tsx`、`app/api/cron/expire-orders/route.ts`、`app/orders/page.tsx`、`app/orders/[orderId]/page.tsx`
- Modify（`StoreDeps` の読み込み元）: `tests/integration/storeService.test.mts`、`productService.test.mts`、`cartService.test.mts`、`orderService.test.mts`

**Interfaces:**
- Produces: `services/deps.ts` が `export type StoreDeps = { db: PrismaClient; storage: ImageStorage }` と `export function deps(): StoreDeps`（中身は今の `app/dashboard/deps.ts` と同じ）を持つ。読み込みは `@/services/deps`

- [ ] **Step 1:** `services/deps.ts` を作る。`PrismaClient` と `ImageStorage` は `import type`、`prisma` と `getImageStorage` は値として読み込む
- [ ] **Step 2:** `app/dashboard/deps.ts` を消し、18 ファイルの読み込みを `import { deps } from "@/services/deps"` に書き換える
- [ ] **Step 3:** services 4 ファイルと結合テスト 4 ファイルの `StoreDeps` を `import type { StoreDeps } from "./deps"`（テストは `"../../services/deps"`）に書き換える。`storeService.ts` の定義は消す
- [ ] **Step 4:** 確認

Run: `npm test && npm run lint && npm run typecheck && npm run test:integration`
Expected: すべて成功

- [ ] **Step 5:** コミット

```bash
git add -A services app tests
git commit -m "refactor: deps と StoreDeps を services/deps.ts にまとめる"
```

### Task 2: `isUuid` を `lib/uuid.ts` へ

**Files:**
- Create: `lib/uuid.ts`、`lib/uuid.test.mts`
- Modify: `services/productService.ts:16,24-26`（`UUID_PATTERN` と `isUuid` を消して読み込みに）、`services/cartService.ts:4`、`services/orderService.ts:6`、`app/dashboard/products/[productId]/page.tsx:7`、`app/dashboard/orders/[orderId]/page.tsx:12`、`app/orders/[orderId]/page.tsx:14`
- Modify: `tests/integration/productService.test.mts`（`describe("isUuid")` と読み込みを消す）

**Interfaces:**
- Produces: `lib/uuid.ts` の `export function isUuid(value: string): boolean`（正規表現は今の `UUID_PATTERN` そのまま）。services からは `"../lib/uuid"`、app からは `"@/lib/uuid"`

- [ ] **Step 1:** `lib/uuid.test.mts` に、結合テストの `describe("isUuid")` をそのまま移す（`randomUUID()` が true、大文字も true、`"abc"` と `""` が false）
- [ ] **Step 2:** `npx tsx --test lib/uuid.test.mts` が「モジュールがない」で失敗することを確認
- [ ] **Step 3:** `lib/uuid.ts` を作り、読み込み元 6 ファイルを書き換え、`productService.ts` から消す
- [ ] **Step 4:** 確認

Run: `npm test && npm run lint && npm run typecheck`
Expected: すべて成功（`uuid.test.mts` を含む）

- [ ] **Step 5:** コミット

```bash
git add -A lib services app tests
git commit -m "refactor: isUuid を lib/uuid.ts へ移す"
```

### Task 3: `text()` と `SAVE_FAILED` を `lib/formData.ts` へ

**Files:**
- Create: `lib/formData.ts`、`lib/formData.test.mts`
- Modify: `app/checkout/actions.ts`、`app/dashboard/actions.ts`、`app/dashboard/products/actions.ts`、`app/dashboard/orders/actions.ts`、`app/cart/actions.ts`

**Interfaces:**
- Produces: `lib/formData.ts` の `export function text(formData: FormData, name: string): string`（文字列でなければ `""`）と `export const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。"`

- [ ] **Step 1:** `lib/formData.test.mts` に `text` のテストを書く：文字列の値はそのまま返す、項目がなければ `""`、`File` の値なら `""`
- [ ] **Step 2:** 失敗を確認：`npx tsx --test lib/formData.test.mts`
- [ ] **Step 3:** `lib/formData.ts` を作り、5 つの actions から `text` と `SAVE_FAILED` の定義を消して読み込みにする（`text` を使っていないファイルは `SAVE_FAILED` だけ）
- [ ] **Step 4:** 古い場所が残っていないことを確認

Run: `grep -rn "^function text\|const SAVE_FAILED\|dashboard/deps\|isUuid } from \"./productService\|isUuid } from \"@/services/productService\|StoreDeps } from \"./storeService\|StoreDeps } from \"../../services/storeService" app services tests`
Expected: 何も出ない

- [ ] **Step 5:** `npm test && npm run lint && npm run typecheck` が成功
- [ ] **Step 6:** コミット

```bash
git add -A lib app
git commit -m "refactor: フォーム値の取り出しと保存失敗の文言を lib/formData.ts にまとめる"
```

### Task 4: `deleteStoreAction` から `prisma` の直接利用をなくす

**Files:**
- Modify: `services/storeService.ts`（`deleteStore`）、`app/dashboard/actions.ts`（`deleteStoreAction` と `prisma` の読み込み）
- Test: `tests/integration/storeService.test.mts:190,209,251`

**Interfaces:**
- Produces: `deleteStore(deps, ownerSub, confirmSlug): Promise<{ ok: true; slug: string } | { ok: false; code: "not_found" | "confirm_mismatch" | "has_open_orders" }>`

- [ ] **Step 1:** 結合テストの 3 か所を `{ ok: true, slug: "shop-a" }` に変える
- [ ] **Step 2:** 失敗を確認：`npm run test:integration`（storeService の 3 件が失敗）
- [ ] **Step 3:** `deleteStore` の成功時に `{ ok: true, slug: store.slug }` を返す。`deleteStoreAction` は事前の `prisma.store.findUnique` をやめ、成功時だけ `revalidatePath("/s/" + result.slug)` する（`/dashboard` の再生成は今どおり常に行う）。`prisma` の読み込みを消す
- [ ] **Step 4:** 確認

Run: `grep -rn "@/lib/prisma" app` → `app` の中で `services/deps.ts` 以外に出ない（`app` には 1 件も出ない）
Run: `npm test && npm run lint && npm run typecheck && npm run test:integration`
Expected: すべて成功

- [ ] **Step 5:** コミット

```bash
git add services/storeService.ts app/dashboard/actions.ts tests/integration/storeService.test.mts
git commit -m "refactor: ストア削除の受付処理から prisma の直接利用をなくす"
```

### Task 5: 機能ガイドを新しい置き場所に合わせる

**Files:**
- Modify: `docs/feature-guide.md`

- [ ] **Step 1:** 「2-0. 全体の形」の `deps()` の説明を `services/deps.ts` に、「3-3」に「入力の取り出しは `lib/formData.ts` の `text`、保存失敗の文言は `SAVE_FAILED`」を足す。付録の表は、①〜⑤を「対応済み（2026-11-16）」の一文にまとめ、⑥（注文詳細ページ）だけ見送った理由とともに残す
- [ ] **Step 2:** `grep -n "dashboard/deps\|storeService.ts\` の \`StoreDeps\|productService.ts\` の \`isUuid" docs/feature-guide.md` が何も出さない
- [ ] **Step 3:** コミット

```bash
git add docs/feature-guide.md docs/superpowers
git commit -m "docs: 機能ガイドと整理の設計・計画を追加する"
```
