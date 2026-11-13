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

**Otomatik oluşturulan API anahtarlarıyla toplu numes.ai hesabı oluşturun — OpenAI uyumlu çıkarım (DeepSeek V4.1 Flash, GLM 5.3, Kimi K3.1, Nemotron 3 Ultra) + 9Router / OmniRoute bağlayıcıları.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(browser%20only)-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)

[🛠 Hızlı başlangıç](#-quick-start) · [🤖 Modeller](#-models) · [🧪 API'yi kullanma](#-how-to-use-the-api) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Seçenekler](#️-cli-options) · [🛰️ Proxy'ler](#️-behind-a-proxy)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Bu nedir

numes.ai, OpenAI uyumlu bir ağ geçididir. Kayıt işlemi **Keycloak** (`auth.numes.ai`) üzerinde çalışır,
bir **Cloudflare Turnstile** bileşeniyle korunur ve panelin anahtar oluşturmanıza izin vermesinden önce
**e-posta doğrulaması ve bir parola** gerektirir. Ardından panel, anahtarları kendi BFF'i üzerinden
`X-Numes-CSRF` başlığıyla oluşturur; bu başlığın değeri rastgele bir UUID **değildir** — sunucu tarafından
oluşturulan panel yüküne gömülü `csrfToken` değeridir.

Bu CLI tüm bunları sizin için yapar: posta kutusu → gerçek bir Chrome'da kayıt (Turnstile onay kutusu
gerçek bir fareyle tıklanır) → doğrulama bağlantısı → parola → panel → API anahtarı; ve yalnızca canlı bir
sohbet çağrısına zaten yanıt vermiş bir anahtarı yazar.

## 🛠 Hızlı başlangıç

```bash
npm install
npm start
```

Ardından **1) Mint keys** seçeneğini seçin ve kaç hesap/anahtar istediğinizi yazın. Tüm akış bundan
ibarettir — token istemi yok, captcha istemi yok.

```bash
npm run mint -- --count 5          # menü olmadan aynı şey
```

Anahtarlar `keys.txt` dosyasına, her satırda bir tane olacak şekilde kaydedilir. Hesap verileri (e-posta,
anahtarın son dört karakteri) `accounts.jsonl` dosyasına kaydedilir.

CLI **kendi başına okunabilir bir posta kutusu oluşturur** (mail.tm / mail.gw, HTTP üzerinden okunur),
böylece yeni bir kopya hiçbir yerde hesap gerektirmez: `npm install && npm start` yeterlidir.

