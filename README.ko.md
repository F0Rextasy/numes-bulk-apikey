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

**자동 생성된 API 키로 numes.ai 계정을 대량 생성 — OpenAI 호환 추론 (DeepSeek V4.1 Flash, GLM 5.3, Kimi K3.1, Nemotron 3 Ultra) + 9Router / OmniRoute 커넥터.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(browser%20only)-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)

[🛠 빠른 시작](#-quick-start) · [🤖 모델](#-models) · [🧪 API 사용하기](#-how-to-use-the-api) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ 옵션](#️-cli-options) · [🛰️ 프록시](#️-behind-a-proxy)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 이것은 무엇인가

numes.ai는 OpenAI 호환 게이트웨이입니다. 가입은 **Keycloak**(`auth.numes.ai`)에서 진행되며,
**Cloudflare Turnstile** 위젯으로 보호되고, 대시보드에서 키를 생성할 수 있으려면 **이메일 인증과
비밀번호**가 필요합니다. 그런 다음 대시보드는 자체 BFF를 통해 `X-Numes-CSRF` 헤더로 키를 생성하는데,
그 값은 **무작위 UUID가 아니라** 서버에서 렌더링된 대시보드 페이로드에 포함된 `csrfToken`입니다.

이 CLI는 그 모든 과정을 대신 처리합니다: 메일함 → 실제 Chrome에서의 등록 (Turnstile 체크박스는
실제 마우스로 클릭) → 인증 링크 → 비밀번호 → 대시보드 → API 키, 그리고 실제 채팅 호출에 이미
응답한 키만 기록합니다.

## 🛠 빠른 시작

```bash
npm install
npm start
```

그런 다음 **1) Mint keys**를 선택하고 생성할 계정/키 수를 입력하세요. 이게 전부입니다 —
토큰 입력도, 캡차 입력도 없습니다.

```bash
npm run mint -- --count 5          # 메뉴 없이 동일하게 실행
```

키는 `keys.txt`에 한 줄에 하나씩 저장됩니다. 계정 데이터(이메일, 키의 마지막 네 글자)는
`accounts.jsonl`에 저장됩니다.

CLI는 **스스로 읽을 수 있는 메일함을 생성**하므로(mail.tm / mail.gw, HTTP로 읽음), 새로 체크아웃한
상태에서도 어디에도 계정이 필요 없습니다: `npm install && npm start`만으로 충분합니다.

