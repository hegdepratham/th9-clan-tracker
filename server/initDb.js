'use strict';

const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function init() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database schema executed successfully.');
  } catch (error) {
    console.error('Failed to execute database schema:', error.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  init();
}

module.exports = init;
