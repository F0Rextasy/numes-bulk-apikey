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

**Массовое создание аккаунтов numes.ai с автоматически сгенерированными API-ключами — инференс, совместимый с OpenAI (DeepSeek V4.1 Flash, GLM 5.3, Kimi K3.1, Nemotron 3 Ultra) + коннекторы 9Router / OmniRoute.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(browser%20only)-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)

[🛠 Быстрый старт](#-quick-start) · [🤖 Модели](#-models) · [🧪 Использование API](#-how-to-use-the-api) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Опции](#️-cli-options) · [🛰️ Прокси](#️-behind-a-proxy)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Что это

numes.ai — это шлюз, совместимый с OpenAI. Регистрация работает на **Keycloak** (`auth.numes.ai`),
защищена виджетом **Cloudflare Turnstile** и требует **подтверждения e-mail и
пароля**, прежде чем панель управления позволит создать ключ. Затем панель создаёт ключи
через собственный BFF с заголовком `X-Numes-CSRF`, значение которого **не** является случайным UUID — это
`csrfToken`, встроенный в отрендеренный сервером payload панели управления.

Этот CLI делает всё это за вас: почтовый ящик → регистрация в настоящем Chrome (флажок Turnstile
отмечается настоящей мышью) → ссылка подтверждения → пароль → панель управления → API-ключ,
и он записывает ключ только после того, как тот уже ответил на живой вызов чата.

## 🛠 Быстрый старт

```bash
npm install
npm start
```

Затем выберите **1) Mint keys** и введите, сколько аккаунтов/ключей вы хотите. Это весь процесс —
никаких запросов токенов, никаких запросов капчи.

```bash
npm run mint -- --count 5          # то же самое без меню
```

Ключи сохраняются в `keys.txt`, по одному в строке. Данные аккаунта (e-mail, последние четыре символа ключа)
сохраняются в `accounts.jsonl`.

CLI сам создаёт **читаемый почтовый ящик** (mail.tm / mail.gw, чтение по HTTP), поэтому
свежий checkout не требует никакого аккаунта: достаточно `npm install && npm start`.

Если вы создаёте ключи в большом объёме, один раз поместите бесплатный API-токен [Mailtrap](https://mailtrap.io) в `mailtrap.txt`
— настоящий хост входящей почты убережёт запуск от отказов по одноразовым доменам:
```bash
echo "YOUR_MAILTRAP_TOKEN" > mailtrap.txt
```

Без него CLI продолжает автоматически использовать публичные сервисы (проверено от начала до конца: адрес mail.tm
регистрируется, получает ссылку и выдаёт рабочий ключ).

## 🤖 Модели

Эндпоинт перечисляет ~155 идентификаторов моделей. Аккаунт с нулевым балансом (бесплатный) отвечает на этом наборе:

| Идентификатор модели | Примечания |
| --- | --- |
| `deepseek/deepseek-v4.1-flash` | модель по умолчанию для проверки |
| `dealignai/deepseek-v4.1-flash-uncensored-fp8` | DeepSeek V4.1 Flash, нецензурированная сборка |
| `dealignai/glm-5.3-flash-uncensored-fp8` | GLM 5.3 Flash, нецензурированная сборка |
| `dealignai/glm-5.3-uncensored-fp8` | GLM 5.3, нецензурированная сборка |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra |
| `moonshotai/kimi-k3.1-pro` | Kimi K3.1 Pro |
| `uniboshi/kimi-k3-abliterated-v1` | Kimi K3 abliterated |
| `z-ai/glm-5.3-flash` | GLM 5.3 Flash |
| `z-ai/glm-5.3` | GLM 5.3 |

Все остальные идентификаторы отвечают `402 insufficient credits` на аккаунте с нулевым балансом — это
баланс аккаунта, а не сломанный ключ.

## 🧪 Использование API

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

Рассуждающие модели на этом шлюзе могут помещать ответ в `reasoning_content` вместо
`content`; читайте оба поля (или отправляйте `max_tokens >= 128`).

## ✅ Проверки качества

- Ключ записывается **только после** живого `chat-200` **и** проверки осмысленности содержимого: два
  разных запроса должны вернуть непустые и **разные** ответы.
- Ключи, не прошедшие проверку, попадают в `keys-dead.txt`, но никогда в `keys.txt`.
- `npm run mint -- --verify` повторно проверяет каждый ключ, находящийся сейчас в `keys.txt`, той же проверкой.

## 🧭 Как это работает

1. **Почтовый ящик** — inbox mail.tm / mail.gw или Mailtrap, когда настроен токен.
2. **Регистрация** — `https://numes.ai/auth/login` → страница регистрации Keycloak. CLI вводит
   адрес, отмечает флажок Turnstile в настоящем Chrome (puppeteer-core + уже установленный у вас Chrome)
   и отправляет форму.
3. **Подтверждение** — CLI опрашивает inbox, открывает ссылку, заполняет форму пароля.
4. **Панель управления** — после появления cookie сессии CLI читает id аккаунта и
   `csrfToken` из payload панели управления и вызывает
   `POST /api/bff/app/v1/accounts/<id>/keys` точно так же, как это делает страница.
5. **Проверка** — живой вызов чата, затем ключ сохраняется.

Ничего не подделывается: браузер — это ваш собственный Chrome в вашей собственной сети.

## 🔌 Подключение к 9Router

```bash
npm run 9router
# или
node src/connect-9router.js --base http://localhost:20128 --password 123456
```

Он регистрирует один узел провайдера `openai-compatible` с префиксом `numes` и одно подключение на
каждый ключ в `keys.txt` (имена выводятся из хеша ключа, поэтому повторные запуски идемпотентны). Затем модели
доступны как `numes/<model-id>`.

## 🔌 Подключение к OmniRoute

```bash
npm run omniroute
# или
node src/connect-omniroute.js --base http://localhost:20128 --password 123456
```

Та же идея, тот же префикс, на экземпляре OmniRoute.

## ⚙️ Опции CLI

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

## 🛰️ За прокси

Прокси **необязателен** — без `--pool` всё работает напрямую.

Со списком каждый аккаунт привязан к одному выходу на весь срок жизни аккаунта (регистрация, почта,
панель управления, создание ключа и живая проверка), потому что ключ, созданный с одного адреса, должен быть
подтверждён с того же самого:

```bash
node src/cli.js --auto --count 20 --pool proxies.txt --strict-proxy
```

`proxies.txt` принимает `http://host:port`, `http://user:pass@host:port`,
`socks5://host:port` и `socks5://user:pass@host:port`, по одному в строке.

## ⚠️ Риски для аккаунтов и как их минимизировать

Никакая автоматизация не свободна от рисков: панель может ограничивать частоту, отказывать в одноразовых почтовых доменах или закрывать
аккаунты. Снижение этого риска — вопрос поведения, а не кода:

- один аккаунт = один ключ, и один выход на аккаунт (никогда не создавайте много аккаунтов с одного IP одновременно);
- соблюдайте темп (десятки в час, а не сотни) и давайте аккаунтам выглядеть используемыми — CLI уже ждёт
  между аккаунтами и делает настоящий вызов чата перед сохранением ключа;
- настоящий почтовый хост (Mailtrap) надёжнее публичной временной почты при больших объёмах;
- не вовлекайте в это свои собственные аккаунты.

Запускайте только против аккаунтов, которыми вы владеете, и соблюдайте условия провайдера.

## 🐞 Проблемы

Откройте issue с точной командой, выводом консоли (замаскируйте ключи) и указанием, был ли задействован прокси.

## 📄 Лицензия

MIT — см. [LICENSE](LICENSE).