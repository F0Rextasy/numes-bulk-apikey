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

**Massenhaft numes.ai-Konten mit automatisch generierten API-Schlüsseln erstellen — OpenAI-kompatible Inferenz (DeepSeek V4.1 Flash, GLM 5.3, Kimi K3.1, Nemotron 3 Ultra) + 9Router / OmniRoute-Connectoren.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(browser%20only)-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)

[🛠 Schnellstart](#-quick-start) · [🤖 Modelle](#-models) · [🧪 Die API verwenden](#-how-to-use-the-api) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Was das ist

numes.ai ist ein OpenAI-kompatibles Gateway. Die Registrierung läuft über **Keycloak** (`auth.numes.ai`),
ist durch ein **Cloudflare Turnstile**-Widget geschützt und erfordert eine **E-Mail-Verifizierung plus ein
Passwort**, bevor das Dashboard das Erstellen eines Schlüssels erlaubt. Das Dashboard erstellt Schlüssel
dann über sein eigenes BFF mit einem `X-Numes-CSRF`-Header, dessen Wert **keine** zufällige UUID ist — es ist
der `csrfToken`, der in der serverseitig gerenderten Dashboard-Nutzlast eingebettet ist.

Diese CLI erledigt all das für dich: Postfach → Registrierung in einem echten Chrome (das Turnstile-
Kontrollkästchen wird mit einer echten Maus angeklickt) → Verifizierungslink → Passwort → Dashboard → API-Schlüssel,
und sie schreibt nur einen Schlüssel, der bereits einen Live-Chat-Aufruf beantwortet hat.

## 🛠 Schnellstart

```bash
npm install
npm start
```

Wähle dann **1) Mint keys** und gib ein, wie viele Konten/Schlüssel du möchtest. Das ist der ganze Ablauf —
keine Token-Eingaben, keine Captcha-Eingaben.

```bash
npm run mint -- --count 5          # dasselbe ohne das Menü
```

Die Schlüssel landen in `keys.txt`, einer pro Zeile. Kontodaten (E-Mail, die letzten vier Zeichen des Schlüssels)
landen in `accounts.jsonl`.

Die CLI erstellt **von selbst ein lesbares Postfach** (mail.tm / mail.gw, gelesen über HTTP), sodass ein
frischer Checkout nirgendwo ein Konto benötigt: `npm install && npm start` reicht aus.

