const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '../data');

exports.load = (file) => {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

exports.save = (file, data) => {
  const filePath = path.join(dataDir, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};
