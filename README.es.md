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

**Crea cuentas de numes.ai en masa con claves API autogeneradas — inferencia compatible con OpenAI (DeepSeek V4.1 Flash, GLM 5.3, Kimi K3.1, Nemotron 3 Ultra) + conectores 9Router / OmniRoute.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(browser%20only)-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)

[🛠 Inicio rápido](#-quick-start) · [🤖 Modelos](#-models) · [🧪 Usar la API](#-how-to-use-the-api) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Opciones](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Qué es esto

numes.ai es una pasarela compatible con OpenAI. El registro se ejecuta en **Keycloak** (`auth.numes.ai`),
está protegido por un widget de **Cloudflare Turnstile**, y requiere **verificación por correo electrónico más una
contraseña** antes de que el panel te permita crear una clave. El panel luego crea las claves
a través de su propio BFF con un encabezado `X-Numes-CSRF` cuyo valor **no** es un UUID aleatorio — es
el `csrfToken` incrustado en la carga útil del panel renderizada por el servidor.

Este CLI hace todo eso por ti: buzón → registro en un Chrome real (la casilla de Turnstile
se marca con un ratón real) → enlace de verificación → contraseña → panel → clave API,
y solo escribe una clave que ya haya respondido a una llamada de chat en vivo.

## 🛠 Inicio rápido

```bash
npm install
npm start
```

Luego elige **1) Mint keys** y escribe cuántas cuentas/claves quieres. Ese es todo el flujo —
sin solicitudes de token, sin solicitudes de captcha.

```bash
npm run mint -- --count 5          # lo mismo sin el menú
```

Las claves se guardan en `keys.txt`, una por línea. Los datos de la cuenta (correo electrónico, últimos cuatro caracteres de la clave)
se guardan en `accounts.jsonl`.

El CLI crea un **buzón legible por sí mismo** (mail.tm / mail.gw, leído por HTTP), así que una
instalación nueva no necesita ninguna cuenta en ningún sitio: `npm install && npm start` es suficiente.