Wenn du in großem Umfang Schlüssel erstellst, hinterlege einmalig ein kostenloses [Mailtrap](https://mailtrap.io)-API-Token in `mailtrap.txt`
— ein echter Inbound-Mail-Host hält den Lauf von Ablehnungen wegen Wegwerf-Domains fern:
```bash
echo "YOUR_MAILTRAP_TOKEN" > mailtrap.txt
```

Ohne dieses Token verwendet die CLI automatisch weiterhin die öffentlichen Dienste (Ende-zu-Ende verifiziert: eine mail.tm-
Adresse registriert sich, empfängt den Link und liefert einen funktionierenden Schlüssel).

## 🤖 Modelle

Der Endpunkt listet ~155 Modell-IDs auf. Ein Konto mit Null-Guthaben (kostenlos) antwortet auf dieser Menge:

| Modell-ID | Hinweise |
| --- | --- |
| `deepseek/deepseek-v4.1-flash` | das Standard-Gate-Modell |
| `dealignai/deepseek-v4.1-flash-uncensored-fp8` | DeepSeek V4.1 Flash, unzensierte Variante |
| `dealignai/glm-5.3-flash-uncensored-fp8` | GLM 5.3 Flash, unzensierte Variante |
| `dealignai/glm-5.3-uncensored-fp8` | GLM 5.3, unzensierte Variante |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra |
| `moonshotai/kimi-k3.1-pro` | Kimi K3.1 Pro |
| `uniboshi/kimi-k3-abliterated-v1` | Kimi K3 abliterated |
| `z-ai/glm-5.3-flash` | GLM 5.3 Flash |
| `z-ai/glm-5.3` | GLM 5.3 |

Jede andere ID antwortet auf einem Konto mit Null-Guthaben mit `402 insufficient credits` — das ist das
Kontoguthaben, kein defekter Schlüssel.

## 🧪 So verwendest du die API

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

Reasoning-Modelle auf diesem Gateway können die Antwort in `reasoning_content` statt in
`content` ablegen; lies beide Felder (oder sende `max_tokens >= 128`).

## ✅ Qualitätsprüfungen

- Ein Schlüssel wird **erst geschrieben, nachdem** ein Live-`chat-200` **und** eine Inhaltsprüfung erfolgreich waren: zwei
  verschiedene Prompts müssen nicht-leere und **unterschiedliche** Antworten liefern.
- Schlüssel, die durchfallen, landen in `keys-dead.txt`, niemals in `keys.txt`.
- `npm run mint -- --verify` prüft jeden Schlüssel, der sich derzeit in `keys.txt` befindet, erneut mit derselben Prüfung.

## 🧭 So funktioniert es

1. **Postfach** — mail.tm / mail.gw-Posteingang oder Mailtrap, wenn ein Token konfiguriert ist.
2. **Registrierung** — `https://numes.ai/auth/login` → Keycloak-Registrierungsseite. Die CLI tippt
   die Adresse ein, klickt das Turnstile-Kontrollkästchen in einem echten Chrome (puppeteer-core + das Chrome,
   das du bereits hast) und sendet das Formular ab.
3. **Verifizierung** — die CLI fragt den Posteingang ab, öffnet den Link und füllt das Passwortformular aus.
4. **Dashboard** — nachdem das Sitzungs-Cookie existiert, liest die CLI die Konto-ID und den
   `csrfToken` aus der Dashboard-Nutzlast und ruft
   `POST /api/bff/app/v1/accounts/<id>/keys` genau so auf, wie es die Seite tut.
5. **Prüfung** — Live-Chat-Aufruf, dann wird der Schlüssel gespeichert.

Nichts wird vorgetäuscht: Der Browser ist dein eigener Chrome in deinem eigenen Netzwerk.

## 🔌 Verbindung mit 9Router

```bash
npm run 9router
# oder
node src/connect-9router.js --base http://localhost:20128 --password 123456
```

Es registriert einen `openai-compatible`-Provider-Knoten mit dem Präfix `numes` und eine Verbindung pro
Schlüssel in `keys.txt` (Namen werden vom Schlüssel-Hash abgeleitet, sodass erneute Läufe idempotent sind). Modelle sind dann
als `numes/<model-id>` verfügbar.

## 🔌 Verbindung mit OmniRoute

```bash
npm run omniroute
# oder
node src/connect-omniroute.js --base http://localhost:20128 --password 123456
```

Dieselbe Idee, dasselbe Präfix, auf einer OmniRoute-Instanz.

## ⚙️ CLI-Optionen

```
--auto              ohne Fragen ausführen (der Launcher verwendet dies)
--count N           wie viele Konten/Schlüssel (Standard 10)
--pool <file>       Proxy-Liste, einer pro Zeile: http://host:port, socks5://user:pass@host:port
--strict-proxy      fehlschlagen statt auf direkt zurückzufallen, wenn ein Proxy ausfällt
--headless          Chrome headless ausführen (Turnstile lehnt meist ab; headed ist der Standard)
--mailtrap-token K  Mailtrap-API-Token (optional; oder MAILTRAP_TOKEN oder mailtrap.txt)
--verify            jeden Schlüssel in keys.txt mit einem Live-Chat-Aufruf erneut prüfen
--dry               den Plan ausgeben und beenden
```

## 🛰️ Hinter einem Proxy

Ein Proxy ist **optional** — ohne `--pool` läuft alles direkt.

Mit einer Liste wird jedes Konto für das gesamte Konto an einen Exit gebunden (Registrierung, Mail,
Dashboard, Schlüsselerstellung und die Live-Prüfung), denn ein Schlüssel, der von einer Adresse aus erstellt wurde, muss
von derselben Adresse aus nachgewiesen werden:

```bash
node src/cli.js --auto --count 20 --pool proxies.txt --strict-proxy
```

`proxies.txt` akzeptiert `http://host:port`, `http://user:pass@host:port`,
`socks5://host:port` und `socks5://user:pass@host:port`, eine pro Zeile.

## ⚠️ Kontorisiko & wie man es minimiert

Keine Automatisierung ist risikofrei: Das Panel kann Ratenlimits setzen, Wegwerf-Mail-Domains ablehnen oder
Konten schließen. Dieses Risiko gering zu halten ist eine Frage des Verhaltens, nicht des Codes:

- ein Konto = ein Schlüssel, und ein Exit pro Konto (niemals viele Konten gleichzeitig von einer IP);
- den Lauf drosseln (Dutzende pro Stunde, nicht Hunderte) und Konten benutzt aussehen lassen — die CLI wartet bereits
  zwischen den Konten und führt einen echten Chat-Aufruf aus, bevor ein Schlüssel gespeichert wird;
- ein echter Mailbox-Host (Mailtrap) ist in großem Umfang zuverlässiger als öffentliche Temp-Mail;
- halte deine eigenen Konten davon fern.

Führe dies nur gegen Konten aus, die dir gehören, und respektiere die Bedingungen des Anbieters.

## 🐞 Probleme

Eröffne ein Issue mit dem genauen Befehl, der Konsolenausgabe (maskiere die Schlüssel) und der Angabe, ob ein Proxy
beteiligt war.

## 📄 Lizenz

MIT — siehe [LICENSE](LICENSE).