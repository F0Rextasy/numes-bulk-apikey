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

**Créez en masse des comptes numes.ai avec des clés API générées automatiquement — inférence compatible OpenAI (DeepSeek V4.1 Flash, GLM 5.3, Kimi K3.1, Nemotron 3 Ultra) + connecteurs 9Router / OmniRoute.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(browser%20only)-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)

[🛠 Démarrage rapide](#-quick-start) · [🤖 Modèles](#-models) · [🧪 Utiliser l'API](#-how-to-use-the-api) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ De quoi s'agit-il

numes.ai est une passerelle compatible OpenAI. L'inscription repose sur **Keycloak** (`auth.numes.ai`),
est protégée par un widget **Cloudflare Turnstile**, et nécessite une **vérification par e-mail ainsi qu'un
mot de passe** avant que le tableau de bord ne vous permette de créer une clé. Le tableau de bord crée ensuite les clés
via son propre BFF avec un en-tête `X-Numes-CSRF` dont la valeur n'est **pas** un UUID aléatoire — c'est
le `csrfToken` intégré dans la charge utile du tableau de bord rendue par le serveur.

Cette CLI fait tout cela pour vous : boîte mail → inscription dans un vrai Chrome (la case
Turnstile est cochée avec une vraie souris) → lien de vérification → mot de passe → tableau de bord → clé API,
et elle n'écrit une clé qu'après qu'elle a déjà répondu à un appel de chat en direct.

## 🛠 Démarrage rapide

```bash
npm install
npm start
```

Choisissez ensuite **1) Mint keys** et saisissez le nombre de comptes/clés souhaité. C'est tout le flux —
aucune invite de token, aucune invite de captcha.

```bash
npm run mint -- --count 5          # la même chose sans le menu
```

Les clés arrivent dans `keys.txt`, une par ligne. Les données du compte (e-mail, quatre derniers caractères de la clé)
arrivent dans `accounts.jsonl`.

La CLI crée **elle-même une boîte mail lisible** (mail.tm / mail.gw, lue via HTTP), donc un
checkout frais ne nécessite aucun compte nulle part : `npm install && npm start` suffit.

Si vous créez en volume, placez une fois un token API [Mailtrap](https://mailtrap.io) gratuit dans `mailtrap.txt`
— un véritable hôte de courrier entrant éloigne l'exécution des refus de domaines jetables :
```bash
echo "YOUR_MAILTRAP_TOKEN" > mailtrap.txt
```

Sans cela, la CLI continue d'utiliser automatiquement les rails publics (vérifié de bout en bout : une adresse mail.tm
s'inscrit, reçoit le lien et produit une clé active).

## 🤖 Modèles

Le point de terminaison liste ~155 identifiants de modèles. Un compte à solde nul (gratuit) répond sur cet ensemble :

| Identifiant du modèle | Remarques |
| --- | --- |
| `deepseek/deepseek-v4.1-flash` | le modèle de contrôle par défaut |
| `dealignai/deepseek-v4.1-flash-uncensored-fp8` | DeepSeek V4.1 Flash, version non censurée |
| `dealignai/glm-5.3-flash-uncensored-fp8` | GLM 5.3 Flash, version non censurée |
| `dealignai/glm-5.3-uncensored-fp8` | GLM 5.3, version non censurée |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra |
| `moonshotai/kimi-k3.1-pro` | Kimi K3.1 Pro |
| `uniboshi/kimi-k3-abliterated-v1` | Kimi K3 abliterated |
| `z-ai/glm-5.3-flash` | GLM 5.3 Flash |
| `z-ai/glm-5.3` | GLM 5.3 |

Tous les autres identifiants répondent `402 insufficient credits` sur un compte à solde nul — c'est le
solde du compte, pas une clé défectueuse.

## 🧪 Comment utiliser l'API

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

Les modèles de raisonnement sur cette passerelle peuvent placer la réponse dans `reasoning_content` au lieu de
`content` ; lisez les deux champs (ou envoyez `max_tokens >= 128`).

## ✅ Contrôles de qualité

- Une clé n'est écrite **qu'après** un `chat-200` en direct **et** une vérification de cohérence du contenu : deux
  invites différentes doivent renvoyer des réponses non vides et **différentes**.
- Les clés qui échouent finissent dans `keys-dead.txt`, jamais dans `keys.txt`.
- `npm run mint -- --verify` revérifie chaque clé actuellement dans `keys.txt` avec le même contrôle.

## 🧭 Comment ça fonctionne

1. **Boîte mail** — boîte de réception mail.tm / mail.gw, ou Mailtrap lorsqu'un token est configuré.
2. **Inscription** — `https://numes.ai/auth/login` → page d'inscription Keycloak. La CLI saisit
   l'adresse, coche la case Turnstile dans un vrai Chrome (puppeteer-core + le Chrome
   que vous avez déjà), et soumet.
