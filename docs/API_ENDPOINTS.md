# APIエンドポイント一覧

これまでのAPI設計で確定した内容をまとめる。認証はJWTをhttpOnly Cookie（SameSite属性つき）で保持する方式のため、ログイン系エンドポイント以外は基本的にCookie経由で認証情報を受け取る前提。

## エンドポイント一覧（概要）

| リソース | メソッド | URL | 内容 | 成功時ステータス |
|---|---|---|---|---|
| ユーザー | POST | `/auth/signup` | アカウント作成 | 201 |
| ユーザー | POST | `/auth/login` | ログイン（Cookie発行） | 200 |
| ユーザー | POST | `/auth/logout` | ログアウト（Cookie無効化） | 204 |
| ユーザー | PATCH | `/users/me/password` | パスワード変更 | 204 |
| 大タスク | POST | `/big-tasks` | 大タスク登録 | 201 |
| 大タスク | GET | `/big-tasks?date=today\|tomorrow` | 大タスク一覧取得 | 200 |
| 大タスク | PATCH | `/big-tasks/:id` | 大タスク編集 | 200 |
| 大タスク | PATCH | `/big-tasks/:id/activate` | 着手中に設定 | 200 |
| 大タスク | DELETE | `/big-tasks/:id` | 大タスク削除（配下の小タスクも連鎖削除） | 204 |
| 小タスク | POST | `/big-tasks/:id/sub-tasks` | 小タスク登録 | 201 |
| 小タスク | GET | `/big-tasks/:id/sub-tasks` | 小タスク一覧取得 | 200 |
| 小タスク | PATCH | `/sub-tasks/:id` | 小タスク編集（5属性） | 200 |
| 小タスク | PATCH | `/sub-tasks/:id/move-up` | 1つ上に並び替え | 204 |
| 小タスク | PATCH | `/sub-tasks/:id/move-down` | 1つ下に並び替え | 204 |
| 小タスク | PATCH | `/sub-tasks/:id/complete` | 完了記録 | 200 |
| 小タスク | DELETE | `/sub-tasks/:id` | 小タスク削除 | 204 |
| ホーム | GET | `/home` | 着手中の大タスクに紐づく未完了小タスク先頭2件 | 200 |

## 共通仕様

### ステータスコードの使い分け

- 新規作成（POST）→ `201 Created`
- 取得（GET）、内容を返す更新（PATCH）→ `200 OK`
- 内容を返さない更新・削除（PATCH／DELETE）→ `204 No Content`

### エラーレスポンス

NestJS標準のフォーマットをそのまま採用する。

```json
{
  "statusCode": 400,
  "message": "エラーメッセージ",
  "error": "Bad Request"
}
```

`class-validator`によるバリデーションエラーも、NestJSがこの形式で自動的に返す。独自のエラーフォーマットは設計しない。

### 認可：他人のリソースへのアクセスは404で統一

大タスク・小タスクの取得・更新・削除で、対象がログイン中のユーザー以外のものだった場合、`403 Forbidden`ではなく`404 Not Found`を返す。`403`は「リソースは存在するが権限がない」ことを意味してしまい、IDを総当たりされた際に他人のデータの存在を推測されるリスクがある。本アプリはタスクの共有機能を持たない個人利用前提のため、「自分のものでなければ存在しないのと同じ」として扱う。実装上は、SQLで`WHERE big_task_id = ? AND user_id = ?`のように対象のIDとログイン中のuser_idを同時に条件に含め、該当なしなら404とする。

---

## 大タスク

### 大タスク登録

```
POST /big-tasks
```

リクエスト
```json
{
  "taskName": "値",
  "taskDate": "値"
}
```

レスポンス
```json
{
  "bigTaskId": "値",
  "taskName": "値",
  "taskDate": "値",
  "isActive": false
}
```

`taskDate`はユーザーが手入力するわけではないが、「今日タブ／明日タブどちらから登録したか」というフロント側の状態に依存するため、フロントが自動設定した上でリクエストに含める。`userId`は認証Cookieから特定するためリクエスト・レスポンスどちらにも含めない。サーバー側で`taskDate`が今日または翌日の範囲内かのバリデーションを行う。

### 大タスク一覧取得

```
GET /big-tasks?date=today
```

リクエスト：ボディなし（クエリパラメータ`date`で絞り込み）

レスポンス
```json
[
  {
    "bigTaskId": "値",
    "taskName": "値",
    "taskDate": "値",
    "isActive": "値"
  }
]
```

