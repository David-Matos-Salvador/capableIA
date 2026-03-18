class WhatsAppProvider {
    constructor(client) {
        this.client = client;
    }

    // Método para enviar texto (Abstracción)
    async sendText(chatId, text, options = {}) {
        return this.client.sendMessage(chatId, text, options);
    }

    // Método para enviar imágenes (Abstracción)
    async sendImage(chatId, media, caption) {
        return this.client.sendMessage(chatId, media, { caption });
    }

    // Método para obtener el chat (Abstracción)
    async getChat(chatId) {
        return this.client.getChatById(chatId);
    }

    // Atajo para acceder a la info del cliente si es necesario
    get info() {
        return this.client.info;
    }
}

module.exports = WhatsAppProvider;
