module.exports = function(app) {
    var Response = require('../lib/httpResponse');
    var acl = require('../lib/auth').acl;
    var ai = require('../lib/ai');

    // Health check
    app.get("/api/ai/health", acl.hasPermission('ai:read'), async function(req, res) {
        try {
            const health = await ai.healthCheck();
            Response.Ok(res, health);
        }
        catch (error) {
            Response.Internal(res, error);
        }
    });

    // Get available models
    app.get("/api/ai/models", acl.hasPermission('ai:read'), async function(req, res) {
        try {
            const models = await ai.listModels();
            Response.Ok(res, models);
        }
        catch (error) {
            Response.Internal(res, error);
        }
    });

    // Generate text
    app.post("/api/ai/generate", acl.hasPermission('ai:write'), async function(req, res) {
        try {
            console.log('Received request:', req.body);
            const { task, prompt, text, options = {} } = req.body;
            
            if (!task) {
                throw new Error('Task is required');
            }

            // Format the prompt based on the task
            const formattedPrompt = ai.formatPrompt(task, {
                prompt,
                text
            });
            console.log('Formatted prompt:', formattedPrompt);

            // if the client requests streaming
            if (req.headers.accept === 'text/event-stream') {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                // send the chunks
                for await (const chunk of ai.generateStream(formattedPrompt, options)) {
                    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                }
                res.write('data: [DONE]\n\n');
                res.end();
            } else {
                // else return the full response
                const response = await ai.generate(formattedPrompt, options);
                console.log('Generated response:', response);
                Response.Ok(res, { response });
            }
        }
        catch (error) {
            console.error('AI generation error:', error);
            Response.Internal(res, error);
        }
    });
};
