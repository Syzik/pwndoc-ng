const axios = require('axios');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-coder:14b';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT) || 30000;

const client = axios.create({
    baseURL: OLLAMA_HOST,
    timeout: OLLAMA_TIMEOUT
});

// check if the service is healthy
async function healthCheck() {
    try {
        const tags = await client.get('/api/tags');
        return {
            status: 'ok',
            models: tags.data
        };
    } catch (error) {
        throw new Error(`Failed to check health: ${error.message}`);
    }
}

// List available models
async function listModels() {
    try {
        const tags = await client.get('/api/tags');
        return tags.data;
    } catch (error) {
        throw new Error(`Failed to list models: ${error.message}`);
    }
}

// Generate text with the model
async function* generateStream(prompt, options = {}) {
    try {
        const response = await client.post('/api/generate', {
            model: OLLAMA_MODEL,
            prompt,
            options: {
                temperature: options.temperature || 0.7,
                top_p: options.top_p || 0.9
            }
        }, {
            responseType: 'text'
        });

        // Process response line by line
        const lines = response.data.split('\n');
        for (const line of lines) {
            if (line.trim()) {
                const chunk = JSON.parse(line);
                if (chunk.response) {
                    yield chunk.response;
                }
            }
        }
    } catch (error) {
        throw new Error(`Failed to generate text: ${error.message}`);
    }
}

async function generate(prompt, options = {}) {
    try {
        let fullResponse = '';
        for await (const chunk of generateStream(prompt, options)) {
            fullResponse += chunk;
        }
        return fullResponse.trim();
    } catch (error) {
        throw new Error(`Failed to generate text: ${error.message}`);
    }
}

// Format a prompt for a specific task
function formatPrompt(task, context = {}) {
    switch (task) {
        case 'rephrase':
            return `rephrase : ${context.text || ''}`;
        case 'custom':
            return `${context.prompt || ''}${context.text ? '\nYou are a security expertRespond in the same sense and language as the text provided here : ' + context.text : ''}`;
        
        default:
            return context.text || '';
    }
}

module.exports = {
    healthCheck,
    generate,
    listModels,
    formatPrompt,
    generateStream
};
