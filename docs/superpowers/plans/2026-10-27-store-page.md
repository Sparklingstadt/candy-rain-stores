# ストア作成と公開ページ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ログインしたユーザーが 1 つだけストアを作り、編集・公開・削除でき、公開したストアを誰でも `/s/<ストアID>` で見られるようにする。ログアウトも付ける。

**Architecture:** Next.js（App Router）のサーバー側だけが Supabase（PostgreSQL と Storage）に触る。データベースは Prisma 7（`@prisma/adapter-pg`）、画像は `ImageStorage` インターフェース越しに Supabase Storage（本番）かメモリ（テスト）へ保存する。権限は `services/storeService.ts` が「ログイン中ユーザーの `sub`」だけを鍵にして守る。

**Tech Stack:** Next.js 16 / React 19 / Auth.js v5（OIDC: Candy Rain ID）/ Prisma 7 + PostgreSQL（Supabase）/ `@supabase/supabase-js` 2 / Tailwind CSS 4 / `tsx --test`（node:test）/ Playwright

**Spec:** `docs/superpowers/specs/2026-10-27-store-page-design.md`

## Global Constraints

- 1 ユーザー 1 ストア（`Store.ownerSub` unique）。ストア ID（`slug`）は unique で作成後は変更不可
- ストア ID：`^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$`（前後の空白を除き小文字化してから判定）
- ストア名 1〜50 文字（trim 後）、説明文 500 文字まで（空なら null）、テーマカラー `#rrggbb`（小文字化）、既定値 `#e85d8f`
- 画像：PNG・JPEG・WebP をファイル先頭バイトで判定、1 枚 2 MB（2 * 1024 * 1024 バイト）まで
- バケット名 `store-images`、パス `<Store.id>/logo-<ランダム>.<ext>`・`<Store.id>/header-<ランダム>.<ext>`
- Server Actions の `bodySizeLimit` は `"5mb"`
- Supabase の鍵（`SUPABASE_SERVICE_ROLE_KEY`）はサーバー専用。`NEXT_PUBLIC_` を付けない
- 画面の文言は日本語。開発サーバーのポートは 3001（既存）
- Server Actions はフォームの値でストアを指定しない。必ずセッションの `sub` からストアを引く
- 単体テストは `*.test.mts`、結合テストは `tests/integration/*.test.mts`（candy-rain-store と同じ `tsx --test`）

## Review Focus

- 全角スペースや大文字混じりのストア ID（`" Sweets-Shop "`）→ `sweets-shop` に正規化して受け付ける。全角英数（`ｓｈｏｐ`）は不正として弾く → Task 1 のテストに含める
- 拡張子だけ `.png` の別形式ファイル（例：先頭が `GIF89a`）→ 画像として受け付けない → Task 1 のテストに含める
- 空のファイル入力（画像を選ばずに送信すると `size === 0` の `File` が届く）→「画像なし（変更なし）」として扱い、エラーにしない → Task 1 のテストに含める
- 2 つのタブから同時に作成 → 2 件目は `ownerSub` の unique 違反（Prisma `P2002`）を `already_has_store` に変換し、500 にしない → Task 3 のテストに含める
- Storage への保存は成功したがデータベース更新が失敗（ストア ID 重複など）→ 保存した新しい画像を消す → Task 3 のテストに含める

---

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `lib/storeValidation.ts` (+ `.test.mts`) | 入力の正規化と検証（純粋関数） |
| `lib/imageStorage.ts` | `ImageStorage` インターフェース・メモリ実装・Supabase 実装・`getImageStorage()` |
| `lib/prisma.ts`・`lib/databaseUrl.ts` | Prisma クライアント（candy-rain-store と同じ作り） |
| `prisma/schema.prisma`・`prisma/migrations/`・`prisma.config.ts` | `Store` テーブル |
| `services/storeService.ts` | ストアの作成・更新・公開切り替え・削除・取得 |
| `tests/integration/storeService.test.mts` | 上の結合テスト |
| `auth.ts` | セッションに Candy Rain ID の `sub` を載せる |
| `lib/session.ts` | `requireSub()`・`getSub()` |
| `app/api/signout-redirect/route.ts`・`app/components/SignOutButton.tsx` | ログアウト |
| `app/page.tsx` | ログイン済みなら `/dashboard` へ |
| `app/dashboard/page.tsx`・`actions.ts`・`StoreForm.tsx`・`DeleteStoreForm.tsx` | オーナー画面 |
| `app/s/[slug]/page.tsx` | 公開ストアページ |
| `app/globals.css`・`postcss.config.mjs` | Tailwind |
| `e2e/store.spec.ts`・`playwright.config.ts` | E2E |
| `.github/workflows/ci.yml` | CI |

