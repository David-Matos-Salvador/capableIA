const { MessageMedia } = require('whatsapp-web.js');
const persistence = require('../services/PersistenceService');

const INIT_PHRASE = 'init ia';
const MAX_HISTORY_LIMIT = 200;

class MessageHandler {
    constructor(aiService, imageService) {
        this.ai = aiService;
        this.imageGenerator = imageService;
        this.initializedGroups = persistence.load('groups');
        this.groupHistory = persistence.load('history');
        this.groupSummaries = persistence.load('summaries');
        console.log('📦 [MessageHandler] Inicializado. Grupos registrados:', this.initializedGroups.size);
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
            const mentions = await msg.getMentions()
            const chatId = chat.id._serialized;

            console.log(`🔍 [MessageHandler] Chat ID: ${chatId}, ¿Es grupo?: ${chat.isGroup}`);
            if (!chat.isGroup) {
                console.log('⚠️ [MessageHandler] Ignorado: No es grupo.');
                return;
            }

            const info = whatsapp.info;
            const botNumber = info.wid.user;

            const isMentionedOfficially = mentions.some(contact =>
                contact.id._serialized === info.wid._serialized
            );

            const isMentionedInText = msg.body.includes(botNumber);
            console.log(`🔔 [MessageHandler] ¿Mencionado?: ${isMentionedOfficially || isMentionedInText}`);

            const bodyLower = msg.body.toLowerCase();
            if (bodyLower.includes(INIT_PHRASE)) {
                console.log('🚀 [MessageHandler] Comando init detectado.');
                return this._initializeGroup(chatId, msg, whatsapp);
            }

            const isReplyToMe = msg.hasQuotedMsg ? (await msg.getQuotedMessage()).fromMe : false;
            console.log(`💬 [MessageHandler] ¿Respuesta al bot?: ${isReplyToMe}`);

            if (this.initializedGroups.has(chatId)) {
                this._recordMessage(chatId, contact, msg.body);

                if (isMentionedOfficially || isMentionedInText || isReplyToMe) {
                    console.log('🤖 [MessageHandler] Condición cumplida. Llamando a _respond...');
                    await this._respond(chat, msg, chatId, whatsapp);
                } else {
                    console.log('💤 [MessageHandler] Grupo inicializado pero sin mención directa.');
                }
            } else {
                console.log('ℹ️ [MessageHandler] Grupo no inicializado.');
            }

        } catch (error) {
            console.error('❌ [MessageHandler] Error en handle:', error);
        }
    }

    _recordMessage(chatId, contact, content) {
        console.log(`💾 [MessageHandler] Guardando mensaje de ${contact.pushname}`);
        if (!this.groupHistory[chatId]) this.groupHistory[chatId] = [];
        this.groupHistory[chatId].push({ role: contact.pushname || contact.number, content: content, timestamp: Date.now() });
        
        // Mantener solo los últimos 200 mensajes
        if (this.groupHistory[chatId].length > MAX_HISTORY_LIMIT) {
            this.groupHistory[chatId].shift();
        }
        
        persistence.save('history', this.groupHistory);
    }

    async _initializeGroup(chatId, msg, whatsapp) {
        if (!this.initializedGroups.has(chatId)) {
            this.initializedGroups.add(chatId);
            persistence.save('groups', this.initializedGroups);
            await whatsapp.sendText(chatId, '✅ Bot CapableIA activado.');
            console.log(`✅ [MessageHandler] Grupo ${chatId} inicializado.`);
        }
    }

    async _respond(chat, msg, chatId, whatsapp) {
        console.log('🤖 [MessageHandler] Entrando en _respond...');
        try {
            await chat.sendStateTyping();

            let userPrompt = msg.body.replace(/@\d+/g, '').trim();
            let quotedContext = "";
            let mediaInput = null;

            // 1. Detectar si el usuario cita un mensaje
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                quotedContext = `MENSAJE CITADO: "${quotedMsg.body}"`;
                
                // Si el mensaje citado tiene imagen, la procesamos
                if (quotedMsg.hasMedia) {
                    const media = await quotedMsg.downloadMedia();
                    if (media.mimetype.startsWith('image/')) {
                        mediaInput = { inlineData: { data: media.data, mimeType: media.mimetype } };
                        quotedContext += " [EL MENSAJE CITADO CONTIENE UNA IMAGEN]";
                    }
                }
            }

            // 2. Si el mensaje actual tiene su propia imagen, prevalece
            if (msg.hasMedia) {
                const media = await msg.downloadMedia();
                if (media.mimetype.startsWith('image/')) {
                    mediaInput = { inlineData: { data: media.data, mimeType: media.mimetype } };
                }
            }

            const currentSummary = this.groupSummaries[chatId] || "Sin resumen previo.";
            const history = this.groupHistory[chatId] || [];
            const recentMessages = history.slice(-15).map(m => `${m.role}: ${m.content}`).join('\n');

            const finalPrompt = `
CONTEXTO DE LA CONVERSACIÓN:
${currentSummary}

ÚLTIMOS MENSAJES:
${recentMessages}

${quotedContext}

USUARIO: ${userPrompt}

Instrucción: Usa todo este contexto para responder. Si se pide una imagen, usa generar_imagen.`;

            console.log('📝 [MessageHandler] Prompt enviado a IA con contexto de cita.');

            const result = await this.ai.getResponse(finalPrompt, mediaInput);
            console.log('📩 [MessageHandler] IA respondió.');

            const candidate = result.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            const functionCall = parts.find(p => p.functionCall);

            if (functionCall) {
                console.log('🎨 [MessageHandler] IA quiere generar imagen.');
                const imageUrl = await this.imageGenerator.generateImageUrl(functionCall.functionCall.args.prompt);
                const media = await MessageMedia.fromUrl(imageUrl);
                await whatsapp.sendImage(chatId, media, `🎨 ${functionCall.functionCall.args.prompt}`);
            } else {
                const text = parts.find(p => p.text)?.text;
                if (text) {
                    console.log('💬 [MessageHandler] Enviando respuesta texto...');
                    await whatsapp.sendText(chatId, text);
                }
            }
            await chat.clearState();
        } catch (error) {
            console.error('❌ [MessageHandler] Error en _respond:', error);
        }
    }
}

module.exports = MessageHandler;
