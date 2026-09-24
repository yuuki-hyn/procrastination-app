# CLAUDE.md

先延ばし解決Webアプリ（個人開発）の、Claude Code向けプロジェクトルール。

## 資料

| ファイル | 内容 |
|---|---|
| `docs/REQUIREMENTS.md` | 要件定義書 |
| `docs/API_ENDPOINTS.md` | 全16エンドポイントの仕様（実装の正） |
| `schema.sql` | DB定義 |
| `docs/mockup.html` | 画面モックアップ |

---

## AIとの役割分担

- **設計判断は開発者が行う**。Claudeは選択肢とメリット・デメリット（トレードオフ）を提示する。推奨を求められた場合は、理由とともに明言する
- **バックエンドのコアロジック（認証、Service、SQLなど）は開発者が理解しながら書く**。Claudeはコマンド・コードを提示・解説し、ファイルの編集やコマンドの実行は開発者が明示的に依頼した場合に限って行う。Claude CodeはManualモード（編集・コマンド実行の前に許可を求める）で使う
- **フロントエンドは、バックエンドに集中するため、実装にAIを多く活用する**。技術選定と動作確認は開発者が行う
- 仕組みや用語は、判断に必要な前提から具体例やコードで説明する。提示したコードは、求められたら1行ずつ解説する

## 進め方

- **1ステップずつ提示し、結果を確認してから次に進む**。依頼した作業（コミット、ファイル作成など）が実際に完了したかを確認せずに次の手順を出さない
- 話題が逸れた後に作業を再開するときは、中断した時点のステップが完了しているか確認する
- 既存ファイルを書き換える提案では、要約・言い換えで内容を落とさない。変更が必要な箇所だけを最小限に変える
- ファイルの有無やGitの状態は思い込まず、`ls`・`git status`・`git log`などで確認する
- ツールや製品の使い方は、記憶ではなく公式ドキュメントで前提条件を確認してから案内する

---

## Git運用

- ブランチ：`main`（壊さない）／`develop`（統合）／`feature/<NestJSのモジュール名>`（例：`feature/auth`）。機能実装は`feature/*`で行い、完了したら`develop`にマージ
- コミットメッセージ：`<種類>: <内容（日本語）>`。`feat`＝ユーザーから見える振る舞いが増える変更、`chore`＝雛形生成・パッケージ追加・設定など土台、ほかに`fix`・`docs`・`refactor`
- **メッセージは「ファイルとして残る差分」に基づいて書く**。DB操作や動作確認のみの作業はコミットに含めない。コミット前に`git status`で差分を確認する
- 1つの意味のある変更が終わったらすぐコミットする（溜めると分割できなくなる）
- `git add`はリポジトリ直下（`~/dev/procrastination-app`）で実行する（`backend/`内でパスを指定して失敗した経緯あり）
- コミット前に`git status`で、Git管理外にすべきファイル（`.env`など）が含まれていないことを確認する
- push：その日の作業終了時・ブランチ作成時（`git push -u origin <branch>`）・機能完成時。リモートはSSH（`git@github.com:yuuki-hyn/procrastination-app.git`、Public）
- `.env`は絶対にコミットしない（`.gitignore`で除外済み）

---

## 開発環境

- WSL2 上の Ubuntu 22.04。リポジトリ：`~/dev/procrastination-app`（Linux側に置くのは速度のため）
- Node.js v24（nvmで導入）、npm
- PostgreSQL 14（ローカルに直接インストール、Dockerは未使用）
  - 起動：`sudo service postgresql start`
  - DB：`procrastination_app`、ユーザー`postgres`（開発用パスワード）
  - スキーマ反映：`psql -h localhost -U postgres -d procrastination_app -f schema.sql`
- 起動コマンド
  - バックエンド：`cd backend && npm run start:dev`（http://localhost:3000）
  - フロントエンド：`cd frontend && npm run dev`（http://localhost:5173）

### ディレクトリ構成（現状）

