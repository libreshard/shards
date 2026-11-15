// Checks the gallery's entries (shards/<id>.json). Run by CI on every pull request:
//
//   node tools/check.mjs                 check every entry's fields
//   node tools/check.mjs --download      also download each file, check its size and sha256, and run
//                                        it through LibreShard's own install checks
//
// --download needs a checkout of the LibreShard app with its dependencies installed, given in
// LIBRESHARD_DIR (CI does that). It compares the entry with the shard's manifest: the gallery shows
// the entry before anyone downloads anything, so they must agree, keys included.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([a-z]:)/i, '$1')), '..');
const MAX_BYTES = 50 * 1024 * 1024; // LibreShard's install limit
const MAX_SCREENSHOT = 500 * 1024;
export const TAGS = ['games', 'streaming', 'creative', 'video', 'audio', 'office', 'development', 'desktop', 'accessibility', 'other'];
const FIELDS = ['id', 'name', 'author', 'description', 'icon', 'version', 'minAppVersion', 'license', 'url', 'tags', 'screenshot', 'keys', 'apps', 'download', 'paid', 'price', 'buyUrl'];

const ID = /^[a-z0-9-]{1,64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const VERSION = /^\d+(\.\d+){0,2}([-+][0-9A-Za-z.-]+)?$/;
const LICENSE = /^(?=.*[A-Za-z0-9])[A-Za-z0-9.+\-() ]{1,64}$/;
const text = (v, max) => typeof v === 'string' && v.trim() === v && v.length > 0 && [...v].length <= max && !/[\u0000-\u001f\u007f]/.test(v);
function https(v) {
  if (typeof v !== 'string' || v.length > 2048) return false;
  try { const u = new URL(v); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password; } catch { return false; }
}
const sameSet = (a = [], b = []) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

// The fields of one entry. Returns a list of problems (empty when it's fine).
export function checkEntry(e, file) {
  const errors = [];
  const bad = (m) => errors.push(m);
  if (!e || typeof e !== 'object' || Array.isArray(e)) return ['must be a JSON object'];
  for (const k of Object.keys(e)) if (!FIELDS.includes(k)) bad(`unknown field "${k}"`);
  if (typeof e.id !== 'string' || !ID.test(e.id)) bad('"id": lowercase letters, digits and hyphens, at most 64');
  else if (file && path.basename(file) !== `${e.id}.json`) bad(`the file must be named ${e.id}.json`);
  if (!text(e.name, 60)) bad('"name": text of up to 60 characters');
  if (!text(e.author, 60)) bad('"author": text of up to 60 characters');
  if (!text(e.description, 160)) bad('"description": text of up to 160 characters');
  if (e.icon !== undefined && !text(e.icon, 16)) bad('"icon": an emoji or a letter');
  if (typeof e.version !== 'string' || !VERSION.test(e.version)) bad('"version": like "1.2.3"');
  if (e.minAppVersion !== undefined && (typeof e.minAppVersion !== 'string' || !VERSION.test(e.minAppVersion))) bad('"minAppVersion": like "0.5.0"');
  if (typeof e.license !== 'string' || !LICENSE.test(e.license)) bad('"license": an SPDX identifier such as "MIT", or "LicenseRef-Proprietary"');
  if (e.url !== undefined && !https(e.url)) bad('"url": an https:// address');
  if (!Array.isArray(e.tags) || !e.tags.length || e.tags.length > 3 || e.tags.some((t) => !TAGS.includes(t))) bad(`"tags": one to three of ${TAGS.join(', ')}`);
  if (e.screenshot !== undefined) {
    if (typeof e.screenshot !== 'string' || !/^screenshots\/[a-z0-9-]{1,64}\.(png|webp|jpg)$/.test(e.screenshot)) bad('"screenshot": "screenshots/<id>.png" (or .webp, .jpg)');
    else {
      const f = path.join(ROOT, e.screenshot);
      if (!fs.existsSync(f)) bad(`"screenshot": ${e.screenshot} is missing`);
      else if (fs.statSync(f).size > MAX_SCREENSHOT) bad(`"screenshot": ${e.screenshot} is over 500 KB`);
    }
  }
  if (!Array.isArray(e.keys) || !e.keys.length || e.keys.length > 300 || e.keys.some((k) => typeof k !== 'string' || !k || k.length > 64)) bad('"keys": the manifest\'s permissions.keys');
  if (e.apps !== undefined && (!Array.isArray(e.apps) || e.apps.length > 20 || e.apps.some((a) => !text(a, 100)))) bad('"apps": the manifest\'s apps');
  if (e.paid !== undefined && typeof e.paid !== 'boolean') bad('"paid": true or false');
  if (e.paid) {
    if (!text(e.price, 40)) bad('"price": text such as "4 USD" or "Pay what you want"');
    if (!https(e.buyUrl)) bad('"buyUrl": the https:// page where it is sold');
  } else {
    if (e.price !== undefined || e.buyUrl !== undefined) bad('"price" and "buyUrl" are only for paid shards ("paid": true)');
    const d = e.download;
    if (!d || typeof d !== 'object' || Array.isArray(d)) bad('"download": { "url", "sha256", "size" }');
    else {
      for (const k of Object.keys(d)) if (!['url', 'sha256', 'size'].includes(k)) bad(`"download": unknown field "${k}"`);
      if (!https(d.url)) bad('"download.url": an https:// address of the .libreshard file');
      if (typeof d.sha256 !== 'string' || !SHA256.test(d.sha256)) bad('"download.sha256": 64 lowercase hex characters (sha256sum of the file)');
      if (!Number.isInteger(d.size) || d.size <= 0 || d.size > MAX_BYTES) bad('"download.size": the file\'s size in bytes, up to 50 MB');
    }
  }
  return errors;
}

// Downloads an entry's file and checks it against the entry with LibreShard's own code
async function checkFile(e, libreshard) {
  const errors = [];
  const res = await fetch(e.download.url, { headers: { 'User-Agent': 'LibreShard gallery check' } });
  if (!res.ok) return [`download: the server answered ${res.status}`];
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length !== e.download.size) errors.push(`download: ${buf.length} bytes, the entry says ${e.download.size}`);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha !== e.download.sha256) errors.push(`download: sha256 is ${sha}, the entry says ${e.download.sha256}`);
  if (errors.length) return errors;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-check-'));
  const file = path.join(dir, 'shard.libreshard');
  fs.writeFileSync(file, buf);
  let prepared;
  try {
    const appVersion = JSON.parse(fs.readFileSync(path.join(libreshard.dir, 'package.json'), 'utf8')).version;
    prepared = await libreshard.installer.prepare(file, { appVersion });
    if (!prepared.ok) return prepared.errors.map((m) => `LibreShard refuses the file: ${m}`);
    const m = prepared.manifest;
    const want = (field, a, b) => { if (a !== b) errors.push(`"${field}" is ${JSON.stringify(b)} in the entry but ${JSON.stringify(a)} in the manifest`); };
    want('id', m.id, e.id);
    want('version', m.version, e.version);
    want('name', m.name, e.name);
    want('author', m.author, e.author);
    if (m.icon !== undefined || e.icon !== undefined) want('icon', m.icon, e.icon);
    if (m.minAppVersion !== undefined || e.minAppVersion !== undefined) want('minAppVersion', m.minAppVersion, e.minAppVersion);
    if (m.license !== undefined) want('license', m.license, e.license);
    if (m.url !== undefined && e.url !== undefined) want('url', m.url, e.url);
    if (!sameSet(m.keys, e.keys)) errors.push('"keys" must be exactly the manifest\'s permissions.keys (normalized: ' + m.keys.join(', ') + ')');
    if (!sameSet(m.apps || [], e.apps || [])) errors.push('"apps" must be exactly the manifest\'s apps');
    // What the reviewer should look at
    const risk = libreshard.manifest.classifyKeys(m.keys);
    console.log(`  ${e.id} ${e.version}: ${m.keys.length} keys, ${prepared.size.files} files, ${prepared.size.bytes} bytes`);
    if (risk.dangerous.length) console.log(`  system shortcuts: ${risk.dangerous.join(', ')}`);
    if (risk.canType) console.log('  can type text and press Enter');
    if (risk.warning) console.log('  WARNING: system shortcuts and typing together: review carefully');
  } finally {
    prepared?.cleanup?.();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return errors;
}

