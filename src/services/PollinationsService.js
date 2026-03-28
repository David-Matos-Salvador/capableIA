const { MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const ImageService = require('./ImageService');

class PollinationsService extends ImageService {
    async generateImageUrl(prompt) {
        console.log(`🎨 Generando imagen gratuita (Pollinations) para: ${prompt}`);
        
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
        
        try {
            // Descargamos la imagen como buffer usando axios para mayor fiabilidad
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            const mimetype = response.headers['content-type'] || 'image/png';

            return new MessageMedia(mimetype, base64, 'imagen.png');
        } catch (error) {
            console.error("❌ [PollinationsService] Error descargando imagen:", error.message);
            throw error; // Re-lanzamos para que el handler lo capture
        }
    }
}

module.exports = new PollinationsService();