---

### Task 1: 入力チェックと単体テストの土台・CI

**Files:**
- Create: `lib/storeValidation.ts`, `lib/storeValidation.test.mts`, `.github/workflows/ci.yml`
- Modify: `package.json`（`tsx` を devDependencies に追加、`"test": "tsx --test lib/*.test.mts"`）

**Interfaces:**
- Produces:
  ```ts
  export const DEFAULT_THEME_COLOR = "#e85d8f"
  export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
  export type StoreField = "slug" | "name" | "description" | "themeColor" | "logo" | "header"
  export type FieldErrors = Partial<Record<StoreField, string>>   // 値は画面にそのまま出す日本語メッセージ
  export type StoreFields = { name: string; description: string | null; themeColor: string }
  export function normalizeSlug(raw: string): string
  export function validateSlug(raw: string): { ok: true; slug: string } | { ok: false; error: string }
  export function validateStoreFields(raw: { name: string; description: string; themeColor: string }):
    { ok: true; value: StoreFields } | { ok: false; errors: FieldErrors }
  export type ImageType = { contentType: "image/png" | "image/jpeg" | "image/webp"; ext: "png" | "jpg" | "webp" }
  // bytes.length === 0 は「画像なし」として { ok: true, image: null }
  export function validateImage(bytes: Uint8Array):
    { ok: true; image: (ImageType & { bytes: Uint8Array }) | null } | { ok: false; error: string }
  ```

- [ ] **Step 1: 失敗するテストを書く**（`lib/storeValidation.test.mts`）
  - `validateSlug`：`"sweets-shop"` → ok。`" Sweets-Shop "` → `{ ok: true, slug: "sweets-shop" }`。`"ab"`・31 文字・`"-shop"`・`"shop-"`・`"sweets_shop"`・`"ｓｈｏｐ"` → `ok: false`。3 文字 `"abc"` と 30 文字はちょうど ok
  - `validateStoreFields`：`name: "  キャンディ屋  "` → `"キャンディ屋"`。`name: "   "` と 51 文字 → `errors.name` あり。`description: ""` → `null`、501 文字 → `errors.description`。`themeColor: "#E85D8F"` → `"#e85d8f"`、`"red"`・`"#fff"` → `errors.themeColor`。複数の誤りは同時に全部返す
  - `validateImage`：PNG 先頭 `89 50 4E 47 0D 0A 1A 0A` → `{ contentType: "image/png", ext: "png" }`。JPEG `FF D8 FF` → `jpg`。WebP `"RIFF" ???? "WEBP"` → `webp`。`"GIF89a"` → `ok: false`。空配列 → `{ ok: true, image: null }`。`MAX_IMAGE_BYTES + 1` バイトの PNG → `ok: false`、ちょうど `MAX_IMAGE_BYTES` は ok
  - エラーメッセージの文言：ストア ID「ストア ID は英小文字・数字・ハイフンで 3〜30 文字にしてください（先頭と末尾にハイフンは使えません）」、画像形式「PNG・JPEG・WebP の画像を選んでください」、画像サイズ「画像は 2MB 以下にしてください」
- [ ] **Step 2:** `npm test` → 関数がないため FAIL
- [ ] **Step 3:** `lib/storeValidation.ts` を実装（`normalizeSlug` は `trim()` → `toLowerCase()`。全角は正規化せず正規表現で弾く）
- [ ] **Step 4:** `npm test` → PASS、`npm run lint`・`npm run typecheck` も通る
- [ ] **Step 5:** `.github/workflows/ci.yml` を作る：`pull_request` と `main` への push で、Node 22・`npm ci`・`npm test`・`npm run lint`・`npm run typecheck`（結合テストのジョブは Task 3 で足す）。`actions/checkout` は `persist-credentials: false`、`permissions: contents: read`
- [ ] **Step 6:** コミット `feat: ストアの入力チェックを追加`

### Task 2: データベース（Prisma と Store テーブル）

