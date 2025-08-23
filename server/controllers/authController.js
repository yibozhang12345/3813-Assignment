const storage = require('../utils/storage');
let users = storage.load('users.json');

exports.login = (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  res.json(user);
};

exports.register = (req, res) => {
  const { username, password, email } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }
  const newUser = {
    id: Date.now().toString(),
    username, password, email,
    roles: ['user'], groups: []
  };
  users.push(newUser);
  storage.save('users.json', users);
  res.json(newUser);
};
