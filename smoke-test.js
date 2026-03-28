// Limpiar memoria antes de cargar .env
delete process.env.OPENAI_API_KEY;
delete process.env.PINECONE_API_KEY;
delete process.env.PINECONE_INDEX;

require('dotenv').config({ override: true });
const aiService = require('./src/services/OpenAIService');
const imageService = require('./src/services/PollinationsService');
const persistence = require('./src/services/PersistenceService');
const vector = require('./src/services/VectorService');
const fs = require('fs');

async function runSmokeTest() {
    console.log("🔥 INICIANDO SMOKE TEST COMPLETO - CAPABLE IA (FORCE CLEAN) 🔥\n");
    let healthCheck = true;

    // 1. Validar Variables de Entorno
    console.log("📋 [1/5] Verificando Configuración...");
    const requiredEnv = ['OPENAI_API_KEY', 'PINECONE_API_KEY', 'PINECONE_INDEX'];
    
    // Log de diagnóstico (seguro)
    console.log(`   - OPENAI_API_KEY detectada: ${process.env.OPENAI_API_KEY ? 'SÍ' : 'NO'} (Longitud: ${process.env.OPENAI_API_KEY?.length})`);

    requiredEnv.forEach(env => {
        if (!process.env[env]) {
            console.log(`❌ ERROR: Variable ${env} no encontrada.`);
            healthCheck = false;
        } else {
            console.log(`✅ ${env} cargada.`);
        }
    });

    // 2. Validar Persistencia Local
    console.log("\n💾 [2/5] Verificando Sistema de Archivos Local...");
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

    // 3. Validar Pinecone (Vector DB)
    console.log("\n🌲 [3/5] Verificando Pinecone (Memoria Vectorial)...");
    try {
        const testLore = `Test de humo para Pinecone - ${Date.now()}`;
        console.log("   - Intentando upsert...");
        const upsertSuccess = await vector.upsertLore('smoke-test-id', testLore, { type: 'test' });
        
        if (upsertSuccess) {
            console.log("   - Upsert exitoso. Intentando búsqueda...");
            const results = await vector.queryLore("Test de humo", 1);
            if (results) {
                console.log("✅ Pinecone operativo.");
            } else {
                console.log("⚠️ Pinecone conectado, pero búsqueda sin resultados inmediatos.");
            }
        } else {
            console.log("❌ ERROR: Upsert fallido.");
            healthCheck = false;
        }
    } catch (e) {
        console.log("❌ ERROR CRÍTICO PINECONE:", e.message);
        healthCheck = false;
    }

    // 4. Validar IA (Texto)
    console.log("\n🧠 [4/5] Verificando IA (Texto)...");
    try {
        const result = await aiService.getResponse("Hola, responde 'OK'.");
        const text = result.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;

        if (text && text.includes('OK')) {
            console.log("✅ OpenAI respondiendo.");
        } else {
            console.log("❌ ERROR: Respuesta inesperada.");
            healthCheck = false;
        }
    } catch (e) {
        console.log("❌ ERROR CRÍTICO IA:", e.message);
        healthCheck = false;
    }

    // 5. Validar Herramientas (Imagen)
    console.log("\n🎨 [5/5] Verificando Herramientas (Imagen)...");
    try {
        const result = await aiService.getResponse("Genera un dibujo.");
        const parts = result.candidates?.[0]?.content?.parts || [];
        const functionCall = parts.find(p => p.functionCall);

        if (functionCall) {
            console.log("✅ Function Calling operativo.");
        } else {
            console.log("❌ ERROR: No se activó la herramienta.");
            healthCheck = false;
        }
    } catch (e) {
        console.log("❌ ERROR EN HERRAMIENTAS:", e.message);
        healthCheck = false;
    }

    console.log("\n" + "=".repeat(40));
    process.exit(healthCheck ? 0 : 1);
}

runSmokeTest();