Si creas claves en volumen, pon un token de API gratuito de [Mailtrap](https://mailtrap.io) en `mailtrap.txt`
una vez — un host de correo entrante real mantiene la ejecución alejada de los rechazos por dominio desechable:
```bash
echo "YOUR_MAILTRAP_TOKEN" > mailtrap.txt
```

Sin él, el CLI sigue usando los servicios públicos automáticamente (verificado de extremo a extremo: una dirección de mail.tm
se registra, recibe el enlace y produce una clave en vivo).

## 🤖 Modelos

El endpoint lista ~155 ids de modelos. Una cuenta con saldo cero (gratuita) responde en este conjunto:

| Id del modelo | Notas |
| --- | --- |
| `deepseek/deepseek-v4.1-flash` | el modelo de puerta por defecto |
| `dealignai/deepseek-v4.1-flash-uncensored-fp8` | DeepSeek V4.1 Flash, versión sin censura |
| `dealignai/glm-5.3-flash-uncensored-fp8` | GLM 5.3 Flash, versión sin censura |
| `dealignai/glm-5.3-uncensored-fp8` | GLM 5.3, versión sin censura |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra |
| `moonshotai/kimi-k3.1-pro` | Kimi K3.1 Pro |
| `uniboshi/kimi-k3-abliterated-v1` | Kimi K3 abliterated |
| `z-ai/glm-5.3-flash` | GLM 5.3 Flash |
| `z-ai/glm-5.3` | GLM 5.3 |

Cualquier otro id responde `402 insufficient credits` en una cuenta con saldo cero — eso es el
saldo de la cuenta, no una clave rota.

## 🧪 Cómo usar la API

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

Los modelos de razonamiento en esta pasarela pueden poner la respuesta en `reasoning_content` en lugar de
`content`; lee ambos campos (o envía `max_tokens >= 128`).

## ✅ Controles de calidad

- Una clave se escribe **solo después** de un `chat-200` en vivo **y** una comprobación de cordura del contenido: dos
  prompts diferentes deben devolver respuestas no vacías y **diferentes**.
- Las claves que fallan van a `keys-dead.txt`, nunca a `keys.txt`.
- `npm run mint -- --verify` vuelve a comprobar cada clave actualmente en `keys.txt` con el mismo control.

## 🧭 Cómo funciona

1. **Buzón** — bandeja de entrada de mail.tm / mail.gw, o Mailtrap cuando hay un token configurado.
2. **Registro** — `https://numes.ai/auth/login` → página de registro de Keycloak. El CLI escribe
   la dirección, marca la casilla de Turnstile en un Chrome real (puppeteer-core + el Chrome
   que ya tienes), y envía.
3. **Verificación** — el CLI consulta la bandeja de entrada, abre el enlace, rellena el formulario de contraseña.
4. **Panel** — una vez que existe la cookie de sesión, el CLI lee el id de la cuenta y el
   `csrfToken` de la carga útil del panel y llama a
   `POST /api/bff/app/v1/accounts/<id>/keys` exactamente como lo hace la página.
5. **Puerta** — llamada de chat en vivo, luego se guarda la clave.

Nada se falsifica: el navegador es tu propio Chrome en tu propia red.

## 🔌 Conectar con 9Router

```bash
npm run 9router
# o
node src/connect-9router.js --base http://localhost:20128 --password 123456
```

Registra un nodo de proveedor `openai-compatible` con el prefijo `numes` y una conexión por
clave en `keys.txt` (los nombres se derivan del hash de la clave, así que las re-ejecuciones son idempotentes). Los modelos quedan entonces
disponibles como `numes/<model-id>`.

## 🔌 Conectar con OmniRoute

```bash
npm run omniroute
# o
node src/connect-omniroute.js --base http://localhost:20128 --password 123456
```

La misma idea, el mismo prefijo, en una instancia de OmniRoute.

## ⚙️ Opciones del CLI

```
--auto              ejecutar sin preguntas (el lanzador usa esto)
--count N           cuántas cuentas/claves (por defecto 10)
--pool <file>       lista de proxies, una por línea: http://host:port, socks5://user:pass@host:port
--strict-proxy      fallar en lugar de recurrir a directo cuando un proxy muere
--headless          ejecutar Chrome en modo headless (Turnstile normalmente lo rechaza; con interfaz es lo predeterminado)
--mailtrap-token K  token de API de Mailtrap (opcional; o MAILTRAP_TOKEN, o mailtrap.txt)
--verify            volver a comprobar cada clave en keys.txt con una llamada de chat en vivo
--dry               imprimir el plan y salir
```

## 🛰️ Detrás de un proxy

El proxy es **opcional** — sin `--pool` todo se ejecuta directo.

Con una lista, cada cuenta se fija a una salida durante toda la cuenta (registro, correo,
panel, creación de clave y la puerta en vivo), porque una clave creada desde una dirección debe
probarse desde la misma:

```bash
node src/cli.js --auto --count 20 --pool proxies.txt --strict-proxy
```

`proxies.txt` acepta `http://host:port`, `http://user:pass@host:port`,
`socks5://host:port` y `socks5://user:pass@host:port`, una por línea.

## ⚠️ Riesgo de cuenta y cómo minimizarlo

Ninguna automatización está libre de riesgos: el panel puede limitar la tasa, rechazar dominios de correo desechable o cerrar
cuentas. Mantener ese riesgo bajo es una cuestión de comportamiento, no de código:

- una cuenta = una clave, y una salida por cuenta (nunca muchas cuentas desde una misma IP a la vez);
- marca el ritmo de la ejecución (decenas por hora, no cientos) y deja que las cuentas parezcan usadas — el CLI ya espera
  entre cuentas y hace una llamada de chat real antes de guardar una clave;
- un host de buzón real (Mailtrap) es más fiable que el correo temporal público en volumen;
- mantén tus propias cuentas fuera de esto.

Ejecútalo solo contra cuentas que poseas y respeta los términos del proveedor.

## 🐞 Problemas

Abre un issue con el comando exacto, la salida de la consola (enmascara las claves) y si hubo
un proxy involucrado.

## 📄 Licencia

MIT — consulta [LICENSE](LICENSE).
</div>