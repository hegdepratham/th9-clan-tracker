'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string' || username.length > 100 || password.length > 100) {
      return res.status(400).json({ error: 'Invalid username or password format' });
    }

    const adminUser = process.env.ADMIN_USERNAME || '';
    const adminPassHash = process.env.ADMIN_PASSWORD_HASH || '';

    if (username.toLowerCase() !== adminUser.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, adminPassHash);
    
    if (match) {
      req.session.authenticated = true;
      req.session.username = username;
      return res.json({ message: 'Login successful', username });
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  try {
    req.session.destroy();
    res.clearCookie('sid');
    return res.json({ message: 'Logout successful' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', (req, res) => {
  try {
    return res.json({
      authenticated: !!req.session?.authenticated,
      username: req.session?.username || null
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
