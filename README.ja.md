<div align="center">

```
███╗   ██╗██╗   ██╗███╗   ███╗███████╗███████╗
████╗  ██║██║   ██║████╗ ████║██╔════╝██╔════╝
██╔██╗ ██║██║   ██║██╔████╔██║█████╗  ███████╗
██║╚██╗██║██║   ██║██║╚██╔╝██║██╔══╝  ╚════██║
██║ ╚████║╚██████╔╝██║ ╚═╝ ██║███████╗███████║
╚═╝  ╚═══╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝╚══════╝
```

# numes-bulk-apikey

**numes.ai アカウントを API キー自動生成付きで一括作成 — OpenAI 互換推論 (DeepSeek V4.1 Flash、GLM 5.3、Kimi K3.1、Nemotron 3 Ultra) + 9Router / OmniRoute コネクタ。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(browser%20only)-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)

[🛠 クイックスタート](#-quick-start) · [🤖 モデル](#-models) · [🧪 API の使い方](#-how-to-use-the-api) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ これは何か

numes.ai は OpenAI 互換のゲートウェイです。サインアップは **Keycloak** (`auth.numes.ai`) 上で動作し、
**Cloudflare Turnstile** ウィジェットで保護されており、ダッシュボードでキーを作成できるようになる前に
**メール認証とパスワード**が必要です。その後ダッシュボードは独自の BFF を通じてキーを作成しますが、
その際の `X-Numes-CSRF` ヘッダーの値は**ランダムな UUID ではありませ**ん — サーバー側でレンダリングされた
ダッシュボードのペイロードに埋め込まれた `csrfToken` です。

この CLI はそのすべてを代行します: メールボックス → 実際の Chrome での登録 (Turnstile のチェックボックスは
実際のマウスでクリック) → 認証リンク → パスワード → ダッシュボード → API キー、そして実際のチャット呼び出しに
応答できたキーのみを書き出します。

## 🛠 クイックスタート

```bash
npm install
npm start
```

次に **1) Mint keys** を選び、作成するアカウント/キーの数を入力します。これがフロー全体です —
トークンの入力もキャプチャの入力もありません。

```bash
npm run mint -- --count 5          # メニューを使わずに同じことを実行
```

キーは `keys.txt` に 1 行ずつ書き出されます。アカウントデータ (メールアドレス、キーの末尾 4 文字) は
`accounts.jsonl` に書き出されます。

CLI は**それ自体で読み取り可能なメールボックスを作成します** (mail.tm / mail.gw を HTTP 経由で読み取り) ので、
新しくチェックアウトした状態でもどこにもアカウントは不要です: `npm install && npm start` だけで十分です。

