const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

class VectorService {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        this.indexName = process.env.PINECONE_INDEX || 'capableia-lore';
    }

    async _getEmbedding(text) {
        if (!text) throw new Error("Texto vacío para embedding");
        const response = await this.openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
            encoding_format: "float",
        });
        return response.data[0].embedding;
    }

    async upsertLore(id, text, metadata = {}) {
        try {
            console.log(`🌲 [VectorService] Procesando: ${text.substring(0, 30)}...`);
            const embedding = await this._getEmbedding(text);
            const index = this.pc.index(this.indexName);
            
            const cleanMetadata = {
                content: String(text),
                timestamp: Number(Date.now()),
                type: String(metadata.type || 'lore')
            };

            const record = {
                id: String(id || `lore-${Date.now()}`),
                values: embedding,
                metadata: cleanMetadata
            };

            // SINTAXIS GANADORA: { records: [record] }
            await index.upsert({ records: [record] });
            
            return true;
        } catch (error) {
            console.error("❌ [VectorService] Error en upsertLore:", error.message);
            return false;
        }
    }

    async queryLore(queryText, topK = 3) {
        try {
            const embedding = await this._getEmbedding(queryText);
            const index = this.pc.index(this.indexName);

            const queryResponse = await index.query({
                vector: embedding,
                topK: topK,
                includeMetadata: true
            });

            if (!queryResponse.matches || queryResponse.matches.length === 0) return "";

            return queryResponse.matches
                .filter(match => match.score > 0.3)
                .map(match => match.metadata.content)
                .join('\n---\n');
        } catch (error) {
            console.warn("⚠️ [VectorService] Error en consulta:", error.message);
            return "";
        }
    }
}

module.exports = new VectorService();
