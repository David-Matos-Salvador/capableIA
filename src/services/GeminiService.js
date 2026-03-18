const { GoogleGenAI } = require('@google/genai');

class GeminiService {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("❌ ERROR: GEMINI_API_KEY no está definida.");
        }
        
        this.client = new GoogleGenAI({ 
            apiKey: apiKey,
            authType: 'api_key' 
        });
        
        this.tools = [{
            functionDeclarations: [{
                name: "generar_imagen",
                description: "Genera una imagen basada en una descripción detallada.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        prompt: { type: "STRING", description: "Descripción detallada en español." }
                    },
                    required: ["prompt"]
                }
            }]
        }];
    }

    async getResponse(prompt, media = null) {
        try {
            const contents = [{
                role: 'user',
                parts: media ? [{ text: prompt }, media] : [{ text: prompt }]
            }];

            const response = await this.client.models.generateContent({
                model: 'models/gemini-2.0-flash',
                contents: contents,
                config: {
                    tools: this.tools,
                    systemInstruction: "Eres un bot de WhatsApp profesional. Si el usuario te pide una imagen o dibujo, usa la herramienta generar_imagen.",
                    toolConfig: {
                        functionCallingConfig: { mode: "AUTO" }
                    }
                }
            });

            return response;
        } catch (error) {
            console.error("❌ Error en GeminiService:", error.message);
            throw error;
        }
    }
}

module.exports = new GeminiService();
