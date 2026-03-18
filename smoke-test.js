require('dotenv').config();
const aiService = require('./src/services/OpenAIService');
const imageService = require('./src/services/PollinationsService');
const persistence = require('./src/services/PersistenceService');
const fs = require('fs');

async function runSmokeTest() {
    console.log("🔥 INICIANDO SMOKE TEST - CAPABLE IA (OPENAI) 🔥\n");
    let healthCheck = true;

    // 1. Validar Variables de Entorno
    console.log("📋 [1/4] Verificando Configuración...");
    if (!process.env.OPENAI_API_KEY) {
        console.log(`❌ ERROR: OPENAI_API_KEY no encontrada.`);
        healthCheck = false;
    } else {
        console.log(`✅ OPENAI_API_KEY configurada.`);
    }

    // 2. Validar Persistencia
    console.log("\n💾 [2/4] Verificando Sistema de Archivos...");
    try {
        const testData = { test: true };
        persistence.save('smoke_test', testData);
        if (persistence.load('smoke_test').test) {
            console.log("✅ Persistencia operativa.");
            if (fs.existsSync('./smoke_test.json')) fs.unlinkSync('./smoke_test.json');
        }
    } catch (e) {
        console.log("❌ ERROR: Persistencia ->", e.message);
        healthCheck = false;
    }

    // 3. Validar IA (Texto)
    console.log("\n🧠 [3/4] Verificando Inteligencia Artificial (Texto)...");
    try {
        const result = await aiService.getResponse("Hola, responde solo con la palabra 'CONECTADO'.");
        const text = result.candidates[0].content.parts[0].text;

        if (text && text.includes('CONECTADO')) {
            console.log("✅ IA respondiendo correctamente.");
        } else {
            console.log("❌ ERROR: La IA respondió algo inesperado.");
            healthCheck = false;
        }
    } catch (e) {
        console.log("❌ ERROR CRÍTICO IA:", e.message);
        healthCheck = false;
    }

    // 4. Validar IA + Herramientas (Imagen)
    console.log("\n🎨 [4/4] Verificando Detección de Herramientas (Imagen)...");
    try {
        const result = await aiService.getResponse("Genera una imagen de un amanecer.");
        const call = result.candidates[0].content.parts[0].functionCall;

        if (call && call.name === "generar_imagen") {
            console.log("✅ Detección de Function Calling operativa.");
            const url = await imageService.generateImageUrl(call.args.prompt);
            if (url.startsWith('http')) console.log("✅ Generador de imágenes operativo.");
        } else {
            console.log("❌ ERROR: La IA no activó la herramienta de imagen.");
            healthCheck = false;
        }
    } catch (e) {
        console.log("❌ ERROR EN HERRAMIENTAS:", e.message);
        healthCheck = false;
    }

    process.exit(healthCheck ? 0 : 1);
}

runSmokeTest();
