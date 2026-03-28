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
        console.log('📦 [MessageHandler] Reiniciado con arquitectura de Managers y Caché.');
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
            const chatId = chat.id._serialized;

            console.log(`🔍 [MessageHandler] Chat ID: ${chatId}, ¿Es grupo?: ${chat.isGroup}`);
            if (!chat.isGroup) {
                console.log('⚠️ [MessageHandler] Ignorado: No es grupo.');
                return;
            }

            // Lógica de Menciones
            const info = whatsapp.info;
            const botNumber = info.wid.user;
            const mentions = await msg.getMentions();
            const isMentionedOfficially = mentions.some(c => c.id._serialized === info.wid._serialized);
            const isMentionedInText = msg.body.includes(botNumber);
            
            console.log(`🔔 [MessageHandler] ¿Mencionado?: ${isMentionedOfficially || isMentionedInText}`);

            // Inicialización
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
        
        if (this.groupHistory[chatId].length >= MAX_HISTORY_LIMIT) {
            // MEJORA 1: Extracción asíncrona en segundo plano (No bloquea el chat)
            loreManager.extractProactiveLore(chatId, [...this.groupHistory[chatId]], this.ai);
            this.groupHistory[chatId] = this.groupHistory[chatId].slice(-15);
        }
        
        persistence.save('history', this.groupHistory);
    }

    async _initializeGroup(chatId, msg, whatsapp) {
        if (!this.initializedGroups.has(chatId)) {
            this.initializedGroups.add(chatId);
            persistence.save('groups', this.initializedGroups);
            await whatsapp.sendText(chatId, '✅ Bot CapableIA activado con Identidad Evolutiva.');
            console.log(`✅ [MessageHandler] Grupo ${chatId} inicializado.`);
        }
    }

    async _respond(chat, msg, chatId, whatsapp) {
        console.log('🤖 [MessageHandler] Entrando en _respond...');
        try {
            await chat.sendStateTyping();

            let userPrompt = msg.body.replace(/@\d+/g, '').trim();
            console.log('📝 [MessageHandler] Prompt enviado:', userPrompt);

            let quotedContext = "";
            let mediaInput = null;

            // Manejo de Multimedia y Quotes
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

            // MEJORA 2: Uso de CACHÉ para identidad y búsqueda de LORE
            const loreContext = await loreManager.searchRelevantLore(userPrompt);
            const selfIdentity = await identityManager.getIdentity();

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

Instrucción: Usa todo este contexto para responder. Si detectas información importante sobre un integrante (lore), usa guardar_lore. Si has aprendido algo sobre ti mismo o quieres evolucionar tu personalidad, usa evolucionar_identidad. Si piden una imagen, usa generar_imagen.`;

            const result = await this.ai.getResponse(finalPrompt, mediaInput, loreContext, selfIdentity);
            console.log('📩 [MessageHandler] IA respondió.');
            
            const candidate = result.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            const functionCall = parts.find(p => p.functionCall)?.functionCall;

            if (functionCall) {
                // Herramienta: Guardar Lore
                if (functionCall.name === "guardar_lore") {
                    const { dato, integrante } = functionCall.args;
                    await loreManager.saveManualLore(integrante, dato);
                    console.log(`📝 [Lore] Dato guardado para ${integrante}`);
                } 
                // Herramienta: Evolucionar Identidad
                else if (functionCall.name === "evolucionar_identidad") {
                    const { leccion } = functionCall.args;
                    await identityManager.evolve(leccion); // Esto limpia el caché automáticamente
                }
                // Herramienta: Generar Imagen
                else if (functionCall.name === "generar_imagen") {
                    const imageUrl = await this.imageGenerator.generateImageUrl(functionCall.args.prompt);
                    const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
                    await whatsapp.sendImage(chatId, media, `🎨 ${functionCall.args.prompt}`);
                }
                
                // Enviar texto acompañante si existe
                const text = parts.find(p => p.text)?.text;
                if (text) await whatsapp.sendText(chatId, text);
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
