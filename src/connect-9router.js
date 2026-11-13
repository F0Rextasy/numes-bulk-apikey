#!/usr/bin/env node
'use strict';

/**
 * Connect numes.ai to a 9Router instance.
 *
 * numes.ai serves an OpenAI-compatible endpoint (https://api.numes.ai/api/v1), so a single
 * provider-node carries every key: this registers one `openai-compatible` node
 * with prefix `numes` and then one connection per API key. Re-running it is
 * idempotent (an existing node or connection is reused), and 9Router
 * load-balances across the keys of a node.
 *
 * Usage:
 *   node src/connect-9router.js \
 *     --base http://localhost:20128 --password 123456 \
 *     --api-key YOUR_KEY [--name "Numes"] [--prefix numes]
 *
 *   node src/connect-9router.js                  # register every key in keys.txt
 *   node src/connect-9router.js --model <id>     # pin the connection's default model
 *
 * Options:
 *   --base <url>       9Router base URL         (default http://localhost:20128)
 *   --password <pw>    9Router login password   (default 123456)
 *   --api-key <key>    numes.ai API key         (default: every key in keys.txt)
 *   --name <name>      provider-node name       (default Numes)
 *   --prefix <slug>    provider prefix in 9Router (default numes)
 *   --base-url <url>   provider base URL        (default https://api.numes.ai/api/v1)
 *   --model <id>       connection default model (default: provider's default model)
 *
 * Zero dependencies. Node.js >= 18.
 */

const fs = require('fs');
const path = require('path');

const UA = 'numes-bulk-9router-connector/1.0';

const DEFAULTS = {
  base: 'http://localhost:20128',
  password: '123456',
  name: 'Numes',
  prefix: 'numes',
  baseUrl: 'https://api.numes.ai/api/v1',
  defaultModel: 'deepseek/deepseek-v4.1-flash',
};

/** Model ids a fresh key lists, as routed under `<prefix>/…` by 9Router. */
const MODELS = [
  'deepseek/deepseek-v4.1-flash',
  'dealignai/glm-5.3-flash-uncensored-fp8',
  'dealignai/deepseek-v4.1-flash-uncensored-fp8',
  'dealignai/glm-5.3-uncensored-fp8',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'moonshotai/kimi-k3.1-pro',
  'uniboshi/kimi-k3-abliterated-v1',
  'z-ai/glm-5.3-flash',
  'z-ai/glm-5.3',
];

async function login9router(base, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ password: password ?? DEFAULTS.password }),
  });
  const sc = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const cookie = sc.map((c) => c.split(';')[0]).join('; ');
  return { ok: res.ok, cookie, body: (await res.text()).slice(0, 200) };
}

