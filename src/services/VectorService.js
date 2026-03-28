const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

class VectorService {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        this.indexName = process.env.PINECONE_INDEX || 'capableia-lore';
    }

    /**
     * Convierte un texto en un vector numérico (Embedding)
     */
    async _getEmbedding(text) {
        const response = await this.openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
            encoding_format: "float",
        });
        return response.data[0].embedding;
    }

    /**
     * Guarda un dato importante (Lore) en Pinecone
     */
    async upsertLore(id, text, metadata = {}) {
        try {
            console.log(`🌲 [VectorService] Guardando lore en Pinecone: ${text.substring(0, 50)}...`);
            const embedding = await this._getEmbedding(text);
            const index = this.pc.index(this.indexName);
            
            await index.upsert([{
                id: id || Date.now().toString(),
                values: embedding,
                metadata: {
                    content: text,
                    timestamp: Date.now(),
                    ...metadata
                }
            }]);
            return true;
        } catch (error) {
            console.error("❌ [VectorService] Error en upsertLore:", error.message);
            return false;
        }
    }

    /**
     * Busca los fragmentos de lore más relevantes para un mensaje actual
     */
    async queryLore(queryText, topK = 3) {
        try {
            console.log(`🌲 [VectorService] Buscando lore relevante para: "${queryText.substring(0, 30)}..."`);
            const embedding = await this._getEmbedding(queryText);
            const index = this.pc.index(this.indexName);

            const queryResponse = await index.query({
                vector: embedding,
                topK: topK,
                includeMetadata: true
            });

            // Extraemos los contenidos del metadata
            return queryResponse.matches
                .filter(match => match.score > 0.3) // Filtro de relevancia mínima
                .map(match => match.metadata.content)
                .join('\n---\n');
        } catch (error) {
            console.warn("⚠️ [VectorService] No se pudo consultar lore (¿Index listo?):", error.message);
            return "";
        }
    }
}

module.exports = new VectorService();
