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

**Crie contas em massa no numes.ai com chaves de API geradas automaticamente — inferência compatível com OpenAI (DeepSeek V4.1 Flash, GLM 5.3, Kimi K3.1, Nemotron 3 Ultra) + conectores 9Router / OmniRoute.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(browser%20only)-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)

[🛠 Início rápido](#-quick-start) · [🤖 Modelos](#-models) · [🧪 Usar a API](#-how-to-use-the-api) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Opções](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ O que é isto

O numes.ai é um gateway compatível com OpenAI. O cadastro roda no **Keycloak** (`auth.numes.ai`),
é protegido por um widget **Cloudflare Turnstile** e exige **verificação de e-mail mais uma
senha** antes que o painel permita criar uma chave. O painel então cria chaves
através do seu próprio BFF com um cabeçalho `X-Numes-CSRF` cujo valor **não** é um UUID aleatório — é
o `csrfToken` embutido no payload do painel renderizado pelo servidor.

Esta CLI faz tudo isso por você: caixa de correio → registro em um Chrome real (a caixa do
Turnstile é clicada com um mouse real) → link de verificação → senha → painel → chave de API,
e só grava uma chave que já respondeu a uma chamada de chat ao vivo.

## 🛠 Início rápido

```bash
npm install
npm start
```

Depois escolha **1) Mint keys** e digite quantas contas/chaves você quer. Esse é todo o fluxo —
sem prompts de token, sem prompts de captcha.

```bash
npm run mint -- --count 5          # a mesma coisa sem o menu
```

As chaves ficam em `keys.txt`, uma por linha. Os dados da conta (e-mail, últimos quatro caracteres da chave)
ficam em `accounts.jsonl`.

A CLI cria uma **caixa de correio legível por conta própria** (mail.tm / mail.gw, lida via HTTP), então um
checkout novo não precisa de conta em lugar nenhum: `npm install && npm start` é o suficiente.

Se você criar em volume, coloque um token de API gratuito do [Mailtrap](https://mailtrap.io) em `mailtrap.txt`
uma vez — um host real de e-mail de entrada mantém a execução longe de recusas por domínio descartável:
```bash
echo "YOUR_MAILTRAP_TOKEN" > mailtrap.txt
```

Sem ele, a CLI continua usando os trilhos públicos automaticamente (verificado de ponta a ponta: um endereço
mail.tm se registra, recebe o link e gera uma chave ativa).

## 🤖 Modelos

O endpoint lista ~155 ids de modelo. Uma conta com saldo zero (gratuita) responde neste conjunto:

| Id do modelo | Observações |
| --- | --- |
| `deepseek/deepseek-v4.1-flash` | o modelo de gate padrão |
| `dealignai/deepseek-v4.1-flash-uncensored-fp8` | DeepSeek V4.1 Flash, build sem censura |
| `dealignai/glm-5.3-flash-uncensored-fp8` | GLM 5.3 Flash, build sem censura |
| `dealignai/glm-5.3-uncensored-fp8` | GLM 5.3, build sem censura |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra |
| `moonshotai/kimi-k3.1-pro` | Kimi K3.1 Pro |
| `uniboshi/kimi-k3-abliterated-v1` | Kimi K3 abliterated |
| `z-ai/glm-5.3-flash` | GLM 5.3 Flash |
| `z-ai/glm-5.3` | GLM 5.3 |

Qualquer outro id responde `402 insufficient credits` em uma conta com saldo zero — isso é o
saldo da conta, não uma chave quebrada.

## 🧪 Como usar a API

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

Modelos de raciocínio neste gateway podem colocar a resposta em `reasoning_content` em vez de
`content`; leia os dois campos (ou envie `max_tokens >= 128`).

## ✅ Portões de qualidade

- Uma chave só é gravada **depois de** um `chat-200` ao vivo **e** uma verificação de sanidade do conteúdo: dois
  prompts diferentes devem retornar respostas não vazias e **diferentes**.
- Chaves que falham vão para `keys-dead.txt`, nunca para `keys.txt`.
- `npm run mint -- --verify` revalida cada chave atualmente em `keys.txt` com o mesmo portão.

## 🧭 Como funciona

1. **Caixa de correio** — caixa de entrada mail.tm / mail.gw, ou Mailtrap quando um token está configurado.
2. **Registro** — `https://numes.ai/auth/login` → página de registro do Keycloak. A CLI digita
   o endereço, clica na caixa do Turnstile em um Chrome real (puppeteer-core + o Chrome
   que você já tem) e envia.
3. **Verificação** — a CLI consulta a caixa de entrada, abre o link, preenche o formulário de senha.
4. **Painel** — depois que o cookie de sessão existe, a CLI lê o id da conta e o
   `csrfToken` do payload do painel e chama
   `POST /api/bff/app/v1/accounts/<id>/keys` exatamente como a página faz.
5. **Portão** — chamada de chat ao vivo, então a chave é salva.

Nada é falsificado: o navegador é o seu próprio Chrome na sua própria rede.

## 🔌 Conectar ao 9Router

```bash
npm run 9router
# or
node src/connect-9router.js --base http://localhost:20128 --password 123456
```

Ele registra um nó de provedor `openai-compatible` com prefixo `numes` e uma conexão por
chave em `keys.txt` (nomes derivados do hash da chave, então reexecuções são idempotentes). Os modelos ficam então
disponíveis como `numes/<model-id>`.

## 🔌 Conectar ao OmniRoute

```bash
npm run omniroute
# or
node src/connect-omniroute.js --base http://localhost:20128 --password 123456
```

Mesma ideia, mesmo prefixo, em uma instância do OmniRoute.

## ⚙️ Opções da CLI

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

## 🛰️ Atrás de um proxy

O proxy é **opcional** — sem `--pool` tudo roda direto.

Com uma lista, cada conta fica fixada a uma saída durante toda a conta (registro, e-mail,
painel, criação de chave e o portão ao vivo), porque uma chave criada a partir de um endereço deve ser
comprovada a partir do mesmo:

```bash
node src/cli.js --auto --count 20 --pool proxies.txt --strict-proxy
```

`proxies.txt` aceita `http://host:port`, `http://user:pass@host:port`,
`socks5://host:port` e `socks5://user:pass@host:port`, um por linha.

## ⚠️ Risco de conta e como minimizá-lo

Nenhuma automação é livre de risco: o painel pode limitar a taxa, recusar domínios de e-mail descartáveis ou fechar
contas. Manter esse risco baixo é uma questão de comportamento, não de código:

- uma conta = uma chave, e uma saída por conta (nunca muitas contas de um mesmo IP ao mesmo tempo);
- controle o ritmo da execução (dezenas por hora, não centenas) e deixe as contas parecerem usadas — a CLI já espera
  entre contas e faz uma chamada de chat real antes de salvar uma chave;
- um host de caixa de correio real (Mailtrap) é mais confiável que temp-mail público em volume;
- mantenha suas próprias contas fora disso.

Execute apenas contra contas que você possui e respeite os termos do provedor.

## 🐞 Problemas

Abra uma issue com o comando exato, a saída do console (mascare as chaves) e se um proxy
estava envolvido.

## 📄 Licença

MIT — veja [LICENSE](LICENSE).