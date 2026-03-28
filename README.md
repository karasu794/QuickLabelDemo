この README は納品パッケージに同梱する「最短で動かすための手順」を目的に作成しています。開発用のメモ（docs/ 等）や .pnpm/、node_modules/ は含めていません。

重要な前提（必ずお読みください）

ZIP は .pnpm/ と node_modules/ を除外してあります。展開後は必ず pnpm install（または代替）を実行してください。

実環境の秘密情報（APIキーやDBパスワード）は ZIP に含めていません。.env.example を参照のうえ、別ルートで安全に渡してください。

FedEx 本番環境はサンドボックスと挙動が異なります。本番運用に際しては仕様変化による追従が必要になります。

同梱ファイル（主な）
FQL_DELIVERY/
├── src/
├── prisma/ or migrations/   (存在する場合)
├── scripts/
├── public/
├── package.json
├── pnpm-lock.yaml
├── next.config.js
├── tsconfig.json (if TS)
├── .env.example
├── README.md  (これ)
└── DELIVERY_NOTES.md

必須（クライアント側で準備するもの）

Supabase / Postgres 接続情報（URL / SERVICE_ROLE_KEY / ANON_KEY 等）

FedEx 本番 API キー（テストキーとは別）

決済プロバイダ鍵（Square / Stripe 等、導入している場合）

ドメイン / TLS 設定（本番稼働時）

※秘密情報は必ず安全なチャネル（Vault / SFTP / 手渡し等）で渡してください。

動作環境（推奨）

Node.js LTS（推奨 v18 / v20）

pnpm（ローカルにインストール推奨）

PostgreSQL / Supabase（接続情報を用意）

OS: macOS / Linux / Windows（PowerShell or WSL 推奨）

事前準備：pnpm が無い場合（一度だけ）

推奨：corepack 経由（Node.js 16.14+ がある場合）

corepack enable
corepack prepare pnpm@latest --activate


または npm からグローバルにインストール

npm install -g pnpm


（Windows で権限エラーが出る場合は PowerShell を管理者で実行）

ローカルでの最短起動手順（bash / WSL / macOS）

ZIP を展開してプロジェクトルートへ移動

.env.example をコピーして .env.local を作る

cp .env.example .env.local
# エディタで .env.local を編集して実鍵を設定


依存をインストール

pnpm install


DB マイグレーション（あれば）

# 例：Prisma を利用している場合
pnpm run prisma:migrate:deploy   # or pnpm run migrate


開発サーバ起動

pnpm run dev


ブラウザで http://localhost:3000 を開く

Windows（PowerShell）での手順

ZIP を展開し、PowerShell をプロジェクトルートで開く

.env.example をコピーして .env.local を作る

Copy-Item .env.example .env.local
# .env.local をエディタで編集して実鍵を設定


依存をインストール

pnpm install


マイグレーション（あれば）

pnpm run prisma:migrate:deploy


開発サーバ起動

pnpm run dev


ブラウザで http://localhost:3000 を確認

主要コマンド（package.json に合わせて）

pnpm install — 依存インストール

pnpm run dev — 開発サーバ（ホットリロード）

pnpm run build — 本番ビルド

pnpm run start — 本番ビルド後の起動

pnpm run test — テストがある場合の実行

pnpm run prisma:migrate:deploy — マイグレーション適用（存在する場合）

※ package.json にコマンド名がない場合は scripts を合わせてください。

.env に最低限必要な変数（例）

下記は例です。プロジェクトで定義された環境変数に合わせてください。

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgresql://...
FEDEX_API_KEY=
FEDEX_API_SECRET=
PAYMENT_PROVIDER_KEY=
NEXTAUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000


動作確認チェックリスト（必須）

サイトが起動してトップページが表示される

開発用テストアカウントでログインできる（あれば）

見積もりフローが最後まで動く（FedExキーがない場合はサンドボックスで動作確認）

ラベル発行（テスト）のログが出力され、PDFが生成される（※課金が発生しない手順で実施）

管理者ページに入れて主要機能が表示される（権限/認証チェック）

よくあるトラブルと対処

ZIP を展開しても起動できない
→ .pnpm や node_modules が混入している可能性。再度 pnpm install を実行してください。

pnpm が無い / 権限エラー
→ corepack を有効化するか npm i -g pnpm を管理者権限で実行。

DB 接続エラー
→ .env.local の DATABASE_URL を確認。ローカルで Postgres / Supabase が立っているか確認。

FedEx 関連でエラーが出る
→ 本番キーを使っているか、または本番でのオプション差分により見積と請求が異なる設計上の挙動がある旨を理解してください。ログ（サーバログ / stdout）を保存して、該当 Request ID を控えてください。

Windows の長いパス問題
→ 7-Zip を使うか、PowerShell の長パス設定を有効にして再展開してください。