**Files:**
- Create: `prisma/schema.prisma`, `prisma.config.ts`, `prisma/migrations/<timestamp>_add_store/migration.sql`, `lib/prisma.ts`, `lib/databaseUrl.ts`
- Modify: `package.json`（`prisma`・`@prisma/client`・`@prisma/adapter-pg`・`pg`・`dotenv`・`@types/pg` を追加。`"build": "prisma generate && next build"`、`"typecheck": "prisma generate && next typegen && tsc --noEmit"`、`"db:migrate": "prisma migrate deploy"`）、`.gitignore`（`/generated/prisma`）、`.env.example`（`DATABASE_URL`・`DIRECT_URL`）

**Interfaces:**
- Produces: `import { prisma } from "@/lib/prisma"`、`import type { Store } from "@/generated/prisma/client"`、`Prisma.PrismaClientKnownRequestError`

- [ ] **Step 1:** `lib/databaseUrl.ts` は candy-rain-store の同名ファイルをそのままコピー（`withExplicitSslMode`）。`lib/prisma.ts` も同じ作り
- [ ] **Step 2:** `schema.prisma` に `generator client { provider = "prisma-client"; output = "../generated/prisma" }` と `Store` モデル：`id String @id @default(uuid()) @db.Uuid`、`ownerSub String @unique`、`slug String @unique`、`name String`、`description String?`、`logoPath String?`、`headerPath String?`、`themeColor String @default("#e85d8f")`、`isPublished Boolean @default(false)`、`createdAt DateTime @default(now())`、`updatedAt DateTime @updatedAt`
- [ ] **Step 3:** `prisma.config.ts`：`datasource.url` はマイグレーション用に `DIRECT_URL ?? DATABASE_URL`（Supabase のプーラーではマイグレーションが通らないため）
- [ ] **Step 4:** ローカル PostgreSQL に対して `npx prisma migrate dev --name add_store` でマイグレーションを作る。`npx prisma migrate status` が「up to date」
- [ ] **Step 5:** `npm run typecheck` が通る
- [ ] **Step 6:** コミット `feat: Store テーブルを追加`

### Task 3: 画像ストレージとストアのサービス

**Files:**
- Create: `lib/imageStorage.ts`, `services/storeService.ts`, `tests/integration/storeService.test.mts`
- Modify: `package.json`（`@supabase/supabase-js` を追加、`"test:integration": "tsx --test tests/integration/*.test.mts"`）、`.github/workflows/ci.yml`（`postgres:16-alpine` サービスで `npm run db:migrate` → `npm run test:integration`）、`.env.example`（`SUPABASE_URL`・`SUPABASE_SERVICE_ROLE_KEY`・`IMAGE_STORAGE`）

**Interfaces:**
- Consumes: Task 1 の `validateSlug`・`validateStoreFields`・`validateImage` の結果型、Task 2 の `prisma`
- Produces:
  ```ts
  // lib/imageStorage.ts
  export interface ImageStorage {
    put(path: string, bytes: Uint8Array, contentType: string): Promise<void>
    remove(paths: string[]): Promise<void>
    publicUrl(path: string): string
  }
  export class MemoryImageStorage implements ImageStorage { readonly files: Map<string, Uint8Array>; failNextPut?: boolean }
  export function getImageStorage(): ImageStorage  // IMAGE_STORAGE=memory ならプロセス内で共有するメモリ実装、それ以外は Supabase（バケット store-images）

  // services/storeService.ts
  export type StoreDeps = { db: PrismaClient; storage: ImageStorage }
  export type ImageInput = (ImageType & { bytes: Uint8Array }) | null          // null = 変更なし
  export type StoreView = Store & { logoUrl: string | null; headerUrl: string | null }
  export type CreateResult = { ok: true; store: StoreView } | { ok: false; code: "invalid"; errors: FieldErrors } | { ok: false; code: "already_has_store" }
  export type UpdateResult = { ok: true; store: StoreView } | { ok: false; code: "invalid"; errors: FieldErrors } | { ok: false; code: "not_found" }
  export function getOwnStore(deps: StoreDeps, ownerSub: string): Promise<StoreView | null>
  export function getStoreForViewer(deps: StoreDeps, slug: string, viewerSub: string | null): Promise<{ store: StoreView; isOwnerPreview: boolean } | null>
  export function createStore(deps: StoreDeps, ownerSub: string, input: { slug: string; fields: StoreFields; logo: ImageInput; header: ImageInput }): Promise<CreateResult>
  export function updateStore(deps: StoreDeps, ownerSub: string, input: { fields: StoreFields; logo: ImageInput; header: ImageInput; removeLogo: boolean; removeHeader: boolean }): Promise<UpdateResult>
  export function setPublished(deps: StoreDeps, ownerSub: string, isPublished: boolean): Promise<StoreView | null>
  export function deleteStore(deps: StoreDeps, ownerSub: string, confirmSlug: string): Promise<{ ok: true } | { ok: false; code: "not_found" | "confirm_mismatch" }>
  ```