async function main() {
  const download = process.argv.includes('--download');
  const dir = path.join(ROOT, 'shards');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  let libreshard = null;
  if (download) {
    const appDir = process.env.LIBRESHARD_DIR;
    if (!appDir) throw new Error('--download needs LIBRESHARD_DIR (a LibreShard checkout with npm ci done)');
    const require = createRequire(path.join(path.resolve(appDir), 'package.json'));
    libreshard = { dir: path.resolve(appDir), installer: require('./installer.js'), manifest: require('./manifest.js') };
  }
  let failed = 0;
  const ids = new Set();
  for (const f of files) {
    let e;
    try { e = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (err) {
      console.log(`✖ shards/${f}: not valid JSON (${err.message})`);
      failed++;
      continue;
    }
    const errors = checkEntry(e, f);
    if (e?.id && ids.has(e.id)) errors.push('another entry has the same id');
    ids.add(e?.id);
    if (!errors.length && download && !e.paid) errors.push(...await checkFile(e, libreshard));
    if (errors.length) {
      failed++;
      console.log(`✖ shards/${f}`);
      for (const m of errors) console.log(`  - ${m}`);
    } else {
      console.log(`✔ shards/${f}`);
    }
  }
  console.log(`${files.length} entries, ${failed} with problems`);
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(path.join(ROOT, 'tools', 'check.mjs'))) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
