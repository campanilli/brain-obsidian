import {getIndex} from './_brain.js';
export default async function handler(req, res) {
  try { res.status(200).json(await getIndex().then(i => i.health)); }
  catch (error) { res.status(500).json({error: error.message}); }
}
