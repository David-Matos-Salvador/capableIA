require('dotenv').config({ override: true });
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const MessageHandler = require('./src/handlers/MessageHandler');
const WhatsAppProvider = require('./src/core/WhatsAppProvider');
const { runSetup } = require('./src/config/setup');
const { validateEnvironment } = require('./src/config/validator');
const fs = require('fs');
const path = require('path');

async function bootstrap() {
    console.log('[DEBUG] 🚀 Iniciando bootstrap...');
    
    // Verificar sesión previa
    const authPath = path.join('.wwebjs_auth', 'session');
    if (fs.existsSync(authPath)) {
        console.log('[DEBUG] 📁 Sesión previa encontrada en:', authPath);
        console.log('[DEBUG] 📝 Contenido:', fs.readdirSync(authPath).slice(0, 10).join(', '), '...');
    } else {
        console.log('[DEBUG] 📁 No hay sesión previa');
    }
    
    // Setup wizard (solo en TTY)
    if (process.stdin.isTTY) {
        console.log('[DEBUG] 🖥️  TTY detectado, ejecutando setup...');
        await runSetup();
        // Recargar .env por si el wizard escribió nuevas variables
        require('dotenv').config({ override: true });
    } else {
        console.log('[DEBUG] 🖥️  No TTY, saltando setup wizard');
    }

    // Validación de entorno
    console.log('[DEBUG] 🔍 Validando entorno...');
    validateEnvironment();
    console.log('[DEBUG] ✅ Entorno validado');

    // Servicios
    const { selectAIProvider } = require('./src/services/providerSelector');
    const aiService = selectAIProvider();
    const imageService = require('./src/services/PollinationsService');

    console.log('[DEBUG] 🤖 Creando cliente WhatsApp...');
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
    console.log('[DEBUG] ✅ Cliente creado');

    const whatsapp = new WhatsAppProvider(waClient);
    const messageHandler = new MessageHandler(aiService, imageService);

    waClient.on('qr', (qr) => {
        console.log('[DEBUG] 📱 Evento QR recibido!');
        console.log('--- ESCANEA ESTE CÓDIGO QR ---');
        qrcode.generate(qr, { small: true });
    });
    
    waClient.on('loading_screen', (percent, message) => {
        console.log(`[DEBUG] ⏳ Loading: ${percent}% - ${message}`);
    });
    
    waClient.on('authenticated', () => {
        console.log('[DEBUG] ✅ Cliente autenticado!');
    });
    
    waClient.on('auth_failure', (msg) => {
        console.error('[DEBUG] ❌ Error de autenticación:', msg);
    });
    
    waClient.on('disconnected', (reason) => {
        console.log('[DEBUG] ⚠️ Desconectado:', reason);
    });

    waClient.on('ready', () => {
        console.log('[DEBUG] ✅ Cliente ready!');
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

    console.log('[DEBUG] 🚀 Llamando a waClient.initialize()...');
    
    // Capturar errores no manejados
    waClient.on('error', (err) => {
        console.error('[DEBUG] ❌ Error en cliente:', err);
    });
    
    try {
        await waClient.initialize();
        console.log('[DEBUG] ✅ Initialize completado');
    } catch (err) {
        console.error('[DEBUG] ❌ Error en initialize:', err);
    }
}

bootstrap();