- [ ] **Step 1: 失敗するテストを書く**（`tests/integration/storeService.test.mts`。各テストの前に `Store` を全件削除、`after` で `$disconnect`。`storage` は毎回新しい `MemoryImageStorage`）
  - 作成すると非公開で、`themeColor` などが保存され、ロゴを渡すと `<id>/logo-*.png` が `storage.files` に入り `logoUrl` が返る
  - 同じ `ownerSub` で 2 回目 → `already_has_store`。`Promise.all` で同時に 2 回作成しても 1 件だけ成功し、もう片方は `already_has_store`（例外にならない）
  - 別ユーザーが同じ slug → `{ code: "invalid", errors: { slug: "このストア ID はすでに使われています" } }`。このとき渡したロゴは `storage.files` に残っていない
  - `updateStore` は自分のストアだけ変える：ユーザー B の更新はユーザー A のストアを変えず、B がストアを持たなければ `not_found`
  - ロゴを差し替えると古いファイルが消え新しいファイルだけ残る。`removeLogo: true` で `logoPath` が null になりファイルも消える
  - `storage.failNextPut = true` で更新 → 例外が投げられ、データベースは元のまま
  - `getStoreForViewer`：非公開は他人と未ログイン（`null`）に `null`、オーナーには `isOwnerPreview: true`。公開後は誰にでも返り `isOwnerPreview: false`。存在しない slug は `null`
  - `deleteStore`：確認の slug が違えば `confirm_mismatch` で残る。一致すれば行と画像が消え、同じ slug で別ユーザーが作成できる
- [ ] **Step 2:** `npm run test:integration` → FAIL
- [ ] **Step 3:** `lib/imageStorage.ts` を実装。Supabase 実装は `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })` の `storage.from("store-images")` の `upload(path, bytes, { contentType, upsert: false })`・`remove(paths)`・`getPublicUrl(path)`。ファイル名のランダム部分は `crypto.randomUUID()`
- [ ] **Step 4:** `services/storeService.ts` を実装。作成は「`id` を先に `randomUUID()` で決める → 画像を put → `db.store.create`」。`P2002` の `meta.target` に `ownerSub` が含まれれば `already_has_store`、`slug` なら slug エラー。いずれの失敗でも put 済みの画像を remove。更新は「新しい画像を put → `db.store.update({ where: { ownerSub } })` → 成功後に古い画像を remove（失敗は `console.error` のみ）」
- [ ] **Step 5:** `npm run test:integration` → PASS、`npm test`・`npm run lint`・`npm run typecheck` も通る
- [ ] **Step 6:** CI に結合テストのジョブを追加（`DATABASE_URL=postgresql://user:pass@localhost:5432/stores`、`IMAGE_STORAGE=memory`）
- [ ] **Step 7:** コミット `feat: ストアの作成・更新・公開・削除のサービスを追加`

### Task 4: セッションの sub・ログアウト・トップページ

**Files:**
- Create: `lib/session.ts`, `app/api/signout-redirect/route.ts`, `app/components/SignOutButton.tsx`, `types/next-auth.d.ts`
- Modify: `auth.ts`, `app/page.tsx`

**Interfaces:**
- Produces:
  ```ts
  // lib/session.ts
  export async function getSub(): Promise<string | null>     // セッションの Candy Rain ID sub
  export async function requireSub(): Promise<string>         // 未ログインなら redirect("/")
  // app/components/SignOutButton.tsx（client component）
  export function SignOutButton(): JSX.Element                // signOut({ redirectTo: "/api/signout-redirect" })
  ```

