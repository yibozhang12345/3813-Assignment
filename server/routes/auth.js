const express = require('express');
const router = express.Router();
const getDb = require('../db/mongoClient');

router.post('/register', async (req, res) => {
  const db = await getDb();
  const users = db.collection('users');

  const { username, password, email } = req.body;
  const exists = await users.findOne({ username });
  if (exists) return res.status(400).json({ error: 'User already exists' });

  await users.insertOne({
    username,
    password,
    email,
    roles: ['user'],
    groups: []
  });

  res.json({ message: 'Registered successfully' });
});

router.post('/login', async (req, res) => {
  const db = await getDb();
  const users = db.collection('users');

  const { username, password } = req.body;
  const user = await users.findOne({ username, password });

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ message: 'Login successful', user });
});

module.exports = router;