一覧なので配列で返す。日付による絞り込みはURLの階層ではなくクエリパラメータで表現する（「日付」は独立エンティティではなく大タスクの1属性のため）。

### 大タスク編集

```
PATCH /big-tasks/:id
```

リクエスト
```json
{
  "taskName": "値"
}
```

レスポンス
```json
{
  "bigTaskId": "値",
  "taskName": "値",
  "taskDate": "値",
  "isActive": "値"
}
```

編集可能な属性は`taskName`のみ。`taskDate`は変更不可（変えたい場合は削除して登録し直す）、`isActive`は専用の`/activate`エンドポイントで扱うため、通常編集には含めない。

### 着手中に設定

```
PATCH /big-tasks/:id/activate
```

リクエスト：ボディなし

レスポンス
```json
{
  "bigTaskId": "urlに含まれているid",
  "taskName": "値",
  "taskDate": "値",
  "isActive": true
}
```

単一オブジェクトで返す。「もともと着手中だった大タスク」の情報は、フロントがすでに持っている一覧データから導き出せるため、サーバーが重ねて返す必要はない。DBの部分ユニークインデックスにより、同時に着手中にできる大タスクは1ユーザーにつき1つに保証されている。

### 大タスク削除

```
DELETE /big-tasks/:id
```

リクエスト：ボディなし

レスポンス：ボディなし（`204 No Content`）

`ON DELETE CASCADE`により、配下の小タスクも自動的に削除される。着手中の大タスクを削除した場合、`GET /home`は空のレスポンスを返し、ホーム画面は「着手中のタスクがありません」といった案内を表示する。

---

## 小タスク

### 小タスク登録

```
POST /big-tasks/:id/sub-tasks
```

リクエスト
```json
{
  "taskName": "値",
  "deadlineTime": "値",
  "starterTask": "値",
  "estimatedMinutes": "値"
}
```

レスポンス
```json
{
  "subTaskId": "値",
  "taskName": "値",
  "deadlineTime": "値",
  "sortOrder": "値",
  "starterTask": "値",
  "estimatedMinutes": "値",
  "actualMinutes": null,
  "isCompleted": false
}
```

`bigTaskId`はURLの`:id`からすでに分かるためレスポンスに含めない。`sortOrder`・`isCompleted`はサーバー側が自動で決定するためリクエストに含めない。

### 小タスク一覧取得

```
GET /big-tasks/:id/sub-tasks
```

リクエスト：ボディなし

レスポンス
```json
[
  {
    "subTaskId": "値",
    "taskName": "値",
    "deadlineTime": "値",
    "sortOrder": "値",
    "starterTask": "値",
    "estimatedMinutes": "値",
    "actualMinutes": "値",
    "isCompleted": "値"
  }
]
```

一覧なので配列で返す。`bigTaskId`はURLからすでに分かるため含めない。

### 小タスク編集

```
PATCH /sub-tasks/:id
```

リクエスト（編集可能な5属性）
```json
{
  "taskName": "値",
  "deadlineTime": "値",
  "starterTask": "値",
  "estimatedMinutes": "値",
  "actualMinutes": "値"
}
```

レスポンス
```json
{
  "subTaskId": "値",
  "taskName": "値",
  "deadlineTime": "値",
  "sortOrder": "値",
  "starterTask": "値",
  "estimatedMinutes": "値",
  "actualMinutes": "値",
  "isCompleted": "値"
}
```

### 完了記録

```
PATCH /sub-tasks/:id/complete
```

リクエスト：ボディなし

レスポンス
```json
{
  "subTaskId": "値",
  "taskName": "値",
  "deadlineTime": "値",
  "sortOrder": "値",
  "starterTask": "値",
  "estimatedMinutes": "値",
  "actualMinutes": "値",
  "isCompleted": true,
  "bigTaskId": "値"
}
```

完了操作は`isCompleted`を`true`にするだけのシンプルな操作とし、リクエストボディを持たない。実績時間（`actualMinutes`）の記録は`PATCH /sub-tasks/:id`（編集）に一本化し、完了操作とは分離する。これにより「完了記録はチェックだけで完結する軽い操作」という要件を、リクエスト形式の上でも徹底できる。このエンドポイントはホーム画面（`GET /home`）から呼ばれる想定で、ホーム画面のレスポンスと同様に`bigTaskId`を含める。

