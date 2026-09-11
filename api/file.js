import fs from 'node:fs/promises';
import matter from 'gray-matter';
import {safeVaultPath} from './_brain.js';
export default async function handler(req, res) {
  try {
    const relative = req.query?.path || '';
    if (!relative) return res.status(400).json({error: 'Parametro path obrigatorio'});
    const filePath = safeVaultPath(relative);
    if (!filePath.toLowerCase().endsWith('.md')) return res.status(400).json({error: 'Apenas Markdown e permitido'});
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    res.status(200).json({path: relative, frontmatter: parsed.data, content: parsed.content});
  } catch (error) {
    const code = error.code === 'ENOENT' ? 404 : 500;
    res.status(code).json({error: error.message});
  }
}
