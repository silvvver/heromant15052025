// routes/analyze.js
const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const { OpenAI } = require('openai');
require('dotenv').config();

const router  = express.Router();
const upload  = multer({ dest: 'uploads/' });
const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL_ID = 'gpt-4o-2024-05-13'; // или 'gpt-4o', если твой ключ поддерживает

router.post('/', upload.single('handImage'), async (req, res) => {
  try {
    const style      = req.body.style || 'ted';
    const imagePath  = req.file?.path;
    if (!imagePath) return res.status(400).json({ error: 'Файл не получен' });

    const imageBase64 = fs.readFileSync(imagePath, 'base64');

    // Самый развёрнутый systemPrompt и userPrompt
    const systemPrompt = `
Ты — искусственный интеллект, который даёт культурно-историческую интерпретацию линий ладони.
Не делаешь медицинских или биометрических выводов, не идентифицируешь личность.
Работаешь в выбранном стиле:
• ted  → юмор 90-х, цыган-шоу
• professor → академический тон
• buzova → эмоционально, как шоу-дивa.
Дай развёрнутый анализ по 10 пунктам (линии жизни, головы, сердца, судьбы, здоровья, брака, кольцо Солнца, бугры, форма ладони/пальцев, итог).`;

    const userPrompt = `
Проанализируй ладонь по всем пунктам, расскажи образно, без предсказаний судьбы.
Минимум 2500 символов.
    `;

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
              image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'low' }
            }
          ]
        }
      ],
      max_tokens: 4096
    });

    const result = chat.choices?.[0]?.message?.content || '';

    res.json({ result: result || '⚠️ GPT вернул пустой ответ.' });
  } catch (err) {
    console.error('❌ Ошибка анализа:', err.message);
    res.status(500).json({ error: 'Ошибка при анализе изображения' });
  } finally {
    if (req.file?.path) fs.rm(req.file.path, () => {});
  }
});

module.exports = router;
