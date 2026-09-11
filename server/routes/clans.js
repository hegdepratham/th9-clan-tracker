'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { importLimiter } = require('../middleware/rateLimiter');
const { parse } = require('csv-parse/sync');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    let { search, filter, sort } = req.query;
    
    sort = ['name', 'recent', 'lastVisited'].includes(sort) ? sort : 'name';
    filter = ['all', 'visited', 'unvisited'].includes(filter) ? filter : 'all';
    search = search ? String(search).trim().substring(0, 100) : '';

    let query = 'SELECT * FROM clans';
    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (filter === 'visited') {
      conditions.push(`visited = true`);
    } else if (filter === 'unvisited') {
      conditions.push(`visited = false`);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIdx} OR tag ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (sort === 'name') {
      query += ' ORDER BY name ASC';
    } else if (sort === 'recent') {
      query += ' ORDER BY created_at DESC';
    } else if (sort === 'lastVisited') {
      query += ' ORDER BY last_visited DESC NULLS LAST';
    } else {
      query += ' ORDER BY visited ASC, name ASC';
    }

    const result = await pool.query(query, params);
    res.json({ clans: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total, 
        COUNT(*) FILTER (WHERE visited = true) as visited 
      FROM clans
    `);
    const total = parseInt(result.rows[0].total, 10);
    const visited = parseInt(result.rows[0].visited, 10);
    const remaining = total - visited;
    res.json({ total, visited, remaining });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/next-unvisited', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clans WHERE visited = false ORDER BY created_at ASC LIMIT 1');
    res.json({ clan: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    let { name, tag, notes } = req.body;
    
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Invalid name' });
    name = name.trim().substring(0, 100);
    if (!name) return res.status(400).json({ error: 'Name is required' });

    tag = tag && typeof tag === 'string' ? tag.trim().substring(0, 20) : '';
    notes = notes && typeof notes === 'string' ? notes.substring(0, 1000) : '';

    if (tag) {
      const dupCheck = await pool.query('SELECT id FROM clans WHERE LOWER(tag) = LOWER($1)', [tag]);
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ error: 'A clan with this tag already exists' });
      }
    }

    const result = await pool.query(
      'INSERT INTO clans (name, tag, notes) VALUES ($1, $2, $3) RETURNING *',
      [name, tag, notes]
    );
    res.status(201).json({ clan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });

    let { name, tag, notes } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Invalid name' });
    name = name.trim().substring(0, 100);
    if (!name) return res.status(400).json({ error: 'Name is required' });

    tag = tag && typeof tag === 'string' ? tag.trim().substring(0, 20) : '';
    notes = notes && typeof notes === 'string' ? notes.substring(0, 1000) : '';

    if (tag) {
      const dupCheck = await pool.query('SELECT id FROM clans WHERE LOWER(tag) = LOWER($1) AND id != $2', [tag, id]);
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ error: 'A clan with this tag already exists' });
      }
    }

    const result = await pool.query(
      'UPDATE clans SET name=$1, tag=$2, notes=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [name, tag, notes, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Clan not found' });
    res.json({ clan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });

    const result = await pool.query('DELETE FROM clans WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Clan not found' });
    res.json({ message: 'Clan deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/visit', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });

    await pool.query('BEGIN');
    const updateResult = await pool.query(
      'UPDATE clans SET visited = true, last_visited = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (updateResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Clan not found' });
    }

    await pool.query('INSERT INTO visit_history (clan_id) VALUES ($1)', [id]);
    await pool.query('COMMIT');
    res.json({ clan: updateResult.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/unvisit', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });

    const result = await pool.query(
      'UPDATE clans SET visited = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Clan not found' });
    res.json({ clan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/import', importLimiter, async (req, res) => {
  try {
    const { data, format, confirm } = req.body;
    if (!data || typeof data !== 'string' || data.length > 1000000) {
      return res.status(400).json({ error: 'Invalid import data' });
    }

    let parsedData = [];
    if (format === 'csv') {
      try {
        parsedData = parse(data, { columns: true, skip_empty_lines: true });
      } catch (e) {
        return res.status(400).json({ error: 'Invalid CSV format' });
      }
    } else if (format === 'pipe') {
      const lines = data.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split('|').map(p => p.trim());
        parsedData.push({ name: parts[0] || '', tag: parts[1] || '', notes: parts[2] || '' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid format' });
    }

    if (parsedData.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 rows allowed' });
    }

    const valid = [];
    const invalid = [];
    const duplicates = [];
    const seenTags = new Set();
    
    // Fetch existing tags to check duplicates across DB
    const existingTagsResult = await pool.query('SELECT LOWER(tag) as ltag FROM clans WHERE tag != \'\'');
    const existingTags = new Set(existingTagsResult.rows.map(r => r.ltag));

    for (let row of parsedData) {
      const name = (row.name || '').trim().substring(0, 100);
      const tag = (row.tag || '').trim().substring(0, 20);
      const notes = (row.notes || '').substring(0, 1000);
      const lowerTag = tag.toLowerCase();

      if (!name) {
        invalid.push({ row, reason: 'Name is required' });
        continue;
      }

      if (tag) {
        if (seenTags.has(lowerTag) || existingTags.has(lowerTag)) {
          duplicates.push({ row, reason: 'Duplicate tag' });
          continue;
        }
        seenTags.add(lowerTag);
      }

      valid.push({ name, tag, notes });
    }

    if (!confirm) {
      return res.json({ valid, invalid, duplicates, totalDetected: parsedData.length });
    }

    let imported = 0;
    for (const clan of valid) {
      try {
        await pool.query(
          'INSERT INTO clans (name, tag, notes) VALUES ($1, $2, $3)',
          [clan.name, clan.tag, clan.notes]
        );
        imported++;
      } catch (insertErr) {
        // Skip duplicates that hit the unique index
        if (insertErr.code === '23505') continue;
        throw insertErr;
      }
    }

    res.json({ imported, skipped: valid.length - imported + duplicates.length, errors: invalid });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, tag, notes, visited, last_visited, created_at FROM clans ORDER BY name');
    
    let csv = 'name,tag,notes,visited,lastVisited,createdAt\n';
    for (const row of result.rows) {
      const safeName = '"' + String(row.name).replace(/"/g, '""') + '"';
      const safeTag = '"' + String(row.tag || '').replace(/"/g, '""') + '"';
      const safeNotes = '"' + String(row.notes || '').replace(/"/g, '""') + '"';
      const lastVis = row.last_visited ? row.last_visited.toISOString() : '';
      const created = row.created_at ? row.created_at.toISOString() : '';
      
      csv += `${safeName},${safeTag},${safeNotes},${row.visited},${lastVis},${created}\n`;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="th9-clans-export-${dateStr}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