Toplu üretim yapıyorsanız, ücretsiz bir [Mailtrap](https://mailtrap.io) API token'ını bir kez
`mailtrap.txt` dosyasına koyun — gerçek bir gelen posta sunucusu, çalışmayı tek kullanımlık alan adı
reddetmelerinden uzak tutar:
```bash
echo "YOUR_MAILTRAP_TOKEN" > mailtrap.txt
```

Bu olmadan CLI otomatik olarak genel kanalları kullanmaya devam eder (uçtan uca doğrulandı: bir mail.tm
adresi kaydolur, bağlantıyı alır ve canlı bir anahtar üretir).

## 🤖 Modeller

Uç nokta yaklaşık 155 model kimliği listeler. Sıfır bakiyeli (ücretsiz) bir hesap bu küme üzerinde yanıt verir:

| Model kimliği | Notlar |
| --- | --- |
| `deepseek/deepseek-v4.1-flash` | varsayılan kapı modeli |
| `dealignai/deepseek-v4.1-flash-uncensored-fp8` | DeepSeek V4.1 Flash, sansürsüz sürüm |
| `dealignai/glm-5.3-flash-uncensored-fp8` | GLM 5.3 Flash, sansürsüz sürüm |
| `dealignai/glm-5.3-uncensored-fp8` | GLM 5.3, sansürsüz sürüm |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra |
| `moonshotai/kimi-k3.1-pro` | Kimi K3.1 Pro |
| `uniboshi/kimi-k3-abliterated-v1` | Kimi K3 abliterated |
| `z-ai/glm-5.3-flash` | GLM 5.3 Flash |
| `z-ai/glm-5.3` | GLM 5.3 |

Diğer tüm kimlikler sıfır bakiyeli bir hesapta `402 insufficient credits` yanıtı verir — bu, anahtarın
bozuk olduğu değil, hesap bakiyesinin yetersiz olduğu anlamına gelir.

## 🧪 API'yi kullanma

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

Bu ağ geçidindeki akıl yürütme modelleri yanıtı `content` yerine `reasoning_content` içine koyabilir;
her iki alanı da okuyun (veya `max_tokens >= 128` gönderin).

## ✅ Kalite kapıları

- Bir anahtar **yalnızca** canlı bir `chat-200` **ve** içerik sağlamlık kontrolünden sonra yazılır: iki
  farklı istem, boş olmayan ve **farklı** yanıtlar döndürmelidir.
- Başarısız olan anahtarlar `keys-dead.txt` dosyasına gider, asla `keys.txt` dosyasına değil.
- `npm run mint -- --verify`, `keys.txt` içindeki her anahtarı aynı kapıyla yeniden kontrol eder.

## 🧭 Nasıl çalışır

1. **Posta kutusu** — mail.tm / mail.gw gelen kutusu veya token yapılandırıldığında Mailtrap.
2. **Kayıt** — `https://numes.ai/auth/login` → Keycloak kayıt sayfası. CLI adresi yazar, gerçek bir
   Chrome'da Turnstile onay kutusunu tıklar (puppeteer-core + zaten sahip olduğunuz Chrome) ve gönderir.
3. **Doğrulama** — CLI gelen kutusunu yoklar, bağlantıyı açar, parola formunu doldurur.
4. **Panel** — oturum çerezi oluştuktan sonra CLI, hesap kimliğini ve `csrfToken` değerini panel
   yükünden okur ve sayfanın yaptığı gibi
   `POST /api/bff/app/v1/accounts/<id>/keys` çağrısını yapar.
5. **Kapı** — canlı sohbet çağrısı, ardından anahtar kaydedilir.

Hiçbir şey taklit edilmez: tarayıcı, kendi ağınızdaki kendi Chrome'unuzdur.

## 🔌 9Router'a bağlanma

```bash
npm run 9router
# veya
node src/connect-9router.js --base http://localhost:20128 --password 123456
```

`numes` önekiyle bir `openai-compatible` sağlayıcı düğümü ve `keys.txt` içindeki her anahtar için bir
bağlantı kaydeder (adlar anahtar karmasından türetilir, böylece yeniden çalıştırmalar etkisizdir).
Modeller daha sonra `numes/<model-id>` olarak kullanılabilir.

## 🔌 OmniRoute'a bağlanma

```bash
npm run omniroute
# veya
node src/connect-omniroute.js --base http://localhost:20128 --password 123456
```

Aynı fikir, aynı önek, bir OmniRoute örneği üzerinde.

## ⚙️ CLI seçenekleri

```
--auto              soru sormadan çalıştır (başlatıcı bunu kullanır)
--count N           kaç hesap/anahtar (varsayılan 10)
--pool <file>       proxy listesi, her satırda bir tane: http://host:port, socks5://user:pass@host:port
--strict-proxy      bir proxy öldüğünde doğrudan bağlantıya düşmek yerine başarısız ol
--headless          Chrome'u başsız çalıştır (Turnstile genellikle reddeder; varsayılan başlıdır)
--mailtrap-token K  Mailtrap API token'ı (isteğe bağlı; veya MAILTRAP_TOKEN, veya mailtrap.txt)
--verify            keys.txt içindeki her anahtarı canlı bir sohbet çağrısıyla yeniden kontrol et
--dry               planı yazdır ve çık
```

## 🛰️ Proxy arkasında

Proxy **isteğe bağlıdır** — `--pool` olmadan her şey doğrudan çalışır.

Bir liste verildiğinde, her hesap tüm hesap boyunca (kayıt, posta, panel, anahtar oluşturma ve canlı kapı)
tek bir çıkışa sabitlenir, çünkü bir adresten oluşturulan bir anahtarın aynı adresten kanıtlanması gerekir:

```bash
node src/cli.js --auto --count 20 --pool proxies.txt --strict-proxy
```

`proxies.txt`, her satırda bir tane olacak şekilde `http://host:port`, `http://user:pass@host:port`,
`socks5://host:port` ve `socks5://user:pass@host:port` biçimlerini kabul eder.

## ⚠️ Hesap riski ve bunu en aza indirme

Hiçbir otomasyon risksiz değildir: panel hız sınırlaması uygulayabilir, tek kullanımlık posta alan adlarını
reddedebilir veya hesapları kapatabilir. Bu riski düşük tutmak bir davranış meselesidir, kod meselesi değil:

- bir hesap = bir anahtar ve her hesap için bir çıkış (aynı IP'den aynı anda asla birden fazla hesap değil);
- çalışmayı temposuna bırakın (yüzlerce değil, saatte onlarca) ve hesapların kullanılmış görünmesine izin
  verin — CLI zaten hesaplar arasında bekler ve bir anahtarı kaydetmeden önce gerçek bir sohbet çağrısı yapar;
- gerçek bir posta sunucusu (Mailtrap), toplu kullanımda genel geçici postadan daha güvenilirdir;
- kendi hesaplarınızı bunun dışında tutun.

Yalnızca sahip olduğunuz hesaplara karşı çalıştırın ve sağlayıcının koşullarına uyun.

## 🐞 Sorunlar

Tam komutu, konsol çıktısını (anahtarları maskeleyin) ve bir proxy'nin dahil olup olmadığını belirterek
bir sorun bildirin.

## 📄 Lisans

MIT — bkz. [LICENSE](LICENSE).