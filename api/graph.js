import {getIndex} from './_brain.js';
export default async function handler(req, res) {
  try { const i = await getIndex(); res.status(200).json({nodes: i.nodes, edges: i.edges}); }
  catch (error) { res.status(500).json({error: error.message}); }
}
