'use strict';

const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function seed() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Schema executed successfully.');

    const clans = [
      { name: 'Dragon Warriors', tag: '#DW9TH001', visited: true, daysAgo: 10 },
      { name: 'Barbarian Kings', tag: '#BK9TH002', visited: true, daysAgo: 8 },
      { name: 'Wizard Tower', tag: '#WT9TH003', visited: false },
      { name: 'Lava Hounds', tag: '#LH9TH004', visited: true, daysAgo: 5 },
      { name: 'Hog Riders', tag: '#HR9TH005', visited: false },
      { name: 'Golem Squad', tag: '#GS9TH006', visited: true, daysAgo: 3 },
      { name: 'Witch Craft', tag: '#WC9TH007', visited: false },
      { name: 'Valkyrie Force', tag: '#VF9TH008', visited: true, daysAgo: 1 },
      { name: 'Archer Queens', tag: '#AQ9TH009', visited: false },
      { name: 'PEKKA Smash', tag: '#PS9TH010', visited: false }
    ];

    let inserted = 0;
    for (const c of clans) {
      const lastVisited = c.daysAgo ? new Date(Date.now() - c.daysAgo * 86400000) : null;
      let res;
      try {
        res = await pool.query(
          `INSERT INTO clans (name, tag, visited, last_visited) 
           VALUES ($1, $2, $3, $4) 
           RETURNING id`,
          [c.name, c.tag, c.visited, lastVisited]
        );
      } catch (insertErr) {
        if (insertErr.code === '23505') {
          console.log(`  Skipped duplicate: ${c.name} (${c.tag})`);
          continue;
        }
        throw insertErr;
      }

      if (res.rows.length > 0) {
        inserted++;
        const clanId = res.rows[0].id;
        if (c.visited && lastVisited) {
          await pool.query(
            'INSERT INTO visit_history (clan_id, visited_at) VALUES ($1, $2)',
            [clanId, lastVisited]
          );
        }
      }
    }
    
    console.log(`Successfully inserted ${inserted} clans.`);
  } catch (error) {
    console.error('Seed script failed:', error.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