### 並び順の入れ替え

```
PATCH /sub-tasks/:id/move-up
PATCH /sub-tasks/:id/move-down
```

リクエスト：ボディなし（どちらに動かすかはURLが表す）

レスポンス：ボディなし（`204 No Content`）

`activate`・`complete`と同じく、意味を持った状態変化はURLの末尾に動詞を付けて表現する。方向をボディのパラメータで受け取る案（`PATCH /sub-tasks/:id/order`＋`{direction: "up"}`）も検討したが、方向ごとにエンドポイントを分けた方が条件分岐が不要になりシンプルに実装できるため、こちらを採用した。入れ替え後の状態は、フロントエンドがすでに保持している一覧データから計算できるため（隣接する2件の`sortOrder`を入れ替えるだけ）、レスポンスは`204 No Content`で十分とした。

### 小タスク削除

```
DELETE /sub-tasks/:id
```

リクエスト：ボディなし

レスポンス：ボディなし（`204 No Content`）

---

## ホーム

### ホーム画面表示

```
GET /home
```

リクエスト：ボディなし（着手中の大タスクはサーバー側が自動判定）

レスポンス
```json
[
  {
    "subTaskId": "値",
    "taskName": "値",
    "deadlineTime": "値",
    "sortOrder": "値",
    "starterTask": "値",
    "estimatedMinutes": "値",
    "actualMinutes": "値",
    "isCompleted": "値",
    "bigTaskId": "値"
  }
]
```

着手中の大タスクに紐づく未完了の小タスクのうち、並び順が早いものから2件を返す。着手中の大タスクが存在しない場合は空配列を返す。`bigTaskId`は、URLに含まれないためフロントが他に知る手段がなく、含める。

---

## 認証系

### アカウント作成

```
POST /auth/signup
```

リクエスト
```json
{
  "userName": "値",
  "email": "値",
  "password": "値"
}
```

レスポンス
```json
{
  "userId": "値",
  "userName": "値",
  "email": "値"
}
```

`password`はレスポンスに含めない（ハッシュ化済みでも返す情報として不要）。アカウント作成に成功した時点で、ログインと同様に`Set-Cookie`ヘッダーでJWTを発行し、自動的にログイン状態にする。ユーザーが登録後にもう一度ログイン操作を行う必要がなくなり、負担軽減という一貫した方針に合う。

### ログイン

```
POST /auth/login
```

リクエスト
```json
{
  "email": "値",
  "password": "値"
}
```

レスポンス
```json
{
  "userId": "値",
  "userName": "値",
  "email": "値"
}
```

JWTトークンはレスポンスボディに含めず、`Set-Cookie`ヘッダー（`httpOnly`・`SameSite`属性つき）で発行する。ボディには、フロントが表示に使う可能性のある最低限のユーザー情報のみを含める。

### ログアウト

```
POST /auth/logout
```

リクエスト：ボディなし

レスポンス：ボディなし（`204 No Content`）

サーバー側は無効化されたCookieを`Set-Cookie`で返し、ブラウザ側のCookieを実質的に削除する。

### パスワード変更

```
PATCH /users/me/password
```

リクエスト
```json
{
  "currentPassword": "値",
  "newPassword": "値"
}
```

レスポンス：ボディなし（`204 No Content`）

`currentPassword`は必須。省略を許すと、ログイン済み端末を他人に操作された場合に本人確認なしでパスワードを変更されてしまうため、必ず現在のパスワードの再入力を求める。

---

## 設計上の共通ルール

- URLはリソース（モノ）を表し、階層構造（`/親/:id/子`）は実体として保存されているものの親子関係にのみ使う。日付のような属性はクエリパラメータで表現する
- リクエストには、サーバーが自力で決定できない項目（フロント側の状態や、ユーザーの入力）のみを含める。サーバー側で自動計算できる項目（`sortOrder`、`isCompleted`など）や、認証情報から取得できる項目（`userId`）は含めない
- レスポンスには、そのエンドポイントを呼ぶ文脈でフロントが他に知る手段がない項目だけを含める。URLからすでに分かる項目（`bigTaskId`など）は、必要な場合にのみ含める
- 一覧取得は配列、単一リソースの操作（登録・編集・着手中設定）は単一オブジェクトを返す
- 削除など、返す状態がない操作は`204 No Content`とする
- JSONのキーはキャメルケース、DBの列名はスネークケースとし、両者は変換して扱う