대량으로 생성한다면 무료 [Mailtrap](https://mailtrap.io) API 토큰을 `mailtrap.txt`에 한 번 넣어
두세요 — 실제 인바운드 메일 호스트를 사용하면 일회용 도메인 거부를 피할 수 있습니다:
```bash
echo "YOUR_MAILTRAP_TOKEN" > mailtrap.txt
```

이것이 없으면 CLI는 자동으로 공용 경로를 계속 사용합니다(종단 간 검증 완료: mail.tm 주소가
등록되고, 링크를 수신하며, 실제 키를 생성함).

## 🤖 모델

엔드포인트는 약 155개의 모델 id를 나열합니다. 잔액이 0인(무료) 계정은 다음 세트에서 응답합니다:

| 모델 id | 비고 |
| --- | --- |
| `deepseek/deepseek-v4.1-flash` | 기본 게이트 모델 |
| `dealignai/deepseek-v4.1-flash-uncensored-fp8` | DeepSeek V4.1 Flash, 검열 해제 빌드 |
| `dealignai/glm-5.3-flash-uncensored-fp8` | GLM 5.3 Flash, 검열 해제 빌드 |
| `dealignai/glm-5.3-uncensored-fp8` | GLM 5.3, 검열 해제 빌드 |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra |
| `moonshotai/kimi-k3.1-pro` | Kimi K3.1 Pro |
| `uniboshi/kimi-k3-abliterated-v1` | Kimi K3 abliterated |
| `z-ai/glm-5.3-flash` | GLM 5.3 Flash |
| `z-ai/glm-5.3` | GLM 5.3 |

다른 모든 id는 잔액이 0인 계정에서 `402 insufficient credits`를 응답합니다 — 이는 키가
고장 난 것이 아니라 계정 잔액 문제입니다.

## 🧪 API 사용 방법

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

이 게이트웨이의 추론 모델은 답변을 `content` 대신 `reasoning_content`에 넣을 수 있습니다.
두 필드를 모두 읽으세요(또는 `max_tokens >= 128`을 보내세요).

## ✅ 품질 게이트

- 키는 실제 `chat-200` 응답 **그리고** 내용 정합성 검사를 **통과한 후에만** 기록됩니다: 서로
  다른 두 프롬프트가 비어 있지 않고 **서로 다른** 답변을 반환해야 합니다.
- 실패한 키는 `keys-dead.txt`로 이동하며, 절대 `keys.txt`에 들어가지 않습니다.
- `npm run mint -- --verify`는 현재 `keys.txt`에 있는 모든 키를 동일한 게이트로 다시 검사합니다.

## 🧭 작동 방식

1. **메일함** — mail.tm / mail.gw 받은편지함, 또는 토큰이 설정된 경우 Mailtrap.
2. **등록** — `https://numes.ai/auth/login` → Keycloak 등록 페이지. CLI가 주소를 입력하고,
   실제 Chrome(puppeteer-core + 이미 설치된 Chrome)에서 Turnstile 체크박스를 클릭한 뒤 제출합니다.
3. **인증** — CLI가 받은편지함을 폴링하고, 링크를 열고, 비밀번호 양식을 채웁니다.
4. **대시보드** — 세션 쿠키가 생성된 후, CLI가 대시보드 페이로드에서 계정 id와 `csrfToken`을
   읽고 페이지와 똑같이 `POST /api/bff/app/v1/accounts/<id>/keys`를 호출합니다.
5. **게이트** — 실제 채팅 호출 후 키가 저장됩니다.

아무것도 위조되지 않습니다: 브라우저는 사용자 자신의 네트워크에서 실행되는 사용자 자신의 Chrome입니다.

## 🔌 9Router에 연결

```bash
npm run 9router
# 또는
node src/connect-9router.js --base http://localhost:20128 --password 123456
```

접두사 `numes`를 가진 `openai-compatible` 제공자 노드 하나와 `keys.txt`의 각 키에 대한 연결
하나를 등록합니다(이름은 키 해시에서 파생되므로 재실행해도 멱등적입니다). 이후 모델은
`numes/<model-id>`로 사용할 수 있습니다.

## 🔌 OmniRoute에 연결

```bash
npm run omniroute
# 또는
node src/connect-omniroute.js --base http://localhost:20128 --password 123456
```

같은 방식, 같은 접두사이며, OmniRoute 인스턴스에서 동작합니다.

## ⚙️ CLI 옵션

```
--auto              질문 없이 실행 (런처가 사용)
--count N           계정/키 수 (기본값 10)
--pool <file>       프록시 목록, 한 줄에 하나: http://host:port, socks5://user:pass@host:port
--strict-proxy      프록시가 죽으면 직접 연결로 폴백하지 않고 실패
--headless          Chrome을 헤드리스로 실행 (Turnstile이 보통 거부함; 기본값은 헤디드)
--mailtrap-token K  Mailtrap API 토큰 (선택; 또는 MAILTRAP_TOKEN, 또는 mailtrap.txt)
--verify            keys.txt의 모든 키를 실제 채팅 호출로 다시 검사
--dry               계획을 출력하고 종료
```

## 🛰️ 프록시 뒤에서

프록시는 **선택 사항**입니다 — `--pool` 없이는 모든 것이 직접 연결로 실행됩니다.

목록을 사용하면 각 계정은 전체 계정 수명(등록, 메일, 대시보드, 키 생성 및 실제 게이트) 동안
하나의 출구에 고정됩니다. 한 주소에서 생성된 키는 같은 주소에서 증명되어야 하기 때문입니다:

```bash
node src/cli.js --auto --count 20 --pool proxies.txt --strict-proxy
```

`proxies.txt`는 `http://host:port`, `http://user:pass@host:port`,
`socks5://host:port`, `socks5://user:pass@host:port`를 한 줄에 하나씩 허용합니다.

## ⚠️ 계정 위험 및 최소화 방법

어떤 자동화도 위험이 없습니다: 패널은 속도 제한을 걸거나, 일회용 메일 도메인을 거부하거나,
계정을 폐쇄할 수 있습니다. 이 위험을 낮게 유지하는 것은 코드의 문제가 아니라 행동의 문제입니다:

- 계정 하나 = 키 하나, 그리고 계정당 출구 하나 (한 IP에서 동시에 여러 계정을 만들지 마세요);
- 실행 속도를 조절하세요 (수백 개가 아닌 시간당 수십 개) 그리고 계정이 사용된 것처럼 보이게
  하세요 — CLI는 이미 계정 사이에 대기하고 키를 저장하기 전에 실제 채팅 호출을 수행합니다;
- 대량 작업에서는 실제 메일 호스트(Mailtrap)가 공용 임시 메일보다 안정적입니다;
- 자신의 계정은 여기에 포함하지 마세요.

자신이 소유한 계정에 대해서만 실행하고 제공자의 약관을 준수하세요.

## 🐞 이슈

정확한 명령, 콘솔 출력(키는 마스킹) 및 프록시가 관련되었는지 여부를 포함하여 이슈를
열어주세요.

## 📄 라이선스

MIT — [LICENSE](LICENSE)를 참조하세요.