// server.js
import express        from 'express';
import path           from 'path';
import cors           from 'cors';
import helmet         from 'helmet';
import rateLimit      from 'express-rate-limit';
import morgan         from 'morgan';
import dotenv         from 'dotenv';

dotenv.config();

import analyzeRoute   from './routes/analyze.js';

const app   = express();
const __dir = path.resolve();

// ──────────────────────────────────────────────
// 1)  HTTP-заголовки «по умолчанию безопасные»
app.use(helmet());

// 2)  Логи запросов  (потом пригодится для статистики)
app.use(morgan('combined'));

// 3)  CORS: в .env задаём допустимые origin-ы
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    methods: ['GET', 'POST'],
  })
);

// 4)  Rate-limit — 30 запросов с одного IP за 15 минут
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// 5)  Статика
app.use(express.static('public'));

// 6)  API-роут
app.use('/analyze', analyzeRoute);

// 7)  Fallback на index.html
app.get('/', (_req, res) =>
  res.sendFile(path.join(__dir, 'public', 'index.html'))
);

// ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🔮  Backend online  →  http://localhost:${PORT}`)
);
