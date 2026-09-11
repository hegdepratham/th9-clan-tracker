/**
 * Smoke Test Script for TH9 Clan Tracker
 * Tests the Express app's routing, middleware, and validation logic
 * using a mock database (no real PostgreSQL needed).
 *
 * Usage: node test/smokeTest.js
 */

'use strict';

const path = require('path');
const http = require('http');

// Add server's node_modules to module resolution
const serverNodeModules = path.join(__dirname, '..', 'server', 'node_modules');
module.paths.unshift(serverNodeModules);

// Load environment before anything else
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ============= Mock Database Pool =============
const mockClans = [
  { id: 1, name: 'Dragon Warriors', tag: '#DW9TH001', notes: '', visited: true, last_visited: new Date('2026-09-01'), created_at: new Date(), updated_at: new Date() },
  { id: 2, name: 'Barbarian Kings', tag: '#BK9TH002', notes: '', visited: false, last_visited: null, created_at: new Date(), updated_at: new Date() },
  { id: 3, name: 'Wizard Tower', tag: '#WT9TH003', notes: 'Good clan', visited: false, last_visited: null, created_at: new Date(), updated_at: new Date() },
];

let nextId = 4;
const sessions = {};  // in-memory session store

const mockPool = {
  query: async (text, params) => {
    if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
    if (text === 'SELECT NOW()') return { rows: [{ now: new Date() }] };

    // connect-pg-simple: table existence check
    if (text.includes('to_regclass') || text.includes('pg_tables') || text.includes('information_schema')) {
      return { rows: [{ to_regclass: 'session' }] };
    }
    if (text.includes('CREATE TABLE')) return { rows: [] };

    // connect-pg-simple: session INSERT/UPDATE (UPSERT)
    // Actual query: INSERT INTO "session" (sess, expire, sid) SELECT $1, to_timestamp($2), $3 ON CONFLICT ...
    // params: [sessData, expireTimestamp, sid]
    if (text.includes('"session"') && text.includes('INSERT')) {
      const sessData = params && params[0];
      const sid = params && params[2];
      if (sid) {
        sessions[sid] = { data: sessData, expire: new Date(Date.now() + 86400000) };
      }
      return { rows: [] };
    }

    // connect-pg-simple: session SELECT
    // Actual query: SELECT sess FROM "session" WHERE sid = $1 AND expire >= to_timestamp($2)
    // params: [sid, timestamp]
    if (text.includes('FROM "session"') && text.includes('SELECT')) {
      const sid = params && params[0];
      const sess = sessions[sid];
      if (sess) {
        return { rows: [{ sess: sess.data }] };
      }
      return { rows: [] };
    }

    // connect-pg-simple: session DELETE
    if (text.includes('"session"') && text.includes('DELETE')) {
      const sid = params && params[0];
      if (sid) delete sessions[sid];
      return { rows: [] };
    }

    // Stats
    if (text.includes('COUNT(*)') && text.includes('FILTER')) {
      const total = mockClans.length;
      const visited = mockClans.filter(c => c.visited).length;
      return { rows: [{ total: String(total), visited: String(visited) }] };
    }

    // Next unvisited
    if (text.includes('visited = false') && text.includes('LIMIT 1')) {
      const clan = mockClans.find(c => !c.visited);
      return { rows: clan ? [clan] : [] };
    }

    // List clans (SELECT * FROM clans with possible WHERE/ORDER)
    if (text.startsWith('SELECT * FROM clans') && !text.includes('WHERE id')) {
      let results = [...mockClans];
      if (params && params.length > 0 && text.includes('ILIKE')) {
        const search = params[0].replace(/%/g, '').toLowerCase();
        results = results.filter(c => c.name.toLowerCase().includes(search) || c.tag.toLowerCase().includes(search));
      }
      if (text.includes("visited = true") && !text.includes('ILIKE')) {
        results = results.filter(c => c.visited);
      }
      if (text.includes("visited = false") && !text.includes('LIMIT')) {
        results = results.filter(c => !c.visited);
      }
      return { rows: results };
    }

    // Duplicate check by tag
    if (text.includes('SELECT id FROM clans WHERE LOWER(tag)')) {
      const tag = params[0].toLowerCase();
      const excludeId = params[1];
      const match = mockClans.find(c => c.tag.toLowerCase() === tag && (!excludeId || c.id !== excludeId));
      return { rows: match ? [{ id: match.id }] : [] };
    }

    // Existing tags for import duplicate check
    if (text.includes('SELECT LOWER(tag) as ltag')) {
      return { rows: mockClans.filter(c => c.tag).map(c => ({ ltag: c.tag.toLowerCase() })) };
    }

    // Insert clan
    if (text.includes('INSERT INTO clans')) {
      const clan = {
        id: nextId++, name: params[0], tag: params[1] || '', notes: params[2] || '',
        visited: false, last_visited: null, created_at: new Date(), updated_at: new Date()
      };
      mockClans.push(clan);
      return { rows: [clan] };
    }

    // Insert visit history
    if (text.includes('INSERT INTO visit_history')) return { rows: [{ id: 1 }] };

    // Update clan (visit)
    if (text.includes('UPDATE clans SET visited = true')) {
      const id = params[0];
      const clan = mockClans.find(c => c.id === id);
      if (!clan) return { rows: [] };
      clan.visited = true;
      clan.last_visited = new Date();
      clan.updated_at = new Date();
      return { rows: [clan] };
    }

    // Update clan (unvisit)
    if (text.includes('UPDATE clans SET visited = false')) {
      const id = params[0];
      const clan = mockClans.find(c => c.id === id);
      if (!clan) return { rows: [] };
      clan.visited = false;
      clan.updated_at = new Date();
      return { rows: [clan] };
    }

    // Update clan (edit)
    if (text.includes('UPDATE clans SET name')) {
      const id = params[3];
      const clan = mockClans.find(c => c.id === id);
      if (!clan) return { rows: [] };
      clan.name = params[0]; clan.tag = params[1]; clan.notes = params[2];
      clan.updated_at = new Date();
      return { rows: [clan] };
    }

    // Delete clan
    if (text.includes('DELETE FROM clans')) {
      const id = params[0];
      const idx = mockClans.findIndex(c => c.id === id);
      if (idx === -1) return { rows: [] };
      mockClans.splice(idx, 1);
      return { rows: [{ id }] };
    }

    // Export
    if (text.includes('SELECT name, tag, notes, visited, last_visited, created_at')) {
      return { rows: mockClans };
    }

    return { rows: [] };
  },
  on: () => {},        // event emitter stub
  connect: async () => ({ query: mockPool.query, release: () => {} }),
};