async function api(base, cookie, route, init = {}) {
  const res = await fetch(`${base}${route}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* a non-JSON answer is reported as text */
  }
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 400) };
}

async function ensureNode(base, cookie, { name, prefix, baseUrl }) {
  const list = await api(base, cookie, '/api/provider-nodes');
  const nodes = (list.json && list.json.nodes) || [];
  const existing = nodes.find((n) => n.prefix === prefix || n.name === name);
  if (existing) {
    console.log(`provider-node exists: ${existing.id} (prefix ${existing.prefix} · baseUrl ${existing.baseUrl || baseUrl})`);
    return existing;
  }
  const created = await api(base, cookie, '/api/provider-nodes', {
    method: 'POST',
    body: JSON.stringify({ name, prefix, apiType: 'chat', type: 'openai-compatible', baseUrl }),
  });
  if (!created.ok) throw new Error(`create node failed ${created.status}: ${created.text}`);
  console.log(`provider-node created: ${created.json.node.id}`);
  return created.json.node;
}

async function ensureConnection(base, cookie, { nodeId, name, apiKey, priority = 1, defaultModel }) {
  // 9router-go serves writes on /api/connections; older builds use /api/providers.
  const listOf = async (route) => {
    const r = await api(base, cookie, route);
    return (r.json && (r.json.connections || (Array.isArray(r.json) ? r.json : null))) || [];
  };
  let route = '/api/providers';
  let conns = await listOf(route);
  if (!conns.length) {
    const alt = await listOf('/api/connections');
    if (alt.length) {
      route = '/api/connections';
      conns = alt;
    }
  }
  const existing = conns.find((c) => c.name === name);
  if (existing) {
    console.log(`connection exists: ${existing.id} (${existing.name})`);
    return existing;
  }
  const payload = JSON.stringify({ provider: nodeId, apiKey, name, priority, defaultModel: defaultModel || null, baseUrl: DEFAULTS.baseUrl });
  let created = await api(base, cookie, route, { method: 'POST', body: payload });
  if (created.status === 405 && route !== '/api/connections') {
    route = '/api/connections';
    created = await api(base, cookie, route, { method: 'POST', body: payload });
  }
  if (!created.ok && created.status !== 409) {
    throw new Error(`create connection failed ${created.status}: ${created.text}`);
  }
  // 9router-go answers with a bare array (or a single object) instead of {connection}.
  const body = created.json;
  const entry = body && (body.connection || (Array.isArray(body) ? body[0] : body));
  console.log(`connection ${entry && entry.id ? `created: ${entry.id}` : 'created'}`);
  return entry || null;
}

/** Register every key of `keys` — one connection per key, `<prefix>-001`, `-002`, … */
async function connectKeys({
  base = DEFAULTS.base,
  password = DEFAULTS.password,
  keys,
  name = DEFAULTS.name,
  prefix = DEFAULTS.prefix,
  baseUrl = DEFAULTS.baseUrl,
  defaultModel = DEFAULTS.defaultModel,
} = {}) {
  const list = (keys || []).map((k) => String(k).trim()).filter(Boolean);
  if (!list.length) throw new Error('--api-key is required (or put your keys in keys.txt)');
  const url = String(base).replace(/\/+$/, '');
  const { ok, cookie, body } = await login9router(url, password);
  console.log(`9Router login: ${ok ? 'ok' : 'not required/failed'} ${ok ? '' : body}`);
  const node = await ensureNode(url, cookie, { name, prefix, baseUrl });
  const crypto = require('crypto');
  const out = [];
  for (const key of list) {
    // Key-derived name: a re-run recognises its own keys, sequential names collide across runs.
    const connName = `${prefix}-${crypto.createHash('sha1').update(key).digest('hex').slice(0, 8)}`;
    out.push(await ensureConnection(url, cookie, { nodeId: node.id, name: connName, apiKey: key, defaultModel }));
  }
  console.log(`\nDone. ${list.length} key(s) on node ${node.id} — models: ${MODELS.map((m) => `${prefix}/${m}`).join(' · ')}`);
  return out;
}

/** Register one key — rotate keys by calling this again with another `apiKey`. */
async function connect9Router(opts = {}) {
  const [connection] = await connectKeys({ ...opts, keys: [opts.apiKey] });
  return connection;
}

/** `keys.txt` at the checkout root (beside `src/`) — the layout the tools run in. */
function defaultKeysFile() {
  return path.join(__dirname, '..', 'keys.txt');
}

function readKeys(keysFile = defaultKeysFile()) {
  if (!fs.existsSync(keysFile)) return [];
  return fs
    .readFileSync(keysFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

async function connectKeysFile({ keysFile = defaultKeysFile(), ...opts } = {}) {
  const keys = readKeys(keysFile);
  if (!keys.length) throw new Error(`no API keys in ${keysFile} — mint some first, or pass --api-key`);
  console.log(`keys: ${keys.length} from ${keysFile}`);
  return connectKeys({ ...opts, keys });
}

function parseRouterArgs(argv = process.argv.slice(2)) {
  const arg = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? undefined : argv[i + 1];
  };
  return {
    base: arg('base'),
    password: arg('password'),
    apiKey: arg('api-key'),
    name: arg('name'),
    prefix: arg('prefix'),
    baseUrl: arg('base-url'),
    defaultModel: arg('model'),
  };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    const doc = fs.readFileSync(__filename, 'utf8').match(/\/\*\*([\s\S]*?)\*\//);
    console.log(doc ? doc[1].replace(/^\s*\*[ ]?/gm, '').trim() : 'see README.md');
    process.exit(0);
  }
  const opts = parseRouterArgs(argv);
  const run = opts.apiKey ? connect9Router(opts) : connectKeysFile(opts);
  run.catch((e) => {
    console.error('[fatal] ' + e.message);
    process.exit(1);
  });
}

module.exports = {
  connect9Router,
  connectKeys,
  connectKeysFile,
  readKeys,
  defaultKeysFile,
  parseRouterArgs,
  login9router,
  ensureNode,
  ensureConnection,
  DEFAULTS,
  MODELS,
};
