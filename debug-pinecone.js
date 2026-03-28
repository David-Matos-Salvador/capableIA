require('dotenv').config({ override: true });
const { Pinecone } = require('@pinecone-database/pinecone');

async function debugPinecone() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX;
    const index = pc.index(indexName);

    console.log(`🔍 Depurando Pinecone Index: ${indexName}`);
    
    const testRecord = {
        id: 'test-1',
        values: new Array(1536).fill(0.1),
        metadata: { text: 'test' }
    };

    const syntaxes = [
        { name: "Array Directo [record]", call: () => index.upsert([testRecord]) },
        { name: "Objeto con records { records: [record] }", call: () => index.upsert({ records: [testRecord] }) },
        { name: "Objeto con vectors { vectors: [record] }", call: () => index.upsert({ vectors: [testRecord] }) }
    ];

    for (const syntax of syntaxes) {
        try {
            console.log(`Testing: ${syntax.name}...`);
            await syntax.call();
            console.log(`✅ SUCCESS with ${syntax.name}`);
            return syntax.name;
        } catch (e) {
            console.log(`❌ FAILED with ${syntax.name}: ${e.message}`);
        }
    }
}

debugPinecone();