// ============= Inject mock BEFORE requiring the server =============
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  // Intercept any require of the db module from the server directory
  if (request.endsWith('db') || request.endsWith('db.js') || request === '../db' || request === './db') {
    if (parent && parent.filename && parent.filename.includes('th9-clan-tracker')) {
      return '__mock_db__';
    }
  }
  return origResolve.call(this, request, parent, ...rest);
};

const origLoad = Module._cache;
require.cache['__mock_db__'] = {
  id: '__mock_db__',
  filename: '__mock_db__',
  loaded: true,
  exports: mockPool,
};

// Now require the server (it will get mockPool instead of the real db)
const app = require('../server/index');

// ============= Test Helpers =============
let passed = 0;
let failed = 0;
let sessionCookie = '';

function assert(condition, message) {
  if (condition) { console.log(`  ✅ ${message}`); passed++; }
  else { console.log(`  ❌ ${message}`); failed++; }
}

function req(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 3001, path: urlPath, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (sessionCookie) opts.headers['Cookie'] = sessionCookie;

    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const sc = res.headers['set-cookie'];
        if (sc) sessionCookie = sc.map(c => c.split(';')[0]).join('; ');
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers, raw: data });
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

// ============= Test Suite =============
async function runTests() {
  console.log('\n🏗️  TH9 Clan Tracker — Smoke Tests\n');

  // ---------- Unauthenticated access ----------
  console.log('── Security: Unauthenticated Access ──');
  let r;
  r = await req('GET', '/api/clans');
  assert(r.status === 401, 'GET /api/clans → 401');
  r = await req('GET', '/api/clans/stats');
  assert(r.status === 401, 'GET /api/clans/stats → 401');
  r = await req('POST', '/api/clans', { name: 'X', tag: '#X' });
  assert(r.status === 401, 'POST /api/clans → 401');
  r = await req('PUT', '/api/clans/1', { name: 'X' });
  assert(r.status === 401, 'PUT /api/clans/:id → 401');
  r = await req('DELETE', '/api/clans/1');
  assert(r.status === 401, 'DELETE /api/clans/:id → 401');
  r = await req('POST', '/api/clans/1/visit');
  assert(r.status === 401, 'POST /api/clans/:id/visit → 401');
  r = await req('POST', '/api/clans/1/unvisit');
  assert(r.status === 401, 'POST /api/clans/:id/unvisit → 401');
  r = await req('POST', '/api/clans/import', { data: 'x', format: 'csv' });
  assert(r.status === 401, 'POST /api/clans/import → 401');
  r = await req('GET', '/api/clans/export');
  assert(r.status === 401, 'GET /api/clans/export → 401');

  // ---------- Auth ----------
  console.log('\n── Authentication ──');
  r = await req('GET', '/api/auth/status');
  assert(r.status === 200 && r.data.authenticated === false, 'Status: not authenticated');

  r = await req('POST', '/api/auth/login', { username: 'wrong', password: 'wrong' });
  assert(r.status === 401, 'Bad username → 401');

  r = await req('POST', '/api/auth/login', { username: 'admin', password: 'wrongpw' });
  assert(r.status === 401, 'Bad password → 401');

  r = await req('POST', '/api/auth/login', { username: 'admin', password: 'testpass123' });
  assert(r.status === 200, 'Correct login → 200');
  assert(r.data.message === 'Login successful', 'Login success message');

  r = await req('GET', '/api/auth/status');
  assert(r.data.authenticated === true, 'Status: authenticated after login');

  // ---------- CRUD ----------
  console.log('\n── Clan CRUD ──');
  r = await req('GET', '/api/clans');
  assert(r.status === 200 && Array.isArray(r.data.clans), 'List clans returns array');

  r = await req('GET', '/api/clans/stats');
  assert(r.status === 200, 'Stats → 200');
  assert(typeof r.data.total === 'number' && typeof r.data.visited === 'number' && typeof r.data.remaining === 'number', 'Stats has total/visited/remaining');

  r = await req('POST', '/api/clans', { name: 'New Clan', tag: '#NEW01', notes: 'notes' });
  assert(r.status === 201, 'Create clan → 201');
  assert(r.data.clan.name === 'New Clan', 'Created clan has correct name');
  const newId = r.data.clan.id;

  r = await req('PUT', `/api/clans/${newId}`, { name: 'Edited Clan', tag: '#NEW01', notes: 'edited' });
  assert(r.status === 200 && r.data.clan.name === 'Edited Clan', 'Edit clan');

  r = await req('GET', '/api/clans/next-unvisited');
  assert(r.status === 200 && r.data.clan !== null, 'Next unvisited found');

  // ---------- Visit / Unvisit ----------
  console.log('\n── Visit/Unvisit ──');
  r = await req('POST', '/api/clans/2/visit');
  assert(r.status === 200 && r.data.clan.visited === true, 'Mark visited');

  r = await req('POST', '/api/clans/2/unvisit');
  assert(r.status === 200 && r.data.clan.visited === false, 'Unmark visited');

  r = await req('POST', '/api/clans/9999/visit');
  assert(r.status === 404, 'Visit non-existent → 404');

  // ---------- Input Validation ----------
  console.log('\n── Input Validation ──');
  r = await req('POST', '/api/clans', { name: '', tag: '' });
  assert(r.status === 400, 'Empty name → 400');
  r = await req('POST', '/api/clans', { name: 123 });
  assert(r.status === 400, 'Non-string name → 400');
  r = await req('PUT', '/api/clans/abc', { name: 'X' });
  assert(r.status === 400, 'Non-numeric id on PUT → 400');
  r = await req('PUT', '/api/clans/-1', { name: 'X' });
  assert(r.status === 400, 'Negative id on PUT → 400');
  r = await req('DELETE', '/api/clans/abc');
  assert(r.status === 400, 'Non-numeric id on DELETE → 400');

  // ---------- Duplicate Detection ----------
  console.log('\n── Duplicate Detection ──');
  r = await req('POST', '/api/clans', { name: 'Dupe', tag: '#DW9TH001' });
  assert(r.status === 409, 'Duplicate tag → 409');

  // ---------- Import ----------
  console.log('\n── Import ──');
  const csv = 'name,tag,notes\nClan A,#IMP01,note1\nClan B,#IMP02,note2\n,#IMP03,no-name';
  r = await req('POST', '/api/clans/import', { data: csv, format: 'csv', confirm: false });
  assert(r.status === 200, 'CSV preview → 200');
  assert(r.data.totalDetected === 3, 'Detected 3 rows');
  assert(r.data.valid.length === 2, '2 valid rows');
  assert(r.data.invalid.length === 1, '1 invalid row');

  const pipe = 'Pipe A | #PIPE01 | notes\nPipe B | #PIPE02';
  r = await req('POST', '/api/clans/import', { data: pipe, format: 'pipe', confirm: false });
  assert(r.status === 200 && r.data.valid.length === 2, 'Pipe preview: 2 valid');

  r = await req('POST', '/api/clans/import', { data: csv, format: 'csv', confirm: true });
  assert(r.status === 200 && typeof r.data.imported === 'number', 'Import confirm');

  r = await req('POST', '/api/clans/import', { data: '', format: 'csv', confirm: false });
  assert(r.status === 400, 'Empty data → 400');
  r = await req('POST', '/api/clans/import', { data: 'x', format: 'xml', confirm: false });
  assert(r.status === 400, 'Invalid format → 400');

  const big = 'x'.repeat(1_100_000);
  r = await req('POST', '/api/clans/import', { data: big, format: 'csv', confirm: false });
  assert(r.status === 400, 'Oversized → 400');

  // ---------- Export ----------
  console.log('\n── Export ──');
  r = await req('GET', '/api/clans/export');
  assert(r.status === 200, 'Export → 200');
  assert(r.headers['content-type']?.includes('text/csv'), 'CSV content-type');
  assert(r.raw.includes('name,tag'), 'CSV headers present');

  // ---------- Search / Filter / Sort ----------
  console.log('\n── Search & Filter ──');
  r = await req('GET', '/api/clans?search=dragon');
  assert(r.status === 200, 'Search → 200');
  r = await req('GET', '/api/clans?filter=visited');
  assert(r.status === 200, 'filter=visited → 200');
  r = await req('GET', '/api/clans?filter=unvisited');
  assert(r.status === 200, 'filter=unvisited → 200');
  r = await req('GET', '/api/clans?sort=name');
  assert(r.status === 200, 'sort=name → 200');
  r = await req('GET', '/api/clans?sort=recent');
  assert(r.status === 200, 'sort=recent → 200');
  r = await req('GET', '/api/clans?sort=lastVisited');
  assert(r.status === 200, 'sort=lastVisited → 200');
  r = await req('GET', '/api/clans?sort=invalid');
  assert(r.status === 200, 'Invalid sort falls back → 200');

  // ---------- Delete ----------
  console.log('\n── Delete ──');
  r = await req('DELETE', `/api/clans/${newId}`);
  assert(r.status === 200 && r.data.message === 'Clan deleted', 'Delete clan');
  r = await req('DELETE', '/api/clans/9999');
  assert(r.status === 404, 'Delete non-existent → 404');

  // ---------- Security Headers ----------
  console.log('\n── Security Headers ──');
  r = await req('GET', '/api/auth/status');
  assert(r.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options');
  assert(!!r.headers['content-security-policy'], 'Content-Security-Policy');
  assert(!!r.headers['referrer-policy'], 'Referrer-Policy');

  // ---------- Logout ----------
  console.log('\n── Logout ──');
  r = await req('POST', '/api/auth/logout');
  assert(r.status === 200, 'Logout → 200');
  r = await req('GET', '/api/clans');
  assert(r.status === 401, 'Clans → 401 after logout');

  // ---------- Summary ----------
  console.log('\n' + '═'.repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed}\n`);
  if (failed > 0) { console.log('❌ Some tests failed!\n'); process.exit(1); }
  else { console.log('✅ All tests passed!\n'); process.exit(0); }
}

// Give server a moment to bind
setTimeout(runTests, 1500);
