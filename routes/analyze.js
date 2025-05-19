// routes/analyze.js
import express   from 'express';
import multer    from 'multer';
import fs        from 'fs/promises';
import sharp     from 'sharp';          // <-- новая зависимость
import { OpenAI } from 'openai';
import dotenv    from 'dotenv';

dotenv.config();

const router  = express.Router();
const upload  = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },      // ≤ 5 MB
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Принимаются только изображения'));
  },
});

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL_ID = process.env.MODEL_ID || 'gpt-4o';    // <-- через .env

// ──────────────────────────────────────────────
router.post('/', upload.single('handImage'), async (req, res) => {
  const tempPath = req.file?.path;
  if (!tempPath)
    return res.status(400).json({ error: 'Файл не получен' });

  try {
    /* ------------------------------------------------------------------
       1. Быстрая «эй, это вообще ладонь?» проверка
          – вычисляем «skin-tone entropy»: изображение > 300 px по ширине
          – если слишком тёмное / слишком маленькое => просим перезалить
    ------------------------------------------------------------------ */
    const { width, height } = await sharp(tempPath).metadata();
    if (!width || width < 300)
      throw new Error(
        'Фото слишком маленькое или неудачное — попробуйте ближе и при хорошем освещении.'
      );

    const imageBase64 = (await fs.readFile(tempPath)).toString('base64');

    /* ------------------------------------------------------------------
       2. Генерируем промпт (можно будет переключать «бесплатный/платный»)
    ------------------------------------------------------------------ */
    const isPaid = req.body.plan === 'paid';          // <-- фронт передаст
    const systemPrompt = isPaid
      ? await fs.readFile('prompts/paid.txt', 'utf8')
      : await fs.readFile('prompts/free.txt', 'utf8');

    const userPrompt = isPaid
      ? 'Проанализируй ладонь максимально подробно, не менее 2500 символов.'
      : 'Дай короткий, до 400 символов, культурно-исторический комментарий.';

    /* ------------------------------------------------------------------ */
    const chat = await openai.chat.completions.create({
      model: MODEL_ID,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' },
            },
          ],
        },
      ],
      max_tokens: isPaid ? 4096 : 512,      // ограничим токены для free
    });

    res.json({ result: chat.choices?.[0]?.message?.content ?? '' });
  } catch (err) {
    console.error('❌ Analyze error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    tempPath && fs.unlink(tempPath).catch(() => {});
  }
});

export default router;