```
procrastination-app/
├── CLAUDE.md           # 本ファイル（Claude Code用のプロジェクトルール）
├── README.md
├── .gitignore          # モノレポ用（先頭スラッシュなしでbackend/frontend両方に効く。frontend/.gitignoreも残している）
├── schema.sql
├── docs/               # 要件定義・API仕様・画面モックアップ
├── backend/            # NestJS
│   ├── .env            # Git管理外
│   └── src/
│       ├── main.ts             # cookie-parser、CORS、listen
│       ├── app.module.ts       # ConfigModule(+Joi)、APP_GUARD=AuthGuard
│       ├── database/database.module.ts   # @Global、PG_POOL
│       ├── auth/               # controller/service/module + auth.guard.ts + public.decorator.ts
│       └── users/  big-tasks/  sub-tasks/  home/   # 雛形のみ
└── frontend/           # Vite + React + TypeScript（雛形のみ、react-router-dom導入済み）
```

---

## 技術的な前提・注意点

### バックエンド（NestJS v12、ESM）

- `package.json`は`"type": "module"`。**importは実体が`.ts`でも`.js`拡張子を付ける**（例：`import { AuthGuard } from './auth/auth.guard.js'`）
- **CommonJS製パッケージは`import * as X`だと動かないことがある**。`X is not a function`が出たらデフォルトインポート（`import X from 'x'`）にする。`joi`・`cookie-parser`はデフォルトインポートで動作確認済み。`jsonwebtoken`・`bcrypt`も同様の可能性が高い
- 生SQL（`pg`）、ORMなし。Serviceでは`@Inject(PG_POOL) private readonly pool: Pool`で受け取り、`this.pool.query('... $1', [value])`とプレースホルダを使う
- `PG_POOL`は`src/database/database.module.ts`から`export`されている
- 環境変数は`ConfigService`経由で取得。Joiスキーマ：`DB_HOST`・`DB_PORT`(5432)・`DB_USER`・`DB_PASSWORD`・`DB_NAME`・`JWT_SECRET`・`PORT`(3000)。**新しい環境変数を追加したらJoiスキーマにも追加する**（未定義のキーはエラーにならず素通りするため）
- 認証：`AuthGuard`を`APP_GUARD`でグローバル適用。認証不要なハンドラには`@Public()`を付ける。現状の`AuthGuard`は「`@Public()`なら通す、それ以外は401」だけで、JWT検証は未実装（そのため`GET /`も現在401）
- 認可：他人のリソースは404で返す（`WHERE id = $1 AND user_id = $2`で該当なしなら404）
- JWTはhttpOnly Cookie＋SameSite属性で保持。レスポンスボディにトークンを含めない
- JSONはキャメルケース、DB列はスネークケース（変換して扱う）
- `bcrypt`はnpmのインストールスクリプト承認済み（`package.json`の`allowScripts`）
- Lint：oxlint、Formatter：Prettier（どちらもCLIデフォルトのまま）
- テスト：Vitest（`.spec.ts`は自動生成されたまま。現状テストは書いていない）

### フロントエンド（Vite + React + TS）

- 状態管理：`useState`/`useContext`のみ。サーバー通信は`fetch`を直接使う（axios・TanStack Queryは不採用）
- `fetch`では**必ず`credentials: 'include'`を付ける**（付け忘れるとCookieが送られず認証が通らない）。共通のfetch関数を`api/`に作って1か所にまとめる予定
- ルーティング：React Router
- 構成：`src/pages/`（5画面）、`src/components/`（`MainLayout`・`BottomNavBar`・各モーダルなど）、`src/api/`（`authApi.ts`・`bigTasksApi.ts`・`subTasksApi.ts`・`homeApi.ts`）
- 画面下部固定のタブバー（ホーム／大タスク一覧）を`MainLayout`で実装。ログイン・新規登録画面は対象外
- モーダル（大タスク作成・小タスク作成・小タスク詳細）は画面ではなくコンポーネント。**小タスク詳細はホームからも開き、開いた画面の上に重ねて表示する**（`mockup.html`は簡易実装のため常に小タスク一覧を背景にしているが、実装はこちらが正）
- **ログイン・新規登録の成功後はホームへ遷移する**（確定済み）
- 完了記録はチェックのみで完結させる。実績時間は小タスク詳細の編集（`PATCH /sub-tasks/:id`）で記録する

---