3. **Vérification** — la CLI interroge la boîte de réception, ouvre le lien, remplit le formulaire de mot de passe.
4. **Tableau de bord** — une fois le cookie de session présent, la CLI lit l'identifiant du compte et le
   `csrfToken` depuis la charge utile du tableau de bord et appelle
   `POST /api/bff/app/v1/accounts/<id>/keys` exactement comme le fait la page.
5. **Contrôle** — appel de chat en direct, puis la clé est enregistrée.

Rien n'est falsifié : le navigateur est votre propre Chrome sur votre propre réseau.

## 🔌 Se connecter à 9Router

```bash
npm run 9router
# ou
node src/connect-9router.js --base http://localhost:20128 --password 123456
```

Il enregistre un nœud de fournisseur `openai-compatible` avec le préfixe `numes` et une connexion par
clé dans `keys.txt` (les noms sont dérivés du hachage de la clé, donc les ré-exécutions sont idempotentes). Les modèles sont alors
disponibles sous `numes/<model-id>`.

## 🔌 Se connecter à OmniRoute

```bash
npm run omniroute
# ou
node src/connect-omniroute.js --base http://localhost:20128 --password 123456
```

Même principe, même préfixe, sur une instance OmniRoute.

## ⚙️ Options de la CLI

```
--auto              exécuter sans questions (le lanceur utilise ceci)
--count N           combien de comptes/clés (par défaut 10)
--pool <file>       liste de proxies, une par ligne : http://host:port, socks5://user:pass@host:port
--strict-proxy      échouer au lieu de revenir en direct lorsqu'un proxy meurt
--headless          exécuter Chrome en mode headless (Turnstile refuse généralement ; le mode avec interface est par défaut)
--mailtrap-token K  token API Mailtrap (facultatif ; ou MAILTRAP_TOKEN, ou mailtrap.txt)
--verify            revérifier chaque clé dans keys.txt avec un appel de chat en direct
--dry               afficher le plan et quitter
```

## 🛰️ Derrière un proxy

Le proxy est **facultatif** — sans `--pool`, tout s'exécute en direct.

Avec une liste, chaque compte est épinglé à une sortie pour tout le compte (inscription, mail,
tableau de bord, création de clé et contrôle en direct), car une clé créée depuis une adresse doit être
prouvée depuis la même :

```bash
node src/cli.js --auto --count 20 --pool proxies.txt --strict-proxy
```

`proxies.txt` accepte `http://host:port`, `http://user:pass@host:port`,
`socks5://host:port` et `socks5://user:pass@host:port`, une par ligne.

## ⚠️ Risque lié au compte et comment le minimiser

Aucune automatisation n'est sans risque : le panneau peut limiter le débit, refuser les domaines de mail jetables ou fermer
des comptes. Garder ce risque faible est une question de comportement, pas de code :

- un compte = une clé, et une sortie par compte (jamais plusieurs comptes depuis une même IP en même temps) ;
- rythmez l'exécution (des dizaines par heure, pas des centaines) et laissez les comptes paraître utilisés — la CLI attend déjà
  entre les comptes et effectue un véritable appel de chat avant d'enregistrer une clé ;
- un véritable hôte de boîte mail (Mailtrap) est plus fiable que le temp-mail public en volume ;
- tenez vos propres comptes à l'écart.

Exécutez uniquement contre des comptes que vous possédez et respectez les conditions du fournisseur.

## 🐞 Problèmes

Ouvrez un ticket avec la commande exacte, la sortie de la console (masquez les clés) et si un proxy
était impliqué.

## 📄 Licence

MIT — voir [LICENSE](LICENSE).