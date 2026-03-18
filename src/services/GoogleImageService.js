const ImageService = require('./ImageService');
const { PredictionServiceClient, helpers } = require('@google-cloud/aiplatform');

class GoogleImageService extends ImageService {
    constructor() {
        super();
        this.project = process.env.GOOGLE_PROJECT_ID;
        this.location = process.env.GOOGLE_LOCATION || 'us-central1';
        this.publisher = 'google';
        this.model = 'imagen-3.0-generate-001'; // Puedes cambiarlo a 'imagen-3.0-fast-generate-001'

        this.endpoint = `projects/${this.project}/locations/${this.location}/publishers/${this.publisher}/models/${this.model}`;

        this.client = new PredictionServiceClient({
            apiEndpoint: `${this.location}-aiplatform.googleapis.com`,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS // Ruta al archivo .json de tu cuenta de servicio
        });
    }

    async generateImageUrl(prompt) {
        console.log(`🎨 Generando imagen con Google Imagen 3: ${prompt}`);

        const instance = { prompt: prompt };
        const instanceValue = helpers.toValue(instance);
        const instances = [instanceValue];

        const parameter = {
            sampleCount: 1,
            aspectRatio: "1:1" // Otras opciones: "9:16", "16:9", "4:3", "3:4"
        };
        const parameters = helpers.toValue(parameter);

        const request = {
            endpoint: this.endpoint,
            instances,
            parameters,
        };

        try {
            const [response] = await this.client.predict(request);
            const prediction = helpers.fromValue(response.predictions[0]);

            if (prediction.bytesBase64Encoded) {
                // Vertex AI devuelve la imagen en Base64.
                // Para que WhatsApp la procese, devolvemos el data uri o el buffer.
                return `data:image/png;base64,${prediction.bytesBase64Encoded}`;
            }
            throw new Error("No se recibió una imagen válida de Vertex AI");
        } catch (error) {
            console.error('Error en Google Imagen 3:', error);
            throw error;
        }
    }
}

module.exports = new GoogleImageService();
