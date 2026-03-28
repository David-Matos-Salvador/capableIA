const vector = require('../services/VectorService');
const persistence = require('../services/PersistenceService');

class LoreManager {
    /**
     * Procesa la extracción de lore de forma asíncrona (Background)
     */
    async extractProactiveLore(chatId, history, aiService) {
        console.log(`🧠 [LoreManager] Iniciando extracción proactiva en segundo plano para ${chatId}...`);
        
        const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
        const prompt = `Analiza estos mensajes y extrae Lore sobre los integrantes en JSON: {"resumen": "...", "lore": [{"integrante": "...", "dato": "..."}]}. Historial:\n${historyText}`;

        // No usamos await aquí en el flujo principal, se ejecuta "detrás"
        this._runExtraction(chatId, prompt, aiService).catch(err => 
            console.error("❌ [LoreManager] Fallo en background extraction:", err.message)
        );
    }

    /**
     * Lógica interna de extracción con validación robusta de JSON
     */
    async _runExtraction(chatId, prompt, aiService) {
        try {
            const result = await aiService.getResponse(prompt);
            const textResponse = result.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
            
            // BUSQUEDA ROBUSTA DE JSON CON TRY/CATCH
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No se encontró JSON en la respuesta de la IA");

            let data;
            try {
                data = JSON.parse(jsonMatch[0]);
            } catch (e) {
                throw new Error("El JSON devuelto por la IA es inválido");
            }

            // Actualizar Resumen
            if (data.resumen) {
                const summaries = persistence.load('summaries');
                summaries[chatId] = data.resumen;
                persistence.save('summaries', summaries);
            }

            // Guardar en Pinecone
            if (data.lore && Array.isArray(data.lore)) {
                for (const item of data.lore) {
                    await vector.upsertLore(null, `${item.integrante}: ${item.dato}`, { type: 'auto-lore' });
                }
            }
            
            console.log(`✅ [LoreManager] Extracción completada para ${chatId}.`);
        } catch (error) {
            console.error(`❌ [LoreManager] Error procesando extracción: ${error.message}`);
        }
    }

    /**
     * Guarda lore manual (llamado desde herramienta)
     */
    async saveManualLore(integrante, dato) {
        return await vector.upsertLore(null, `${integrante}: ${dato}`, { type: 'lore', author: integrante });
    }

    /**
     * Busca lore relevante para un prompt
     */
    async searchRelevantLore(query) {
        return await vector.queryLore(query);
    }
}

module.exports = new LoreManager();
