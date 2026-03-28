const OpenAI = require('openai');
const personality = require('../config/personality');

class OpenAIService {
    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.tools = [
            {
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
            },
            {
                type: "function",
                function: {
                    name: "guardar_lore",
                    description: "Guarda información importante sobre un integrante del grupo.",
                    parameters: {
                        type: "object",
                        properties: {
                            dato: { type: "string", description: "Dato relevante." },
                            integrante: { type: "string", description: "Nombre del integrante." }
                        },
                        required: ["dato", "integrante"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "evolucionar_identidad",
                    description: "Anota un cambio en tu propia personalidad o comportamiento.",
                    parameters: {
                        type: "object",
                        properties: {
                            leccion: { type: "string", description: "Lección aprendida sobre ti mismo." }
                        },
                        required: ["leccion"]
                    }
                }
            }
        ];
    }

    async getResponse(prompt, media = null, loreContext = "", selfIdentity = "") {
        try {
            console.log("🤖 [OpenAIService] Procesando petición con Identidad Evolutiva...");
            
            const userContent = [{ type: "text", text: prompt }];
            if (media && media.inlineData) {
                userContent.push({
                    type: "image_url",
                    image_url: { url: `data:${media.inlineData.mimeType};base64,${media.inlineData.data}` }
                });
            }

            const systemContent = `
${personality.instructions}

REGLA CRÍTICA: Si el usuario te pide una imagen o dibujo, DEBES llamar a la función 'generar_imagen' inmediatamente. No des explicaciones de que lo vas a hacer, solo ejecuta la función.

TU IDENTIDAD ACTUALIZADA:
${selfIdentity || "Aún no has evolucionado."}

MEMORIA DEL GRUPO:
${loreContext || "No hay lore."}
            `.trim();

            const response = await this.client.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemContent },
                    { role: 'user', content: userContent }
                ],
                tools: this.tools,
                tool_choice: "auto",
                temperature: 0.8
            });

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
            console.error("❌ [OpenAIService] ERROR:", error.message);
            throw error;
        }
    }
}

module.exports = new OpenAIService();
