const OpenAI = require('openai');

class OpenAIService {
    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.tools = [{
            type: "function",
            function: {
                name: "generar_imagen",
                description: "Genera una imagen basada en una descripción detallada.",
                parameters: {
                    type: "object",
                    properties: {
                        prompt: { type: "string", description: "Descripción detallada en español." }
                    },
                    required: ["prompt"]
                }
            }
        }];
    }

    async getResponse(prompt, media = null) {
        try {
            console.log("🤖 [OpenAIService] Enviando prompt y media a OpenAI...");
            
            // Construir el contenido compatible con OpenAI (texto + imagen)
            const content = [{ type: "text", text: prompt }];

            // Si hay media, la añadimos en el formato de datos de OpenAI
            if (media && media.inlineData) {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${media.inlineData.mimeType};base64,${media.inlineData.data}`,
                        detail: "high"
                    }
                });
            }

            const messages = [{ role: 'user', content: content }];
            
            const response = await this.client.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                tools: this.tools,
                tool_choice: "auto"
            });

            console.log("✅ [OpenAIService] Respuesta recibida de OpenAI");
            const choice = response.choices[0];
            const toolCall = choice.message.tool_calls?.[0];

            return {
                candidates: [{
                    content: {
                        parts: [{
                            text: choice.message.content,
                            functionCall: toolCall ? {
                                name: toolCall.function.name,
                                args: JSON.parse(toolCall.function.arguments)
                            } : null
                        }]
                    }
                }]
            };
        } catch (error) {
            console.error("❌ [OpenAIService] ERROR en llamada a API:", error.message);
            if (error.response) console.error("Detalle:", error.response.data);
            throw error;
        }
    }
}

module.exports = new OpenAIService();
