const OpenAI = require('openai');
const personality = require('../config/personality');

class DeepSeekService {
    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseURL: 'https://api.deepseek.com'
        });

        if (!process.env.OPENAI_API_KEY) {
            console.warn("⚠️ [DeepSeek] OPENAI_API_KEY no encontrada. El análisis de imágenes (visión) NO estará disponible. Para activarlo, agrega OPENAI_API_KEY en .env");
        }

        this.tools = [
            {
                type: "function",
                function: {
                    name: "generar_imagen",
                    description: "Genera una imagen basada en una descripción detallada proporcionada por el usuario.",
                    parameters: {
                        type: "object",
                        properties: { prompt: { type: "string" } },
                        required: ["prompt"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "guardar_lore",
                    description: "Guarda información importante sobre un integrante.",
                    parameters: {
                        type: "object",
                        properties: { integrante: { type: "string" }, dato: { type: "string" } },
                        required: ["integrante", "dato"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "evolucionar_identidad",
                    description: "Anota un cambio en tu propia personalidad.",
                    parameters: {
                        type: "object",
                        properties: { leccion: { type: "string" } },
                        required: ["leccion"]
                    }
                }
            }
        ];
    }

    async _getOrchestration(prompt) {
        try {
            console.log("🧠 [Orquestador DeepSeek] Analizando intención...");
            const response = await this.client.chat.completions.create({
                model: 'deepseek-chat',
                messages: [{
                    role: 'system',
                    content: `Analiza el mensaje y devuelve un JSON:
                    {
                        "intent": "chacota" | "sabio" | "imagen",
                        "temperature": 0.0 a 1.0,
                        "max_tokens": 50 a 800,
                        "force_tool": boolean,
                        "style_guide": "Instrucción de estilo"
                    }
                    REGLAS:
                    - Si el usuario da una orden directa de formato (ej: "responde solo OK"), usa intent="sabio", temp=0.0 y style_guide="Cumple EXACTAMENTE lo que pidió el usuario".
                    - Si pide dibujo: intent="imagen", force_tool=true.`
                }, { role: 'user', content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0
            });
            return JSON.parse(response.choices[0].message.content);
        } catch (e) {
            console.warn("⚠️ [Orquestador DeepSeek] Error, usando defaults:", e.message);
            return { intent: "chacota", temperature: 0.8, max_tokens: 200, force_tool: false, style_guide: "Yoshi." };
        }
    }

    async getResponse(prompt, media = null, loreContext = "", selfIdentity = "") {
        try {
            const config = await this._getOrchestration(prompt);
            console.log(`🎯 [Orquestador DeepSeek] Modo: ${config.intent.toUpperCase()}`);

            const userContent = [{ type: "text", text: prompt }];
            if (media && media.inlineData) {
                console.log("⚠️ [DeepSeek] DeepSeek no soporta visión. La imagen no será analizada. Para análisis de imágenes, usa OPENAI_API_KEY.");
            }

            const systemContent = `
${personality.instructions}
GUÍA DE ESTILO ACTUAL: ${config.style_guide}
IDENTIDAD: ${selfIdentity || "N/A"}
LORE: ${loreContext || "N/A"}
REGLA: Si piden imagen, DEBES usar generar_imagen.`.trim();

            const response = await this.client.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemContent },
                    { role: 'user', content: userContent }
                ],
                tools: this.tools,
                tool_choice: config.force_tool ? { type: "function", function: { name: "generar_imagen" } } : "auto",
                temperature: config.temperature,
                max_tokens: config.max_tokens
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
            console.error("❌ ERROR DeepSeek:", error.message);
            throw error;
        }
    }

    async getImageTags(media) {
        return "Imagen";
    }
}

module.exports = new DeepSeekService();
