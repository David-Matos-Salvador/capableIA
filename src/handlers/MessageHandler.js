const { MessageMedia } = require('whatsapp-web.js');
const persistence = require('../services/PersistenceService');
const loreManager = require('../managers/LoreManager');
const identityManager = require('../managers/IdentityManager');

const INIT_PHRASE = 'init ia';
const MAX_HISTORY_LIMIT = 200;

class MessageHandler {
    constructor(aiService, imageService) {
        this.ai = aiService;
        this.imageGenerator = imageService;
        this.initializedGroups = persistence.load('groups');
        this.groupHistory = persistence.load('history');
        this.groupSummaries = persistence.load('summaries');
        console.log('📦 [MessageHandler] Inicializado con arquitectura de Managers y Caché.');
    }

    async handle(msg, whatsapp) {
        console.log(`🔍 [MessageHandler] handle() llamado. Mensaje: "${msg.body}"`);
        try {
            if (msg.from === 'status@broadcast') {
                console.log('👻 [MessageHandler] Ignorado: Es un estado de WhatsApp.');
                return;
            }

            const chat = await msg.getChat();
            const contact = await msg.getContact();
            const mentions = await msg.getMentions();
            const chatId = chat.id._serialized;

            if (!chat.isGroup) {
                console.log('⚠️ [MessageHandler] Ignorado: No es grupo.');
                return;
            }

            const info = whatsapp.info;
            const botNumber = info.wid.user;
            const isMentionedOfficially = mentions.some(c => c.id._serialized === info.wid._serialized);
            const isMentionedInText = msg.body.includes(botNumber);
            
            const bodyLower = msg.body.toLowerCase();
            if (bodyLower.includes(INIT_PHRASE)) {
                return this._initializeGroup(chatId, msg, whatsapp);
            }

            const isReplyToMe = msg.hasQuotedMsg ? (await msg.getQuotedMessage()).fromMe : false;

            if (this.initializedGroups.has(chatId)) {
                // MEJORA: Guardar mensaje en historial (incluyendo detección de imagen)
                await this._recordMessage(chatId, contact, msg);

                if (isMentionedOfficially || isMentionedInText || isReplyToMe) {
                    await this._respond(chat, msg, chatId, whatsapp);
                }
            }
        } catch (error) {
            console.error('❌ [MessageHandler] Error en handle:', error);
        }
    }

    async _recordMessage(chatId, contact, msg) {
        if (!this.groupHistory[chatId]) this.groupHistory[chatId] = [];
        
        let content = msg.body;

        // Si el mensaje es una imagen, extraemos palabras clave para el historial
        if (msg.hasMedia && !msg.body) {
            try {
                console.log(`📸 [MessageHandler] Imagen detectada de ${contact.pushname}. Extrayendo tags...`);
                const media = await msg.downloadMedia();
                if (media.mimetype.startsWith('image/')) {
                    const tags = await this.ai.getImageTags({
                        data: media.data,
                        mimetype: media.mimetype
                    });
                    content = `[Imagen: ${tags}]`;
                }
            } catch (e) {
                content = `[Imagen]`;
            }
        } else if (msg.hasMedia && msg.body) {
            content = `[Imagen] ${msg.body}`;
        }

        this.groupHistory[chatId].push({ 
            role: contact.pushname || contact.number, 
            content: content, 
            timestamp: Date.now() 
        });
        
        if (this.groupHistory[chatId].length >= MAX_HISTORY_LIMIT) {
            loreManager.extractProactiveLore(chatId, [...this.groupHistory[chatId]], this.ai);
            this.groupHistory[chatId] = this.groupHistory[chatId].slice(-15);
        }
        
        persistence.save('history', this.groupHistory);
    }

    async _initializeGroup(chatId, msg, whatsapp) {
        if (!this.initializedGroups.has(chatId)) {
            this.initializedGroups.add(chatId);
            persistence.save('groups', this.initializedGroups);
            await whatsapp.sendText(chatId, '✅ Bot CapableIA activado.');
        }
    }

    async _sendHumanLike(chatId, text, whatsapp) {
        const parts = text.split('\n').filter(p => p.trim().length > 0);
        for (const part of parts) {
            const delay = Math.floor(Math.random() * 1000) + 500;
            await new Promise(resolve => setTimeout(resolve, delay));
            await whatsapp.sendText(chatId, part.trim());
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
                    if (m.mimetype?.startsWith('image/')) {
                        mediaInput = { inlineData: { data: m.data, mimeType: m.mimetype } };
                        quotedContext += " [EL MENSAJE CITADO CONTIENE UNA IMAGEN]";
                    }
                }
            }
            if (msg.hasMedia) {
                const m = await msg.downloadMedia();
                if (m.mimetype?.startsWith('image/')) {
                    mediaInput = { inlineData: { data: m.data, mimeType: m.mimetype } };
                }
            }

            const loreContext = await loreManager.searchRelevantLore(userPrompt);
            const selfIdentity = await identityManager.getIdentity();

            const currentSummary = this.groupSummaries[chatId] || "Sin resumen previo.";
            const history = this.groupHistory[chatId] || [];
            const recentMessages = history.slice(-15).map(m => `${m.role}: ${m.content}`).join('\n');

            const finalPrompt = `
Contexto de la conversación hasta ahora:
${currentSummary}

Últimos mensajes del grupo:
${recentMessages}
${quotedContext ? '\n' + quotedContext : ''}

Ahora responde a: "${userPrompt}"

(Internamente puedes usar guardar_lore, evolucionar_identidad o generar_imagen si aplica. Pero tu respuesta debe sonar natural, como si hablaras en el grupo.)`;

            const result = await this.ai.getResponse(finalPrompt, mediaInput, loreContext, selfIdentity);
            
            const candidate = result.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            const functionCall = parts.find(p => p.functionCall)?.functionCall;

            if (functionCall) {
                if (functionCall.name === "guardar_lore") {
                    const { dato, integrante } = functionCall.args;
                    await loreManager.saveManualLore(integrante, dato);
                    const text = parts.find(p => p.text)?.text;
                    if (text) await whatsapp.sendText(chatId, text);
                } 
                else if (functionCall.name === "evolucionar_identidad") {
                    const { leccion } = functionCall.args;
                    await identityManager.evolve(leccion);
                    const text = parts.find(p => p.text)?.text;
                    if (text) await whatsapp.sendText(chatId, text);
                }
                else if (functionCall.name === "generar_imagen") {
                    try {
                        const media = await this.imageGenerator.generateImageUrl(functionCall.args.prompt);
                        await whatsapp.sendImage(chatId, media, `🎨 ${functionCall.args.prompt}`);
                    } catch (e) {
                        console.error("❌ Error enviando imagen:", e.message);
                        await whatsapp.sendText(chatId, "No pude enviarte la imagen, causa. Intenta de nuevo.");
                    }
                }
            } else {
                const text = parts.find(p => p.text)?.text;
                if (text) {
                    await this._sendHumanLike(chatId, text, whatsapp);
                }
            }
            await chat.clearState();
        } catch (error) {
            console.error('❌ [MessageHandler] Error en _respond:', error);
        }
    }
}

module.exports = MessageHandler;
