# CapableIA - Memoria de Proyecto (Engineering Log) 🚀

Este archivo contiene el historial de decisiones técnicas, arquitectura y avances realizados en el proyecto CapableIA. Sirve como fuente de verdad para cualquier agente de IA o desarrollador que tome el relevo.

## 📝 Estado Actual
El bot está en una fase de **Memoria Vectorial Evolutiva**. Utiliza OpenAI (GPT-4o) como cerebro y Pinecone como base de datos de largo plazo.

## 🛠️ Hitos de Arquitectura

### 1. Migración a SOLID (Marzo 2026)
- Se abandonó el script monolítico `index.js`.
- Estructura actual:
    - `src/core/WhatsAppProvider.js`: Abstracción de la mensajería.
    - `src/services/OpenAIService.js`: Adaptador para OpenAI.
    - `src/services/VectorService.js`: Integración con Pinecone (RAG).
    - `src/services/PersistenceService.js`: Manejo de archivos JSON locales.
    - `src/handlers/MessageHandler.js`: Orquestador de la lógica.

### 2. Sistema de Memoria Híbrido
- **Capa 1 (Inmediata):** Últimos 15 mensajes en el prompt.
- **Capa 2 (Cercana):** Archivo `group_history.json` limitado a 200 mensajes.
- **Capa 3 (Largo Plazo/Lore):** Pinecone (Vectores). Resúmenes automáticos cada 200 mensajes que extraen "lore" de los integrantes.

### 3. Personalidad Dinámica (Yoshi Edition)
- Personalidad inyectada vía `.env` (`BOT_INSTRUCTIONS`).
- Configuración de temperatura (0.8) y max_tokens (500) para un estilo chacotero y directo.

## 🧠 Lógica Evolutiva (En progreso)
- Implementación de `evolucionar_identidad`: El bot anota cambios en su propia personalidad basándose en la interacción con el grupo.
- Inyección de identidad: Antes de responder, busca en Pinecone su "yo" más reciente.

## 📌 Pendientes / Roadmap
- [ ] Implementar Ranking Semanal Alfa/Beta (Analítica sobre Pinecone).
- [ ] Integración de Voz (Whisper + ElevenLabs).
- [ ] Búsqueda Web en tiempo real.

---
*Ultima actualización: Marzo 2026*
