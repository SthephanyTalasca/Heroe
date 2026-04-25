export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no Vercel.' });
  }

  const prompt = req.body?.prompt?.trim();
  const systemInstruction = req.body?.systemInstruction?.trim();

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt é obrigatório.' });
  }

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: {
      parts: [{ text: systemInstruction || 'Você é um assistente útil.' }]
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          tasks: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                title: { type: 'STRING' },
                term: { type: 'STRING', enum: ['short', 'weekly', 'medium', 'long'] },
                xp: { type: 'INTEGER' }
              },
              required: ['id', 'title', 'term', 'xp']
            }
          }
        },
        required: ['title', 'description', 'tasks']
      }
    }
  };

  try {
    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      return res
        .status(geminiRes.status)
        .json({ error: err?.error?.message || 'Erro na API Gemini.' });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: 'Resposta vazia da Gemini.' });
    }

    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Erro interno no servidor.' });
  }
}
