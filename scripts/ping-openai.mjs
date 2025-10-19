/*
 Minimal OpenAI ping (cost-safe):
 - Uses 1 short request to verify API key works in current env.
 - Model and endpoint can be adjusted later.
*/

const KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

if (!KEY) {
  console.error('OPENAI_API_KEY is not set');
  process.exit(2);
}

async function main() {
  const url = `${BASE_URL}/chat/completions`;
  const body = {
    model: 'gpt-5',
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 4,
    temperature: 0
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('OpenAI ping failed:', res.status, text);
    process.exit(1);
  }

  const json = await res.json();
  const choice = json.choices?.[0]?.message?.content ?? '';
  console.log(JSON.stringify({ ok: true, status: res.status, model: json.model, reply: choice }));
}

main().catch((e) => {
  console.error('OpenAI ping error:', e);
  process.exit(1);
});


