module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            error: 'MISTRAL_API_KEY non configurata. Aggiungila nelle Environment Variables di Vercel.'
        });
    }

    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array richiesto' });
    }

    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
                messages,
                max_tokens: 1024,
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.message || data.error?.message || 'Errore Mistral API'
            });
        }

        const reply = data.choices?.[0]?.message?.content;
        if (!reply) {
            return res.status(502).json({ error: 'Risposta vuota da Mistral' });
        }

        return res.status(200).json({ reply });
    } catch (error) {
        console.error('Mistral proxy error:', error);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};
