const { MessageMedia } = require('whatsapp-web.js');
const persistence = require('../services/PersistenceService');
const vector = require('../services/VectorService');

const INIT_PHRASE = 'init ia';
const MAX_HISTORY_LIMIT = 200;

class MessageHandler {
    constructor(aiService, imageService) {
        this.ai = aiService;
        this.imageGenerator = imageService;
        this.initializedGroups = persistence.load('groups');
        this.groupHistory = persistence.load('history');
        this.groupSummaries = persistence.load('summaries');
        console.log('📦 [MessageHandler] Inicializado con identidad evolutiva.');
    }

    async handle(msg, whatsapp) {
        try {
            if (msg.from === 'status@broadcast') return;

            const chat = await msg.getChat();
            const contact = await msg.getContact();
            const chatId = chat.id._serialized;

            if (!chat.isGroup) return;

            const info = whatsapp.info;
            const botNumber = info.wid.user;
            const mentions = await msg.getMentions();

            const isMentionedOfficially = mentions.some(c => c.id._serialized === info.wid._serialized);
            const isMentionedInText = msg.body.includes(botNumber);
            const isReplyToMe = msg.hasQuotedMsg ? (await msg.getQuotedMessage()).fromMe : false;

            if (msg.body.toLowerCase().includes(INIT_PHRASE)) {
                return this._initializeGroup(chatId, msg, whatsapp);
            }

            if (this.initializedGroups.has(chatId)) {
                this._recordMessage(chatId, contact, msg.body);
                if (isMentionedOfficially || isMentionedInText || isReplyToMe) {
                    await this._respond(chat, msg, chatId, whatsapp);
                }
            }
        } catch (error) {
            console.error('❌ [MessageHandler] Error en handle:', error);
        }
    }

    _recordMessage(chatId, contact, content) {
        if (!this.groupHistory[chatId]) this.groupHistory[chatId] = [];
        this.groupHistory[chatId].push({ role: contact.pushname || contact.number, content: content, timestamp: Date.now() });
        if (this.groupHistory[chatId].length >= MAX_HISTORY_LIMIT) {
            this._summarizeAndExtractLore(chatId);
        }
        persistence.save('history', this.groupHistory);
    }

    async _summarizeAndExtractLore(chatId) {
        console.log(`🧠 [MessageHandler] Procesando resumen y lore automático...`);
        const history = this.groupHistory[chatId];
        const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');

        const prompt = `Analiza estos mensajes y extrae Lore sobre los integrantes en JSON: {"resumen": "...", "lore": [{"integrante": "...", "dato": "..."}]}. Historial:\n${historyText}`;

        try {
            const result = await this.ai.getResponse(prompt);
            const textResponse = result.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                if (data.resumen) {
                    this.groupSummaries[chatId] = data.resumen;
                    persistence.save('summaries', this.groupSummaries);
                }
                if (data.lore) {
                    for (const item of data.lore) {
                        await vector.upsertLore(null, `${item.integrante}: ${item.dato}`, { type: 'auto-lore' });
                    }
                }
            }
            this.groupHistory[chatId] = this.groupHistory[chatId].slice(-15);
            persistence.save('history', this.groupHistory);
        } catch (e) { console.error("Error en resumen automático:", e.message); }
    }

    async _initializeGroup(chatId, msg, whatsapp) {
        if (!this.initializedGroups.has(chatId)) {
            this.initializedGroups.add(chatId);
            persistence.save('groups', this.initializedGroups);
            await whatsapp.sendText(chatId, '✅ Bot CapableIA activado con Identidad Evolutiva.');
        }
    }

    async _respond(chat, msg, chatId, whatsapp) {
        try {
            await chat.sendStateTyping();

            let userPrompt = msg.body.replace(/@\d+/g, '').trim();
            let quotedContext = "";
            let mediaInput = null;

            if (msg.hasQuotedMsg) {
                const q = await msg.getQuotedMessage();
                quotedContext = `MENSAJE CITADO: "${q.body}"`;
                if (q.hasMedia) {
                    const m = await q.downloadMedia();
                    if (m.mimetype.startsWith('image/')) mediaInput = { inlineData: { data: m.data, mimeType: m.mimetype } };
                }
            }

            if (msg.hasMedia) {
                const m = await msg.downloadMedia();
                if (m.mimetype.startsWith('image/')) mediaInput = { inlineData: { data: m.data, mimeType: m.mimetype } };
            }

            // 1. CONSULTAR LORE DEL GRUPO + SU PROPIA IDENTIDAD
            const loreContext = await vector.queryLore(userPrompt);
            const selfIdentity = await vector.queryLore("¿Quién soy yo? ¿Cómo debo comportarme?", 2); // Busca su evolución

            const currentSummary = this.groupSummaries[chatId] || "";
            const history = this.groupHistory[chatId] || [];
            const recentMessages = history.slice(-15).map(m => `${m.role}: ${m.content}`).join('\n');

            const finalPrompt = `CONTEXTO: ${currentSummary}\nRECIENTE:\n${recentMessages}\n${quotedContext}\nUSUARIO: ${userPrompt}`;

            const result = await this.ai.getResponse(finalPrompt, mediaInput, loreContext, selfIdentity);
            
            const candidate = result.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            const functionCall = parts.find(p => p.functionCall)?.functionCall;

            if (functionCall) {
                // A: GUARDAR LORE
                if (functionCall.name === "guardar_lore") {
                    const { dato, integrante } = functionCall.args;
                    await vector.upsertLore(null, `${integrante}: ${dato}`, { type: 'lore', author: integrante });
                    const text = parts.find(p => p.text)?.text;
                    if (text) await whatsapp.sendText(chatId, text);
                } 
                // B: EVOLUCIONAR IDENTIDAD
                else if (functionCall.name === "evolucionar_identidad") {
                    const { leccion } = functionCall.args;
                    await vector.upsertLore(null, `Lección de identidad: ${leccion}`, { type: 'self-identity' });
                    console.log(`🧠 [Evolución] Yoshi ha aprendido: ${leccion}`);
                    const text = parts.find(p => p.text)?.text;
                    if (text) await whatsapp.sendText(chatId, text);
                }
                // C: GENERAR IMAGEN
                else if (functionCall.name === "generar_imagen") {
                    const imageUrl = await this.imageGenerator.generateImageUrl(functionCall.args.prompt);
                    const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
                    await whatsapp.sendImage(chatId, media, `🎨 ${functionCall.args.prompt}`);
                }
            } else {
                const text = parts.find(p => p.text)?.text;
                if (text) await whatsapp.sendText(chatId, text);
            }
            await chat.clearState();
        } catch (error) {
            console.error('❌ [MessageHandler] Error en _respond:', error);
        }
    }
}

module.exports = MessageHandler;
