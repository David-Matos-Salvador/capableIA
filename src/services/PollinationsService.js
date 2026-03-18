const ImageService = require('./ImageService');

class PollinationsService extends ImageService {
    async generateImageUrl(prompt) {
        console.log(`🎨 Generando imagen gratuita (Pollinations) para: ${prompt}`);
        // Retornamos la URL directa de Pollinations
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    }
}

module.exports = new PollinationsService();
