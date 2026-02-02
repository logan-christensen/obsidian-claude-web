const https = require('https');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const apiKey = event.headers['x-api-key'];
    if (!apiKey) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing x-api-key header' }) };
    }

    const anthropicVersion = event.headers['anthropic-version'] || '2023-06-01';

    return new Promise((resolve) => {
        const postData = event.body;

        const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': anthropicVersion,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: { 'Content-Type': 'application/json' },
                    body: data
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                statusCode: 502,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to reach Anthropic API', details: error.message })
            });
        });

        req.write(postData);
        req.end();
    });
};
