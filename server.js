// server.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const analyzeRoute = require('./routes/analyze');

const app = express();

// Статические файлы из public
app.use(express.static('public'));

// Роут для анализа ладони
app.use('/analyze', analyzeRoute);

// Корневая страница (форма)
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🔮 Хиромантия онлайн на http://localhost:${PORT}`)
);
