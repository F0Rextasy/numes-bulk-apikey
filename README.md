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

**Bulk-create numes.ai accounts with auto-generated API keys — OpenAI-compatible inference (DeepSeek V4.1 Flash, GLM 5.3, Kimi K3.1, Nemotron 3 Ultra) + 9Router / OmniRoute connectors.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(browser%20only)-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)

[🛠 Quick start](#-quick-start) · [🤖 Models](#-models) · [🧪 Use the API](#-how-to-use-the-api) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ What this is

numes.ai is an OpenAI-compatible gateway. Sign-up runs on **Keycloak** (`auth.numes.ai`),
is protected by a **Cloudflare Turnstile** widget, and needs **e-mail verification plus a
password** before the dashboard lets you create a key. The dashboard then creates keys
through its own BFF with a `X-Numes-CSRF` header whose value is **not** a random UUID — it is
the `csrfToken` embedded in the server-rendered dashboard payload.

This CLI does all of that for you: mailbox → registration in a real Chrome (the Turnstile
checkbox is clicked with a real mouse) → verification link → password → dashboard → API key,
and it only writes a key that has already answered a live chat call.

## 🛠 Quick start

```bash
npm install
npm start
```

Then pick **1) Mint keys** and type how many accounts/keys you want. That is the whole flow —
no token prompts, no captcha prompts.

```bash
npm run mint -- --count 5          # same thing without the menu
```

Keys land in `keys.txt`, one per line. Account data (e-mail, last four characters of the key)
lands in `accounts.jsonl`.

The CLI creates a **readable mailbox by itself** (mail.tm / mail.gw, read over HTTP), so a
fresh checkout needs no account anywhere: `npm install && npm start` is enough.

If you mint at volume, put a free [Mailtrap](https://mailtrap.io) API token in `mailtrap.txt`
once — a real inbound-mail host keeps the run away from disposable-domain refusals:
```bash
echo "YOUR_MAILTRAP_TOKEN" > mailtrap.txt
```

Without it the CLI keeps using the public rails automatically (verified end to end: a mail.tm
address registers, receives the link and yields a live key).

## 🤖 Models

The endpoint lists ~155 model ids. A zero-balance (free) account answers on this set:

| Model id | Notes |
| --- | --- |
| `deepseek/deepseek-v4.1-flash` | the default gate model |
| `dealignai/deepseek-v4.1-flash-uncensored-fp8` | DeepSeek V4.1 Flash, uncensored build |
| `dealignai/glm-5.3-flash-uncensored-fp8` | GLM 5.3 Flash, uncensored build |
| `dealignai/glm-5.3-uncensored-fp8` | GLM 5.3, uncensored build |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra |
| `moonshotai/kimi-k3.1-pro` | Kimi K3.1 Pro |
| `uniboshi/kimi-k3-abliterated-v1` | Kimi K3 abliterated |
| `z-ai/glm-5.3-flash` | GLM 5.3 Flash |
| `z-ai/glm-5.3` | GLM 5.3 |

Every other id answers `402 insufficient credits` on a zero-balance account — that is the
account balance, not a broken key.

## 🧪 How to use the API

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

Reasoning models on this gateway can put the answer in `reasoning_content` instead of
`content`; read both fields (or send `max_tokens >= 128`).

## ✅ Quality gates

- A key is written **only after** a live `chat-200` **and** a content sanity check: two
  different prompts must return non-empty and **different** answers.
- Keys that fail die into `keys-dead.txt`, never into `keys.txt`.
- `npm run mint -- --verify` re-checks every key currently in `keys.txt` with the same gate.

## 🧭 How it works

1. **Mailbox** — mail.tm / mail.gw inbox, or Mailtrap when a token is configured.
2. **Registration** — `https://numes.ai/auth/login` → Keycloak registration page. The CLI types
   the address, clicks the Turnstile checkbox in a real Chrome (puppeteer-core + the Chrome
   you already have), and submits.
3. **Verification** — the CLI polls the inbox, opens the link, fills the password form.
4. **Dashboard** — after the session cookie exists, the CLI reads the account id and the
   `csrfToken` from the dashboard payload and calls
   `POST /api/bff/app/v1/accounts/<id>/keys` exactly like the page does.
5. **Gate** — live chat call, then the key is saved.

Nothing is spoofed: the browser is your own Chrome on your own network.

## 🔌 Connect to 9Router

```bash
npm run 9router
# or
node src/connect-9router.js --base http://localhost:20128 --password 123456
```

It registers one `openai-compatible` provider node with prefix `numes` and one connection per
key in `keys.txt` (names derived from the key hash, so re-runs are idempotent). Models are then
available as `numes/<model-id>`.

## 🔌 Connect to OmniRoute

```bash
npm run omniroute
# or
node src/connect-omniroute.js --base http://localhost:20128 --password 123456
```

Same idea, same prefix, on an OmniRoute instance.

## ⚙️ CLI options

```
--auto              run without questions (the launcher uses this)
--count N           how many accounts/keys (default 10)
--pool <file>       proxy list, one per line: http://host:port, socks5://user:pass@host:port
--strict-proxy      fail instead of falling back to direct when a proxy dies
--headless          run Chrome headless (Turnstile usually refuses; headed is the default)
--mailtrap-token K  Mailtrap API token (optional; or MAILTRAP_TOKEN, or mailtrap.txt)
--verify            re-check every key in keys.txt with a live chat call
--dry               print the plan and exit
```

## 🛰️ Behind a proxy

Proxy is **optional** — without `--pool` everything runs direct.

With a list, each account is pinned to one exit for the whole account (registration, mail,
dashboard, key creation and the live gate), because a key created from one address must be
proven from the same one:

```bash
node src/cli.js --auto --count 20 --pool proxies.txt --strict-proxy
```

`proxies.txt` accepts `http://host:port`, `http://user:pass@host:port`,
`socks5://host:port` and `socks5://user:pass@host:port`, one per line.

## ⚠️ Account risk & how to minimise it

No automation is risk-free: the panel can rate-limit, refuse disposable mail domains or close
accounts. Keeping that risk low is a behaviour question, not a code question:

- one account = one key, and one exit per account (never many accounts from one IP at once);
- pace the run (tens per hour, not hundreds) and let accounts look used — the CLI already waits
  between accounts and makes a real chat call before saving a key;
- a real mailbox host (Mailtrap) is more reliable than public temp-mail at volume;
- keep your own accounts out of it.

Run only against accounts you own and respect the provider's terms.

## 🐞 Issues

Open an issue with the exact command, the console output (mask the keys) and whether a proxy
was involved.

## 📄 License

MIT — see [LICENSE](LICENSE).
