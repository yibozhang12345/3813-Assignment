const express = require('express');
const cors = require('cors');
const app = express();

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', groupRoutes);

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
