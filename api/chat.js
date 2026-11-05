// Vercel serverless function: POST /api/chat
// Keeps the Anthropic API key server-side. The browser never sees it.

const SYSTEM_PROMPT = require('../data/knowledge.js');

// Very small in-memory rate limiter. Resets on cold start, so it's a soft
// speed bump against casual abuse, not a real defense — fine for a portfolio.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function rateLimited(ip) {
  const now = Date.now();
  const record = hits.get(ip) || { count: 0, start: now };
  if (now - record.start > WINDOW_MS) {
    record.count = 0;
    record.start = now;
  }
  record.count += 1;
  hits.set(ip, record);
  return record.count > MAX_PER_WINDOW;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'Too many messages — wait a minute and try again.' });
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Missing messages array.' });
    return;
  }

  // Cap history so a long chat can't balloon token spend.
  const trimmed = messages.slice(-16).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 2000),
  }));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in this Vercel environment.');
    res.status(503).json({ error: 'The assistant is unavailable right now.' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        // Sonnet 5 thinks by default; thinking tokens count toward max_tokens,
        // so leave headroom and keep effort low for short chat replies.
        max_tokens: 1024,
        output_config: { effort: 'low' },
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      // Check Vercel > Logs for this line: 401 = bad key, 400 with "credit balance" = billing, 429 = rate limit.
      console.error(`Anthropic API error ${response.status}:`, errText);
      res.status(502).json({ error: 'The assistant is unavailable right now.' });
      return;
    }

    const data = await response.json();
    const reply = data.content?.find((b) => b.type === 'text')?.text
      || 'Sorry, I lost my train of thought. Could you ask that again?';
    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};
