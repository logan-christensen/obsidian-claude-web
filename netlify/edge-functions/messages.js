export default async (req) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Missing x-api-key header' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.text();

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': req.headers.get('anthropic-version') || '2023-06-01'
            },
            body: body
        });

        return new Response(response.body, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('content-type') || 'application/json'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Failed to reach Anthropic API',
            details: error.message
        }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const config = {
    path: '/api/messages'
};