- [ ] **Step 1:** `auth.ts` の `jwt` コールバックで、サインイン時に `token.sub = account.providerAccountId`（Auth.js は OIDC の `user.id` をランダムな UUID にするため、candy-rain-store と同じく `providerAccountId` を使う）。`session` コールバックで `session.user.id = token.sub`。`types/next-auth.d.ts` で型を足す
- [ ] **Step 2:** `lib/session.ts` を実装
- [ ] **Step 3:** `app/api/signout-redirect/route.ts`：`GET` で `${AUTH_CANDY_RAIN_ID_ISSUER}/logout?client_id=<AUTH_CANDY_RAIN_ID_ID>&post_logout_redirect_uri=<request の origin>/` へ 303（candy-rain-store の同名ルートと同じ作り）
- [ ] **Step 4:** `app/page.tsx`：`getSub()` があれば `redirect("/dashboard")`、なければ今のログインボタン（`redirectTo: "/dashboard"`）
- [ ] **Step 5:** ローカルの Candy Rain ID（IDサーバーの `OIDC_CLIENTS` に `post_logout_redirect_uris: ["http://localhost:3001/"]`）で手動確認：ログイン → `/dashboard`（この時点では 404 でよい）、`/api/signout-redirect` → IDサーバーの `/logout` → `/` に戻り、再度ログインするとパスワードを聞かれる
- [ ] **Step 6:** `npm run lint`・`npm run typecheck` → 通る。コミット `feat: ログアウトを追加し、ログイン後はダッシュボードへ移動する`

### Task 5: オーナー画面（作成・編集・公開・削除）

**Files:**
- Create: `app/dashboard/page.tsx`, `app/dashboard/actions.ts`, `app/dashboard/StoreForm.tsx`, `app/dashboard/DeleteStoreForm.tsx`, `app/dashboard/formImage.ts`, `app/globals.css`, `postcss.config.mjs`
- Modify: `app/layout.tsx`（`globals.css` を読み込む）, `next.config.ts`（`experimental.serverActions.bodySizeLimit: "5mb"`）, `package.json`（`tailwindcss@4`・`@tailwindcss/postcss`）

**Interfaces:**
- Consumes: Task 1 の検証関数、Task 3 の `getOwnStore`・`createStore`・`updateStore`・`setPublished`・`deleteStore`・`getImageStorage`、Task 4 の `requireSub`・`SignOutButton`
- Produces:
  ```ts
  // app/dashboard/actions.ts（"use server"。どれも最初に requireSub()）
  export type StoreFormState = { errors?: FieldErrors; values?: { slug?: string; name: string; description: string; themeColor: string }; message?: string }
  export async function createStoreAction(prev: StoreFormState, formData: FormData): Promise<StoreFormState>
  export async function updateStoreAction(prev: StoreFormState, formData: FormData): Promise<StoreFormState>
  export async function setPublishedAction(formData: FormData): Promise<void>          // formData.get("publish") === "true"
  export async function deleteStoreAction(prev: { error?: string }, formData: FormData): Promise<{ error?: string }>
  // app/dashboard/formImage.ts
  export async function readImageField(formData: FormData, name: "logo" | "header"): Promise<ReturnType<typeof validateImage>>
  ```

- [ ] **Step 1:** `formImage.ts`：`formData.get(name)` が `File` なら `new Uint8Array(await file.arrayBuffer())` を `validateImage` に渡す。`File` でなければ「画像なし」
- [ ] **Step 2:** `actions.ts`：検証エラーは `values` 付きで返す（入力を保持）。作成成功・`already_has_store` は `redirect("/dashboard")`。更新・公開切り替え・削除のあとは `revalidatePath("/dashboard")` と `revalidatePath("/s/" + slug)`。削除で `confirm_mismatch` は `{ error: "ストア ID が一致しません" }`
- [ ] **Step 3:** `StoreForm.tsx`（client component、`useActionState`）：作成時はストア ID 入力と「URL: {origin}/s/{入力中の ID}」「作成後は変更できません」を表示。編集時はストア ID を表示のみ。ロゴ・ヘッダーは現在の画像のサムネイルと「画像を削除」チェックボックス（`removeLogo`・`removeHeader`）。テーマカラーは `<input type="color">`。項目ごとのエラーを各入力の下に `role="alert"` で表示
- [ ] **Step 4:** `DeleteStoreForm.tsx`：「ストア ID を入力して削除」欄と削除ボタン。入力がストア ID と一致するまでボタンを無効にする（サーバー側でも `deleteStore` が確認する）
- [ ] **Step 5:** `page.tsx`：`requireSub()` → `getOwnStore()`。ヘッダーに「Candy Rain Stores」と `SignOutButton`。ストアがなければ作成フォーム、あれば「公開中／非公開」の表示・`setPublishedAction` のボタン・「ストアページを見る」リンク・編集フォーム・削除フォーム
- [ ] **Step 6:** Tailwind を入れ、`npm run build` が通る
- [ ] **Step 7:** ローカル（`IMAGE_STORAGE=memory`）で手動確認：作成 → 編集 → 画像の差し替えと削除 → 公開切り替え → 間違った ID では削除できない → 正しい ID で削除すると作成フォームに戻る。不正なストア ID・3MB の画像・GIF でそれぞれ項目にエラーが出て、入力が残る
- [ ] **Step 8:** `npm run lint`・`npm run typecheck`・`npm test` → 通る。コミット `feat: ストアの作成・編集・公開・削除の画面を追加`

