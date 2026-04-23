require('dotenv').config({ override: true });
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const MessageHandler = require('./src/handlers/MessageHandler');
const WhatsAppProvider = require('./src/core/WhatsAppProvider');
const { runSetup } = require('./src/config/setup');
const { validateEnvironment } = require('./src/config/validator');

async function bootstrap() {
    // Setup wizard (solo en TTY)
    if (process.stdin.isTTY) {
        await runSetup();
        // Recargar .env por si el wizard escribió nuevas variables
        require('dotenv').config({ override: true });
    }

    // Validación de entorno
    validateEnvironment();

    // Servicios
    const { selectAIProvider } = require('./src/services/providerSelector');
    const aiService = selectAIProvider();
    const imageService = require('./src/services/PollinationsService');

    const waClient = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-extensions',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

    const whatsapp = new WhatsAppProvider(waClient);
    const messageHandler = new MessageHandler(aiService, imageService);

    waClient.on('qr', (qr) => {
        console.log('--- ESCANEA ESTE CÓDIGO QR ---');
        qrcode.generate(qr, { small: true });
    });

    waClient.on('ready', () => {
        console.log('¡Bot CapableIA Listo!');
    });

    waClient.on('message', async (msg) => {
        await messageHandler.handle(msg, whatsapp);
    });

    const gracefulShutdown = async (signal) => {
        console.log(`\n🛑 Recibido ${signal}. Cerrando bot de forma segura...`);
        try {
            await waClient.destroy();
            console.log('✅ Navegador y sesión cerrados correctamente.');
        } catch (err) {
            console.error('❌ Error al cerrar el bot:', err);
        }
        process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    waClient.on('auth_failure', (msg) => console.error('❌ Error de autenticación:', msg));
    waClient.on('disconnected', (reason) => console.log('⚠️ El bot fue desconectado:', reason));

    waClient.initialize();
}

bootstrap();
