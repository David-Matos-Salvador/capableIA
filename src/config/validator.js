function validateEnvironment() {
    const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
    if (nodeMajor < 18) {
        console.warn(`⚠️  [Validator] Node.js >= 18 requerido (versión actual: ${process.versions.node}).`);
    }

    if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY && !process.env.GEMINI_API_KEY) {
        console.warn('⚠️  [Validator] No hay API key de ningún proveedor LLM. Define OPENAI_API_KEY, DEEPSEEK_API_KEY o GEMINI_API_KEY en .env');
    }

    if (!process.env.PINECONE_API_KEY) {
        console.warn('⚠️  [Validator] PINECONE_API_KEY no encontrada. La memoria persistente (Pinecone) no estará disponible.');
    }
}

module.exports = { validateEnvironment };