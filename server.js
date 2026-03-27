// ─────────────────────────────────────────────────────────
//  BizDiagnostic — Express Server
//
//  HOW TO RUN LOCALLY:
//    1. npm install
//    2. Copy .env.example → .env  and fill in your keys
//    3. node server.js
//    4. Open http://localhost:3000
// ─────────────────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const mysql   = require('mysql2/promise');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Serve frontend from /public ───────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── MySQL connection pool ─────────────────────────────────
const db = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'biz_diagnostic',
  waitForConnections: true,
  connectionLimit:    10
});

db.getConnection()
  .then(conn => { console.log('✅  MySQL connected'); conn.release(); })
  .catch(err  => console.error('❌  MySQL connection failed:', err.message));

// ── POST /api/analyze ─────────────────────────────────────
app.post('/api/analyze', async (req, res) => {

  const { prompt, scores, answers } = req.body;

  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY || OPENAI_KEY.startsWith('sk-your')) {
    return res.status(500).json({ error: 'Add your OPENAI_API_KEY in the .env file' });
  }

  // ── Call OpenAI GPT ───────────────────────────────────
  let gptOutput;
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model:           'gpt-4o-mini',
        temperature:     0.35,
        max_tokens:      1200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role:    'system',
            content: 'You are a precise senior business consultant. Return valid JSON only. No markdown, no code blocks, no extra text.'
          },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI error:', openaiRes.status, errText);
      return res.status(502).json({ error: 'OpenAI error ' + openaiRes.status });
    }

    const data = await openaiRes.json();
    const raw  = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty OpenAI response');
    gptOutput = JSON.parse(raw);

  } catch (err) {
    console.error('GPT call failed:', err.message);
    return res.status(502).json({ error: err.message });
  }

  // ── Save to MySQL ─────────────────────────────────────
  let submissionId = null;

  if (scores && answers) {
    const avg = Math.round(
      Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length
    );

    try {
      const [result] = await db.execute(
        `INSERT INTO submissions
          (company_name, industry, business_age, business_type, team_size,
           score_operations, score_finance, score_marketing, score_digital,
           score_ai_readiness, score_average, overall_rating,
           gpt_output, raw_answers)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          answers.companyName    || null,
          answers.industry       || null,
          answers.age            || null,
          answers.btype          || null,
          answers.teamSize       || null,
          scores.operations      ?? null,
          scores.finance         ?? null,
          scores.marketing       ?? null,
          scores.digitalPresence ?? null,
          scores.aiReadiness     ?? null,
          avg,
          gptOutput.overallRating || null,
          JSON.stringify(gptOutput),
          JSON.stringify(answers)
        ]
      );

      submissionId = result.insertId;
      console.log('✅ Saved to DB — row ID:', submissionId,
                  '|', answers.companyName, '|', gptOutput.overallRating);

    } catch (err) {
      console.error('MySQL save failed (non-fatal):', err.message);
    }
  }

  return res.json({ ...gptOutput, submissionId });
});

// ── POST /api/save-phone ──────────────────────────────────
app.post('/api/save-phone', async (req, res) => {

  const { submissionId, phone } = req.body;

  if (!submissionId || !phone) {
    return res.status(400).json({ error: 'Missing submissionId or phone' });
  }

  try {
    await db.execute(
      'UPDATE submissions SET phone_number = ? WHERE id = ?',
      [phone, submissionId]
    );
    console.log('✅ Phone saved — row:', submissionId, '→', phone);
    return res.json({ ok: true });

  } catch (err) {
    console.error('Phone save failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ✅  BizDiagnostic server running');
  console.log(`  👉  http://localhost:${PORT}`);
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
