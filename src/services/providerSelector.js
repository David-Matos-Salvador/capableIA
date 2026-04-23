const PROVIDERS = [
  { envKey: 'OPENAI_API_KEY', file: './OpenAIService', name: 'OpenAI', icon: '🔵' },
  { envKey: 'DEEPSEEK_API_KEY', file: './DeepSeekService', name: 'DeepSeek', icon: '🟢' },
  { envKey: 'GEMINI_API_KEY', file: './GeminiService', name: 'Gemini', icon: '🟡' },
];

function selectAIProvider() {
  for (const p of PROVIDERS) {
    if (process.env[p.envKey]) {
      console.log(`${p.icon} Proveedor LLM: ${p.name}`);
      return require(p.file);
    }
  }
  console.error('❌ No hay proveedor LLM configurado. Define OPENAI_API_KEY, DEEPSEEK_API_KEY o GEMINI_API_KEY en .env');
  process.exit(1);
}

module.exports = { selectAIProvider };