### Task 6: 公開ストアページ

**Files:**
- Create: `app/s/[slug]/page.tsx`, `app/s/[slug]/not-found.tsx`

**Interfaces:**
- Consumes: Task 3 の `getStoreForViewer`・`getImageStorage`、Task 4 の `getSub`

- [ ] **Step 1:** `page.tsx`：`getStoreForViewer(deps, slug, await getSub())` が `null` なら `notFound()`。`generateMetadata` でタイトルをストア名に（見つからなければ既定のまま）
- [ ] **Step 2:** 表示：ヘッダー画像（なければテーマカラーの帯）、ロゴ、ストア名、説明文（改行を保持、HTML として解釈しない）。テーマカラーは CSS 変数 `--store-color` で見出しや帯に使う。`isOwnerPreview` なら上部に「非公開です（あなたにだけ表示されています）」と「ダッシュボードに戻る」。商品一覧の場所は「商品はまだありません」
- [ ] **Step 3:** 手動確認：非公開中はシークレットウィンドウで 404、オーナーには帯付きで表示、公開後はシークレットウィンドウでも表示、存在しない ID は 404
- [ ] **Step 4:** `npm run lint`・`npm run typecheck`・`npm run build` → 通る。コミット `feat: 公開ストアページを追加`

### Task 7: E2E テスト

**Files:**
- Create: `playwright.config.ts`, `e2e/store.spec.ts`
- Modify: `package.json`（`@playwright/test` を追加、`"test:e2e": "playwright test"`）、`README.md`

**Interfaces:**
- Consumes: 起動中の Candy Rain ID（`E2E_IDP_ISSUER`、デモユーザー `user1@mail.com` / `demo-password` と、2 人目のユーザー）

- [ ] **Step 1:** `playwright.config.ts`：`webServer` は `npm run build && npm start -- --port 3118`、env に `AUTH_TRUST_HOST=true`・`AUTH_URL=http://localhost:3118`・`IMAGE_STORAGE=memory`。IDサーバーは別に起動しておく前提（`OIDC_CLIENTS` に `http://localhost:3118/api/auth/callback/candy-rain-id` と `http://localhost:3118/` を登録）。テスト前にローカル DB の `Store` を空にする（`globalSetup`）
- [ ] **Step 2:** `e2e/store.spec.ts`「ストアを作って公開し、削除する」：ログイン → ストア名「E2E キャンディ」・ID `e2e-candy` で作成 → 新しいブラウザコンテキスト（未ログイン）で `/s/e2e-candy` が 404 → 公開する → 未ログインのコンテキストで「E2E キャンディ」が見える → `e2e-candy` を入力して削除 → 作成フォームが出る → ログアウトして `/` にログインボタン
- [ ] **Step 3:** `npm run test:e2e` → PASS
- [ ] **Step 4:** README に、DB・Supabase・E2E の動かし方と環境変数を追記
- [ ] **Step 5:** コミット `test: ストア作成から削除までの E2E を追加`

### Task 8: 本番の準備（ユーザーと一緒に行う）

外部のサービスに作成・変更を加えるので、各ステップの前にユーザーに確認する。

- [ ] **Step 1:** Supabase にプロジェクトを作る（Supabase の MCP ツールで作るか、ユーザーがダッシュボードで作るかを確認）。公開バケット `store-images` を作る
- [ ] **Step 2:** Vercel の candy-rain-stores に `DATABASE_URL`（プーラー、`?pgbouncer=true`）・`DIRECT_URL`・`SUPABASE_URL`・`SUPABASE_SERVICE_ROLE_KEY` を設定（Sensitive）
- [ ] **Step 3:** 本番 DB に `npm run db:migrate`（`DIRECT_URL` で実行）
- [ ] **Step 4:** PR を作り、CI が通ったらユーザーの確認を経てマージ。デプロイ後に本番で作成 → 公開 → 削除を確認
