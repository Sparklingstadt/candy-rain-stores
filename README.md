# Candy Rain Stores

Candy Rain ID を持つユーザーが自由にストアを運営できるサービスです。

[Candy Rain ID](https://github.com/Sparklingstadt/candy-rain-identity-server)（OpenID Connect）でログインし、自分のストアを作成・編集・公開・削除できます。公開したストアは `/s/<ストア ID>` で閲覧できます。

ダッシュボードの「商品を管理」から商品（名前・価格・在庫・説明文・画像）を登録できます。公開した商品はストアページの一覧と `/s/<ストア ID>/products/<商品 ID>` の詳細ページに表示され、在庫が 0 のときは「売り切れ」になります。

ログインした購入者は商品ページから「カートに入れる」でき、`/cart` で確認して `/checkout` でお届け先を入力すると注文できます（支払いはサービス内では行わず、ストアが案内する方法で支払います）。複数ストアの商品が入っていても、注文はストアごとに分かれます。購入者は `/orders` で注文履歴を見られます（購入者が自分で注文をキャンセルすることはできません）。ストアのオーナーはストアの編集画面で「お支払い方法の案内」を設定でき、「注文を管理」（`/dashboard/orders`）で注文の状態を更新（支払確認・発送済み・キャンセル）できます。

## ローカルで動かす

必要なもの: Node.js、PostgreSQL、Candy Rain ID（candy-rain-identity-server）。

1. PostgreSQL にデータベースを作ります（例: `createdb stores`）
2. candy-rain-identity-server の `OIDC_CLIENTS` にこのアプリを登録して起動します（identity server の `.env.example` に `candy-rain-stores` の例があります）。candy-rain-store と同時に動かせるよう、このアプリは 3001 番ポートを使います
3. 環境変数を設定してマイグレーションし、起動します

```bash
cp .env.example .env         # DATABASE_URL / DIRECT_URL を設定（prisma と tsx は .env を読みます）
cp .env.example .env.local   # AUTH_SECRET と Candy Rain ID のクライアント情報など（Next.js は .env.local も読みます）
npm install
npm run db:migrate           # prisma migrate deploy
npm run dev
```

http://localhost:3001 を開き「Candy Rain ID でログイン」を押すと、ストアの作成画面（ダッシュボード）が開きます。公開したストアは `/s/<ストア ID>` で誰でも見られます。

Supabase を用意しなくても、`IMAGE_STORAGE=memory` を設定すると画像をプロセスのメモリに保存して動かせます（再起動で消えます）。

## 環境変数

| 変数 | 内容 |
| --- | --- |
| `AUTH_SECRET` | Auth.js のセッション暗号化キー（`openssl rand -base64 32`） |
| `AUTH_TRUST_HOST` | Vercel 以外で `npm start` するときに `true` |
| `AUTH_CANDY_RAIN_ID_ISSUER` | Candy Rain ID の公開 URL（identity server の `ISSUER` と一致させる） |
| `AUTH_CANDY_RAIN_ID_ID` / `AUTH_CANDY_RAIN_ID_SECRET` | identity server の `OIDC_CLIENTS` に登録した `id` / `secret` |
| `DATABASE_URL` | PostgreSQL の接続 URL |
| `DIRECT_URL` | マイグレーション用の直接接続 URL（省略時は `DATABASE_URL`） |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | ストア画像を保存する Supabase Storage（公開バケット `store-images`）。サーバー専用なので `NEXT_PUBLIC_` を付けない |
| `IMAGE_STORAGE` | `memory` にすると Supabase の代わりにメモリへ保存（ローカル開発・テスト用） |

## テスト

```bash
npm test                  # ユニットテスト
npm run test:integration  # DB を使う結合テスト（DATABASE_URL が必要）
npm run test:e2e          # Playwright による E2E テスト
```

> 注意: 結合テストと E2E は `Store` テーブルを全削除します。`DATABASE_URL` が localhost / 127.0.0.1 / ::1 以外を指しているとエラーで中止します（本番 DB を守るため）。意図的に実行する場合のみ `ALLOW_DB_RESET=1` を指定してください。

### E2E テスト

E2E は 3118 番ポートでアプリをビルド・起動し、実ブラウザで次の 3 つの流れを通します（画像は `IMAGE_STORAGE=memory` で保存されるため、画像の検証は枚数と並び順のみです）。

- `e2e/store.spec.ts`: ストアの作成・公開・削除、ログアウト
- `e2e/products.spec.ts`: 商品の作成、画像 2 枚の追加と並べ替え、公開、未ログインでの閲覧（価格・在庫・売り切れ表示）、削除後の 404、ストアの削除
- `e2e/orders.spec.ts`: 2 つのストアの商品をカートに入れて注文（ストアごとに注文が分かれる）、支払い方法の案内の確認、購入者にキャンセルボタンが出ないこと、オーナーとして注文の支払い確認・発送（DB に直接用意したストア・注文を使います）

実行前に次を用意してください。

1. candy-rain-identity-server を `http://localhost:8080` で起動し、`OIDC_CLIENTS` に次を登録します
   - クライアント `id`: `candy-rain-stores` / `secret`: `stores-secret`
   - リダイレクト URI: `http://localhost:3118/api/auth/callback/candy-rain-id`
   - ログアウト後のリダイレクト URI: `http://localhost:3118/`
   - デモユーザー `user1@mail.com` / `demo-password`
2. マイグレーション済みの PostgreSQL（既定は `postgresql://user@localhost:5432/stores`）。テスト開始前に `Store` テーブルは空にされます
3. `npm run test:e2e`

設定は環境変数 `AUTH_CANDY_RAIN_ID_ISSUER` / `AUTH_CANDY_RAIN_ID_ID` / `AUTH_CANDY_RAIN_ID_SECRET` / `AUTH_SECRET` / `DATABASE_URL` で上書きできます。ブラウザは Playwright が管理する Chromium を使います（`npx playwright install chromium`）。別の場所の Chromium を使うときは `PLAYWRIGHT_CHROMIUM_PATH` に実行ファイルのパスを指定します。
