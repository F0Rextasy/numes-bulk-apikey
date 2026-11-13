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

**批量创建 numes.ai 账户并自动生成 API 密钥 — 兼容 OpenAI 的推理服务（DeepSeek V4.1 Flash、GLM 5.3、Kimi K3.1、Nemotron 3 Ultra）+ 9Router / OmniRoute 连接器。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(browser%20only)-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)

[🛠 快速开始](#-quick-start) · [🤖 模型](#-models) · [🧪 使用 API](#-how-to-use-the-api) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ 选项](#️-cli-options) · [🛰️ 代理](#️-behind-a-proxy)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 这是什么

numes.ai 是一个兼容 OpenAI 的网关。注册流程运行在 **Keycloak**（`auth.numes.ai`）上，
受 **Cloudflare Turnstile** 组件保护，并且需要**邮箱验证加密码**，之后仪表盘才允许你创建密钥。随后仪表盘通过自己的 BFF 创建密钥，并携带一个 `X-Numes-CSRF` 请求头，其值**不是**随机 UUID —— 而是嵌入在服务端渲染的仪表盘载荷中的 `csrfToken`。

本 CLI 为你完成所有这些步骤：邮箱 → 在真实 Chrome 中注册（Turnstile 复选框用真实鼠标点击）→ 验证链接 → 密码 → 仪表盘 → API 密钥，并且只写入已经通过实时聊天调用验证的密钥。

## 🛠 快速开始

```bash
npm install
npm start
```

然后选择 **1) Mint keys** 并输入你想要多少个账户/密钥。这就是全部流程 ——
没有令牌提示，没有验证码提示。

```bash
npm run mint -- --count 5          # 与菜单操作相同，无需菜单
```

密钥写入 `keys.txt`，每行一个。账户数据（邮箱、密钥最后四个字符）
写入 `accounts.jsonl`。

CLI 会**自行创建一个可读邮箱**（mail.tm / mail.gw，通过 HTTP 读取），因此全新检出的代码无需任何账户：`npm install && npm start` 即可。

