import {getIndex} from './_brain.js';
export default async function handler(req, res) {
  try {
    const i = await getIndex();
    const q = String(req.query?.q || '').toLowerCase();
    const type = String(req.query?.type || '').toLowerCase();
    const keep = new Set(i.nodes.filter(n => (!type || n.type === type) && (!q || `${n.label} ${n.path}`.toLowerCase().includes(q))).map(n => n.id));
    const nodes = i.nodes.filter(n => keep.has(n.id));
    const edges = i.edges.filter(e => keep.has(e.source) && keep.has(e.target));
    res.status(200).json({nodes, edges, colors: i.colors});
  } catch (error) { res.status(500).json({error: error.message}); }
}
