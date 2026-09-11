import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import chokidar from 'chokidar';

const PORT = Number(process.env.PORT || 5210);
const VAULT_PATH = path.resolve(process.env.VAULT_PATH || '../vault-demo');
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

const state = { files: new Map(), nodes: new Map(), edges: [], updatedAt: null, rebuilding: false };
const SKIP = new Set(['.obsidian', '.trash', 'node_modules']);
const TYPE_COLORS = {
  cliente: '#62d9d0', projeto: '#56d98c', reuniao: '#e99555', ferramenta: '#f0d94a',
  memoria: '#9a83c7', documento: '#70a9d8', rotina: '#8cefa8', fonte: '#55c4e8',
  conteudo: '#70a9d8', default: '#56d98c'
};

function normalizeTarget(raw) {
  return raw.split('|')[0].trim().replace(/\\/g, '/').replace(/\.md$/i, '');
}
function slug(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function inferType(rel, frontmatter = {}) {
  if (frontmatter.type) return String(frontmatter.type).toLowerCase();
  const top = rel.split('/')[0]?.toLowerCase();
  return ({clientes:'cliente', projetos:'projeto', reunioes:'reuniao', ferramentas:'ferramenta', memoria:'memoria', fontes:'fonte', documentos:'documento', rotinas:'rotina', conteudo:'conteudo'})[top] || 'documento';
}
async function walk(dir, out=[]) {
  for (const ent of await fs.readdir(dir, {withFileTypes:true})) {
    if (SKIP.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(p,out);
    else if (/\.md$/i.test(ent.name)) out.push(p);
  }
  return out;
}
function relative(p) { return path.relative(VAULT_PATH,p).replaceAll(path.sep,'/'); }
function baseName(rel) { return rel.split('/').pop().replace(/\.md$/i,''); }
function extractLinks(content) {
  const out=[]; const re=/\[\[([^\]]+)\]\]/g; let m;
  while ((m=re.exec(content))) out.push(normalizeTarget(m[1]));
  return [...new Set(out)];
}
async function parseFile(filePath) {
  const raw = await fs.readFile(filePath,'utf8');
  const parsed = matter(raw); const rel = relative(filePath); const name = baseName(rel);
  return { path:rel, name, id:slug(rel), frontmatter:parsed.data||{}, content:parsed.content, raw, links:extractLinks(parsed.content), mtime: (await fs.stat(filePath)).mtime.toISOString() };
}
function rebuildGraph() {
  state.nodes.clear(); const edges=[]; const byName=new Map();
  for (const f of state.files.values()) {
    const type=inferType(f.path,f.frontmatter);
    const id=f.id;
    state.nodes.set(id,{id,label:f.name,type,path:f.path,score:Number(f.frontmatter.score||0),freshness: freshness(f.mtime),connections:0});
    byName.set(f.name.toLowerCase(),id); byName.set(f.path.replace(/\.md$/i,'').toLowerCase(),id);
  }
  for (const f of state.files.values()) {
    for (const target of f.links) {
      const tid=byName.get(target.toLowerCase()); if (!tid || tid===f.id) continue;
      edges.push({source:f.id,target:tid,type:'wikilink',weight:1});
    }
  }
  for (const e of edges) { state.nodes.get(e.source).connections++; state.nodes.get(e.target).connections++; }
  state.edges=edges; state.updatedAt=new Date().toISOString();
}
function freshness(iso) { const days=(Date.now()-new Date(iso).getTime())/86400000; return Math.max(0,Math.round(100-Math.min(days,100)*1)); }
async function rebuild() {
  if (state.rebuilding) return; state.rebuilding=true;
  try { const files=await walk(VAULT_PATH); state.files.clear(); for (const p of files) { try { const f=await parseFile(p); state.files.set(f.path,f); } catch(e) { console.error('parse',p,e.message); } } rebuildGraph(); console.log(`BRAiN: ${state.files.size} notas, ${state.nodes.size} nós, ${state.edges.length} relações`); }
  finally { state.rebuilding=false; }
}
function health() {
  const nodes=[...state.nodes.values()]; const files=[...state.files.values()];
  const freshnessScore=Math.round(nodes.reduce((a,n)=>a+n.freshness,0)/Math.max(nodes.length,1));
  const linked=nodes.filter(n=>n.connections>0).length; const connectivity=Math.round(linked/Math.max(nodes.length,1)*100);
  const documented=files.filter(f=>f.content.trim().length>80).length; const documentation=Math.round(documented/Math.max(files.length,1)*100);
  const validated=files.filter(f=>f.frontmatter.validated===true || f.frontmatter.status==='validated').length; const validation=Math.round(validated/Math.max(files.length,1)*100);
  const active=files.filter(f=>f.frontmatter.status==='active' || f.frontmatter.status==='ativo').length; const activity=Math.round(active/Math.max(files.length,1)*100);
  const score=Math.round(.25*freshnessScore+.20*connectivity+.20*documentation+.15*activity+.20*validation);
  const pending=files.filter(f=>f.frontmatter.validation==='pending' || f.frontmatter.status==='pending' || f.frontmatter.status==='pendente').map(f=>f.path);
  return {score,freshness:freshnessScore,connectivity,documentation,activity,validation,pending,counts:{files:files.length,nodes:nodes.length,edges:state.edges.length}};
}
app.get('/api/health',(_,res)=>res.json(health()));
app.get('/api/graph',(req,res)=>{
  const type=req.query.type; const q=String(req.query.q||'').toLowerCase();
  const nodes=[...state.nodes.values()].filter(n=>(!type||n.type===type)&&(!q||n.label.toLowerCase().includes(q)||n.path.toLowerCase().includes(q)));
  const ids=new Set(nodes.map(n=>n.id)); const edges=state.edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
  res.json({nodes,edges,colors:TYPE_COLORS,updatedAt:state.updatedAt});
});
app.get('/api/files',(req,res)=>{
  const q=String(req.query.q||'').toLowerCase(); const type=req.query.type;
  const data=[...state.files.values()].filter(f=>(!q||f.name.toLowerCase().includes(q)||f.path.toLowerCase().includes(q))&&(!type||inferType(f.path,f.frontmatter)===type)).map(f=>({id:f.id,name:f.name,path:f.path,type:inferType(f.path,f.frontmatter),mtime:f.mtime,status:f.frontmatter.status||'unknown',validated:f.frontmatter.validated||false}));
  res.json(data);
});
app.get('/api/file',(req,res)=>{ const p=String(req.query.path||''); const f=state.files.get(p); if(!f) return res.status(404).json({error:'Arquivo não encontrado'}); res.json({...f,html:marked.parse(f.content),type:inferType(f.path,f.frontmatter)}); });
app.post('/api/reindex',async(_,res)=>{await rebuild();res.json({ok:true,updatedAt:state.updatedAt});});

await fs.mkdir(VAULT_PATH,{recursive:true}); await rebuild();
chokidar.watch(VAULT_PATH,{ignored:[/(^|[\\/])\../,/[\\/]\.obsidian([\\/]|$)/]}).on('all',async(event,file)=>{ if(!/\.md$/i.test(file)) return; await rebuild(); });
app.listen(PORT,()=>console.log(`BRAiN API: http://localhost:${PORT} | Vault: ${VAULT_PATH}`));
