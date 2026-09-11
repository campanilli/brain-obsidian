import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const VAULT_PATH = path.resolve(process.cwd(), 'vault-demo');

function normalizeTarget(target) {
  return target.replace(/\\/g, '/').replace(/\.md$/i, '').trim();
}

function titleFromPath(filePath) {
  return path.basename(filePath, '.md');
}

function typeFromFile(filePath, data) {
  if (data?.type) return data.type;
  const relative = path.relative(VAULT_PATH, filePath).split(path.sep);
  return relative.length > 1 ? relative[0] : 'memoria';
}

async function walk(dir) {
  const entries = await fs.readdir(dir, {withFileTypes: true});
  const result = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) result.push(full);
  }
  return result;
}

function extractLinks(content) {
  const links = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = re.exec(content))) {
    const raw = match[1].split('|')[0].split('#')[0].trim();
    if (raw) links.push(normalizeTarget(raw));
  }
  return links;
}

async function buildIndex() {
  const files = await walk(VAULT_PATH);
  const docs = [];
  const byKey = new Map();

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const rel = path.relative(VAULT_PATH, filePath).split(path.sep).join('/');
    const key = normalizeTarget(rel);
    const title = parsed.data.title || titleFromPath(filePath);
    const links = extractLinks(parsed.content);
    const stat = await fs.stat(filePath);
    const doc = {
      path: rel,
      key,
      title,
      type: typeFromFile(filePath, parsed.data),
      frontmatter: parsed.data,
      content: parsed.content,
      links,
      updatedAt: stat.mtime.toISOString(),
      size: stat.size
    };
    docs.push(doc);
    byKey.set(key, doc);
    byKey.set(normalizeTarget(title), doc);
  }

  const nodes = docs.map((doc, index) => ({
    id: doc.key,
    label: doc.title,
    type: doc.type,
    path: doc.path,
    score: Number(doc.frontmatter.score ?? Math.max(55, 96 - index * 4))
  }));
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = [];

  for (const doc of docs) {
    for (const target of doc.links) {
      const targetDoc = byKey.get(target);
      if (targetDoc && nodeIds.has(targetDoc.key) && targetDoc.key !== doc.key) {
        edges.push({source: doc.key, target: targetDoc.key, type: 'wikilink'});
      }
    }
  }

  const connected = new Set(edges.flatMap(e => [e.source, e.target]));
  const validated = docs.filter(d => d.frontmatter.validated === true || d.frontmatter.validated === 'true').length;
  const documentation = docs.length ? Math.round((docs.filter(d => d.content.trim().length > 80).length / docs.length) * 100) : 0;
  const connection = nodes.length ? Math.round((connected.size / nodes.length) * 100) : 0;
  const freshness = docs.length ? Math.round(docs.reduce((sum, d) => sum + freshnessScore(d.updatedAt), 0) / docs.length) : 0;
  const validation = docs.length ? Math.round((validated / docs.length) * 100) : 0;
  const health = Math.round((freshness + documentation + connection + validation) / 4);

  return {docs, nodes, edges, health: {score: health, freshness, documentation, connection, validation, pendingValidation: docs.length - validated}};
}

function freshnessScore(updatedAt) {
  const age = (Date.now() - new Date(updatedAt).getTime()) / 86400000;
  if (age <= 1) return 100;
  if (age <= 7) return 90;
  if (age <= 30) return 75;
  if (age <= 90) return 55;
  return 30;
}

export async function getIndex() {
  return buildIndex();
}

export function safeVaultPath(relativePath) {
  const clean = String(relativePath || '').replace(/\\/g, '/');
  const resolved = path.resolve(VAULT_PATH, clean);
  if (resolved !== VAULT_PATH && !resolved.startsWith(VAULT_PATH + path.sep)) {
    throw new Error('Caminho invalido');
  }
  return resolved;
}
