// Cloudflare Worker: reasoning layer for josephvoelbel.com/ai-resume
//
// The widget already does keyword retrieval client-side (tokenize + scoreEntry
// against data/resume-qa.json) and sends its top-N matches here as context.
// This Worker's only job is: given a question and a handful of resume-bank
// entries, ask Claude Haiku to reason a real answer grounded ONLY in that
// context, or say plainly that the resume doesn't cover it. It never sees
// the full resume bank and never answers from outside the provided context.
//
// Required bindings (see wrangler.toml / README.md for setup):
//   - KV namespace  AI_RESUME_KV        (rate limiting + daily cost cap)
//   - secret        ANTHROPIC_API_KEY   (wrangler secret put, never in code)
//   - var           ANTHROPIC_MODEL     (see README for how to reverify this)

const ALLOWED_ORIGINS = new Set([
  'https://josephvoelbel.com',
  'https://www.josephvoelbel.com',
]);

const RATE_LIMIT_PER_10_MIN = 5;
const DAILY_CALL_CEILING = 500;
const MAX_QUESTION_LENGTH = 500;
const MAX_CONTEXT_ENTRIES = 5;

const SYSTEM_PROMPT =
  "You are Joseph Voelbel's resume assistant. Answer the visitor's question " +
  'using ONLY the provided context entries about Joseph. Reason across them ' +
  'to answer the actual question asked, do not just repeat one entry ' +
  "verbatim. If the context does not support an answer, say plainly that " +
  "Joseph's resume doesn't cover that yet, and suggest what it does cover. " +
  "Third person ('Joseph built...'). Concise, factual, no invented " +
  'specifics.';

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const originAllowed = ALLOWED_ORIGINS.has(origin);
    const corsHeaders = originAllowed
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/chat' || request.method !== 'POST') {
      return json({ error: 'not found' }, 404, corsHeaders);
    }

    if (!originAllowed) {
      return json({ error: 'origin not allowed' }, 403, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'invalid JSON body' }, 400, corsHeaders);
    }

    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const context = Array.isArray(body.context) ? body.context : [];

    if (!question || question.length > MAX_QUESTION_LENGTH) {
      return json({ error: 'question missing or too long' }, 400, corsHeaders);
    }
    if (context.length === 0) {
      return json({ error: 'context required' }, 400, corsHeaders);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // --- per-IP rate limit: RATE_LIMIT_PER_10_MIN requests / rolling-ish 10 min bucket ---
    // NOTE: this is a plain KV read-then-write counter, not atomic. Two
    // requests from the same IP in the same 10-minute bucket can both read
    // the same count before either writes, letting the limit slip by a
    // request or two under real concurrency. That's an accepted tradeoff at
    // personal-resume-site traffic levels. If this ever needs to be exact,
    // move it to a Durable Object or Cloudflare's native Rate Limiting rules
    // instead of hand-rolled KV counting.
    const rlBucket = Math.floor(Date.now() / (10 * 60 * 1000));
    const rlKey = `rl_${ip}_${rlBucket}`;
    const rlCount = parseInt((await env.AI_RESUME_KV.get(rlKey)) || '0', 10);
    if (rlCount >= RATE_LIMIT_PER_10_MIN) {
      return json(
        { answer: 'Slow down, try again in a few minutes.' },
        429,
        corsHeaders
      );
    }
    ctx.waitUntil(
      env.AI_RESUME_KV.put(rlKey, String(rlCount + 1), { expirationTtl: 700 })
    );

    // --- global daily ceiling: bounds the Anthropic bill no matter what ---
    const dayKey = `daily_${new Date().toISOString().slice(0, 10)}`;
    const dayCount = parseInt((await env.AI_RESUME_KV.get(dayKey)) || '0', 10);
    if (dayCount >= DAILY_CALL_CEILING) {
      // Deliberately status 200: this is a normal answer to show the
      // visitor, not a client error, and the widget just renders it.
      return json(
        {
          answer:
            "Joseph's resume assistant has hit its daily limit. Try again " +
            'tomorrow, or ask something that might already be answered on ' +
            'the page.',
        },
        200,
        corsHeaders
      );
    }
    ctx.waitUntil(
      env.AI_RESUME_KV.put(dayKey, String(dayCount + 1), { expirationTtl: 90000 })
    );

    // --- reason over the provided context with Claude Haiku ---
    const trimmedContext = context.slice(0, MAX_CONTEXT_ENTRIES);
    const contextText = trimmedContext
      .map((e, i) => `[${i + 1}] Q: ${e.question}\nA: ${e.answer}`)
      .join('\n\n');
    const userMessage = `Visitor question: ${question}\n\nContext entries from Joseph's resume bank:\n${contextText}`;

    let anthropicRes;
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 350,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
    } catch (e) {
      return json(
        { answer: "Couldn't reach the assistant. Try again in a moment." },
        502,
        corsHeaders
      );
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => '');
      console.error('Anthropic API error', anthropicRes.status, errText);
      return json(
        { answer: "Couldn't reach the assistant. Try again in a moment." },
        502,
        corsHeaders
      );
    }

    const data = await anthropicRes.json();
    const answer =
      (data.content && data.content[0] && data.content[0].text) ||
      "Couldn't reach the assistant. Try again in a moment.";

    return json({ answer }, 200, corsHeaders);
  },
};

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
