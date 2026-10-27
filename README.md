# Candy Rain Stores

Candy Rain ID を持つユーザーが自由にストアを運営できるサービスです。

現在はログイン機能のみ実装しています。[Candy Rain ID](https://github.com/Sparklingstadt/candy-rain-identity-server)（OpenID Connect）でログインすると「ログインに成功しました！」と表示されます。

## ローカルで動かす

1. candy-rain-identity-server の `OIDC_CLIENTS` にこのアプリを登録して起動します（identity server の `.env.example` に `candy-rain-stores` の例があります）。candy-rain-store と同時に動かせるよう、このアプリは 3001 番ポートを使います
2. 環境変数を設定して起動します

```bash
cp .env.example .env.local   # AUTH_SECRET と Candy Rain ID のクライアント情報を設定
npm install
npm run dev
```

http://localhost:3001 を開き「Candy Rain ID でログイン」を押します。

## 環境変数

| 変数 | 内容 |
| --- | --- |
| `AUTH_SECRET` | Auth.js のセッション暗号化キー（`openssl rand -base64 32`） |
| `AUTH_TRUST_HOST` | Vercel 以外で `npm start` するときに `true` |
| `AUTH_CANDY_RAIN_ID_ISSUER` | Candy Rain ID の公開 URL（identity server の `ISSUER` と一致させる） |
| `AUTH_CANDY_RAIN_ID_ID` / `AUTH_CANDY_RAIN_ID_SECRET` | identity server の `OIDC_CLIENTS` に登録した `id` / `secret` |