大量に作成する場合は、無料の [Mailtrap](https://mailtrap.io) API トークンを一度 `mailtrap.txt` に入れておいてください —
実際の受信メールホストを使うことで、使い捨てドメインの拒否を回避できます:
```bash
echo "YOUR_MAILTRAP_TOKEN" > mailtrap.txt
```

これがなくても、CLI は自動的に公開の経路を使い続けます (エンドツーエンドで検証済み: mail.tm のアドレスが
登録され、リンクを受信し、有効なキーを生成します)。

## 🤖 モデル

エンドポイントは約 155 個のモデル ID をリストします。残高ゼロ (無料) のアカウントで応答するのは次のセットです:

| モデル ID | 備考 |
| --- | --- |
| `deepseek/deepseek-v4.1-flash` | デフォルトのゲートモデル |
| `dealignai/deepseek-v4.1-flash-uncensored-fp8` | DeepSeek V4.1 Flash、無検閲ビルド |
| `dealignai/glm-5.3-flash-uncensored-fp8` | GLM 5.3 Flash、無検閲ビルド |
| `dealignai/glm-5.3-uncensored-fp8` | GLM 5.3、無検閲ビルド |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra |
| `moonshotai/kimi-k3.1-pro` | Kimi K3.1 Pro |
| `uniboshi/kimi-k3-abliterated-v1` | Kimi K3 abliterated |
| `z-ai/glm-5.3-flash` | GLM 5.3 Flash |
| `z-ai/glm-5.3` | GLM 5.3 |

その他のすべての ID は残高ゼロのアカウントでは `402 insufficient credits` を返します — これは
アカウントの残高の問題であり、キーの破損ではありません。

## 🧪 API の使い方

```bash
curl https://api.numes.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $NUMES_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek/deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}]}'
```

```python
from openai import OpenAI

client = OpenAI(base_url="https://api.numes.ai/api/v1", api_key="YOUR_KEY")
print(client.chat.completions.create(
    model="deepseek/deepseek-v4.1-flash",
    messages=[{"role": "user", "content": "hi"}],
).choices[0].message.content)
```

```javascript
import OpenAI from 'openai';

const client = new OpenAI({ baseURL: 'https://api.numes.ai/api/v1', apiKey: process.env.NUMES_KEY });
const r = await client.chat.completions.create({
  model: 'deepseek/deepseek-v4.1-flash',
  messages: [{ role: 'user', content: 'hi' }],
});
console.log(r.choices[0].message.content);
```

このゲートウェイの推論モデルは、回答を `content` ではなく `reasoning_content` に入れることがあります。
両方のフィールドを読むか (または `max_tokens >= 128` を送信してください)。

## ✅ 品質ゲート

- キーは、実際の `chat-200` **および**コンテンツの妥当性チェック (2 つの異なるプロンプトが空でなく、
  **異なる**回答を返すこと) を通過した**後にのみ**書き出されます。
- 失敗したキーは `keys-dead.txt` に送られ、`keys.txt` には決して入りません。
- `npm run mint -- --verify` は `keys.txt` 内のすべてのキーを同じゲートで再チェックします。

## 🧭 仕組み

1. **メールボックス** — mail.tm / mail.gw の受信箱、またはトークンが設定されている場合は Mailtrap。
2. **登録** — `https://numes.ai/auth/login` → Keycloak の登録ページ。CLI がアドレスを入力し、
   実際の Chrome (puppeteer-core + 既にお持ちの Chrome) で Turnstile のチェックボックスをクリックし、
   送信します。
3. **認証** — CLI が受信箱をポーリングし、リンクを開き、パスワードフォームに入力します。
4. **ダッシュボード** — セッション Cookie が存在した後、CLI はダッシュボードのペイロードからアカウント ID と
   `csrfToken` を読み取り、ページとまったく同じように
   `POST /api/bff/app/v1/accounts/<id>/keys` を呼び出します。
5. **ゲート** — 実際のチャット呼び出しを行い、その後キーを保存します。

何も偽装されていません: ブラウザはあなた自身のネットワーク上の、あなた自身の Chrome です。

## 🔌 9Router への接続

```bash
npm run 9router
# または
node src/connect-9router.js --base http://localhost:20128 --password 123456
```

プレフィックス `numes` を持つ 1 つの `openai-compatible` プロバイダーノードと、`keys.txt` 内の各キーに対する
1 つの接続を登録します (名前はキーのハッシュから導出されるため、再実行しても冪等です)。モデルは
`numes/<model-id>` として利用可能になります。

## 🔌 OmniRoute への接続

```bash
npm run omniroute
# または
node src/connect-omniroute.js --base http://localhost:20128 --password 123456
```

同じ考え方、同じプレフィックスで、OmniRoute インスタンス上で実行します。

## ⚙️ CLI オプション

```
--auto              質問なしで実行 (ランチャーがこれを使用)
--count N           アカウント/キーの数 (デフォルト 10)
--pool <file>       プロキシリスト、1 行に 1 つ: http://host:port, socks5://user:pass@host:port
--strict-proxy      プロキシが落ちたときに直接接続へフォールバックせず失敗する
--headless          Chrome をヘッドレスで実行 (Turnstile は通常拒否します。ヘッド付きがデフォルト)
--mailtrap-token K  Mailtrap API トークン (任意; または MAILTRAP_TOKEN、または mailtrap.txt)
--verify            keys.txt 内のすべてのキーを実際のチャット呼び出しで再チェック
--dry               プランを表示して終了
```

## 🛰️ プロキシ経由

プロキシは**任意**です — `--pool` がなければすべて直接接続で実行されます。

リストを指定した場合、各アカウントはアカウント全体 (登録、メール、ダッシュボード、キー作成、実際のゲート) に
わたって 1 つの出口に固定されます。あるアドレスから作成されたキーは、同じアドレスから証明されなければ
ならないからです:

```bash
node src/cli.js --auto --count 20 --pool proxies.txt --strict-proxy
```

`proxies.txt` は `http://host:port`、`http://user:pass@host:port`、
`socks5://host:port`、`socks5://user:pass@host:port` を 1 行に 1 つずつ受け付けます。

## ⚠️ アカウントのリスクとその最小化方法

自動化にリスクがないものはありません: パネルはレート制限したり、使い捨てメールドメインを拒否したり、
アカウントを閉鎖したりする可能性があります。そのリスクを低く保つのはコードの問題ではなく、振る舞いの問題です:

- 1 アカウント = 1 キー、そして 1 アカウントにつき 1 つの出口 (1 つの IP から同時に多数のアカウントを作らないこと);
- 実行のペースを調整する (数百ではなく毎時数十程度) とともに、アカウントが使用されているように見せる — CLI は
  すでにアカウント間で待機し、キーを保存する前に実際のチャット呼び出しを行います;
- 実際のメールホスト (Mailtrap) は、大量処理時に公開の一時メールよりも信頼性が高いです;
- 自分のアカウントをこれに含めないでください。

自分が所有するアカウントに対してのみ実行し、プロバイダーの利用規約を尊重してください。

## 🐞 問題報告

正確なコマンド、コンソール出力 (キーはマスクしてください)、およびプロキシが関与していたかどうかを添えて
issue を作成してください。

## 📄 ライセンス

MIT — [LICENSE](LICENSE) を参照してください。