如果你要批量创建，请一次性将免费的 [Mailtrap](https://mailtrap.io) API 令牌放入 `mailtrap.txt` —— 真实的入站邮件主机可让运行避开一次性域名的拒绝：
```bash
echo "YOUR_MAILTRAP_TOKEN" > mailtrap.txt
```

没有它时，CLI 会自动继续使用公共渠道（已端到端验证：mail.tm 地址可注册、接收链接并生成可用密钥）。

## 🤖 模型

该端点列出约 155 个模型 ID。零余额（免费）账户可在以下集合上获得响应：

| 模型 ID | 备注 |
| --- | --- |
| `deepseek/deepseek-v4.1-flash` | 默认校验模型 |
| `dealignai/deepseek-v4.1-flash-uncensored-fp8` | DeepSeek V4.1 Flash，无审查版本 |
| `dealignai/glm-5.3-flash-uncensored-fp8` | GLM 5.3 Flash，无审查版本 |
| `dealignai/glm-5.3-uncensored-fp8` | GLM 5.3，无审查版本 |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra |
| `moonshotai/kimi-k3.1-pro` | Kimi K3.1 Pro |
| `uniboshi/kimi-k3-abliterated-v1` | Kimi K3 abliterated |
| `z-ai/glm-5.3-flash` | GLM 5.3 Flash |
| `z-ai/glm-5.3` | GLM 5.3 |

在零余额账户上，其他所有 ID 都会返回 `402 insufficient credits` —— 这是账户余额问题，不是密钥损坏。

## 🧪 如何使用 API

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

该网关上的推理模型可能会将答案放在 `reasoning_content` 而不是 `content` 中；请同时读取这两个字段（或发送 `max_tokens >= 128`）。

## ✅ 质量校验

- 只有在实时 `chat-200` **并且**内容合理性检查通过后才会写入密钥：两个不同的提示必须返回非空且**不同**的答案。
- 未通过校验的密钥会进入 `keys-dead.txt`，绝不会进入 `keys.txt`。
- `npm run mint -- --verify` 会用相同的校验重新检查 `keys.txt` 中当前的所有密钥。

## 🧭 工作原理

1. **邮箱** —— mail.tm / mail.gw 收件箱，或在配置了令牌时使用 Mailtrap。
2. **注册** —— `https://numes.ai/auth/login` → Keycloak 注册页面。CLI 输入地址，在真实 Chrome 中点击 Turnstile 复选框（puppeteer-core + 你已有的 Chrome），然后提交。
3. **验证** —— CLI 轮询收件箱，打开链接，填写密码表单。
4. **仪表盘** —— 会话 cookie 存在后，CLI 从仪表盘载荷中读取账户 ID 和 `csrfToken`，并完全像页面那样调用 `POST /api/bff/app/v1/accounts/<id>/keys`。
5. **校验** —— 实时聊天调用，然后保存密钥。

没有任何伪造：浏览器是你自己的 Chrome，运行在你自己的网络上。

## 🔌 连接到 9Router

```bash
npm run 9router
# 或
node src/connect-9router.js --base http://localhost:20128 --password 123456
```

它会注册一个前缀为 `numes` 的 `openai-compatible` 提供者节点，并为 `keys.txt` 中的每个密钥注册一个连接（名称由密钥哈希派生，因此重复运行是幂等的）。之后模型即可通过 `numes/<model-id>` 使用。

## 🔌 连接到 OmniRoute

```bash
npm run omniroute
# 或
node src/connect-omniroute.js --base http://localhost:20128 --password 123456
```

思路相同，前缀相同，运行在 OmniRoute 实例上。

## ⚙️ CLI 选项

```
--auto              无提问运行（启动器使用此选项）
--count N           账户/密钥数量（默认 10）
--pool <file>       代理列表，每行一个：http://host:port, socks5://user:pass@host:port
--strict-proxy      代理失效时直接失败，而不是回退到直连
--headless          以无头模式运行 Chrome（Turnstile 通常会拒绝；默认是有头模式）
--mailtrap-token K  Mailtrap API 令牌（可选；或 MAILTRAP_TOKEN，或 mailtrap.txt）
--verify            用实时聊天调用重新检查 keys.txt 中的每个密钥
--dry               打印计划并退出
```

## 🛰️ 在代理后面

代理是**可选的** —— 不使用 `--pool` 时一切直连。

使用列表时，每个账户在整个账户生命周期（注册、邮件、仪表盘、密钥创建和实时校验）都固定使用同一个出口，因为从一个地址创建的密钥必须从同一地址得到验证：

```bash
node src/cli.js --auto --count 20 --pool proxies.txt --strict-proxy
```

`proxies.txt` 接受 `http://host:port`、`http://user:pass@host:port`、
`socks5://host:port` 和 `socks5://user:pass@host:port`，每行一个。

## ⚠️ 账户风险及如何将其降到最低

任何自动化都不是零风险的：面板可能会限流、拒绝一次性邮件域名或关闭账户。保持低风险是行为问题，而不是代码问题：

- 一个账户 = 一个密钥，每个账户一个出口（绝不要同时从一个 IP 创建多个账户）；
- 控制运行节奏（每小时几十个，而不是几百个），让账户看起来像在被使用 —— CLI 已经在账户之间等待，并在保存密钥前进行真实的聊天调用；
- 在批量场景下，真实邮件主机（Mailtrap）比公共临时邮箱更可靠；
- 不要把你自己的账户牵扯进来。

仅对你拥有的账户运行，并遵守提供商的服务条款。

## 🐞 问题反馈

提交 issue 时请附上确切的命令、控制台输出（遮蔽密钥）以及是否涉及代理。

## 📄 许可证

MIT —— 参见 [LICENSE](LICENSE)。