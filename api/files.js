import {getIndex} from './_brain.js';
export default async function handler(req, res) {
  try {
    const i = await getIndex();
    const q = String(req.query?.q || '').toLowerCase();
    const type = String(req.query?.type || '').toLowerCase();
    const docs = i.docs.filter(d => (!type || d.type === type) && (!q || `${d.title} ${d.path}`.toLowerCase().includes(q)));
    res.status(200).json(docs.map(({content, ...doc}) => ({...doc, name: doc.title})));
  } catch (error) { res.status(500).json({error: error.message}); }
}
