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
                    description: "Guarda información importante sobre un integrante del grupo (gustos, anécdotas, datos clave).",
                    parameters: {
                        type: "object",
                        properties: {
                            dato: { type: "string", description: "La información relevante a guardar de forma clara y concisa." },
                            integrante: { type: "string", description: "Nombre o apodo del integrante." }
                        },
                        required: ["dato", "integrante"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "evolucionar_identidad",
                    description: "Permite que el bot anote un cambio en su propia personalidad, una lección aprendida o un ajuste en su comportamiento basado en la charla actual.",
                    parameters: {
                        type: "object",
                        properties: {
                            leccion: { type: "string", description: "Descripción del cambio o lección sobre sí mismo." }
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

            // Inyectamos: Personalidad Base + Lore del Grupo + Su propia Evolución
            const systemContent = `
                ${personality.instructions}
                
                TU IDENTIDAD ACTUALIZADA (LECCIONES SOBRE TI MISMO):
                ${selfIdentity || "Aún no has tenido evoluciones significativas."}

                MEMORIA SEMÁNTICA DEL GRUPO (LORE):
                ${loreContext || "No hay lore relevante."}
            `.trim();

            const messages = [
                { role: 'system', content: systemContent },
                { role: 'user', content: userContent }
            ];
            
            const response = await this.client.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                tools: this.tools,
                tool_choice: "auto",
                temperature: 0.8,
                max_tokens: 500
            });

            const choice = response.choices[0];
            const toolCalls = choice.message.tool_calls;

            return {
                candidates: [{
                    content: {
                        parts: [{
                            text: choice.message.content,
                            functionCall: toolCalls ? {
                                name: toolCalls[0].function.name,
                                args: JSON.parse(toolCalls[0].function.arguments)
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
