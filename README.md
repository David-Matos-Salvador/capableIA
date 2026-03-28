# CapableIA - WhatsApp Bot Evolutivo con Memoria Vectorial 🤖🚀🇵🇪

**CapableIA** (Alias: **Yoshi**) es un bot de WhatsApp de nivel profesional diseñado bajo los principios **SOLID**, utilizando la potencia de **OpenAI (GPT-4o)** y **Pinecone** para ofrecer una experiencia de conversación que evoluciona, recuerda y analiza el lore del grupo.

## 💡 Motivación

Este proyecto nació para superar las limitaciones de las IAs nativas. **CapableIA** no es solo un bot; es una entidad que aprende de los integrantes del grupo, recuerda chismes, gustos y debilidades, y adapta su propia personalidad basándose en la interacción.

## ✨ Características Premium

*   **🧠 Identidad Evolutiva:** El bot utiliza la herramienta `evolucionar_identidad` para aprender de la charla y ajustar su tono y comportamiento en tiempo real.
*   **🌲 Memoria Vectorial (Pinecone):** Gestión de "Lore" a largo plazo. Busca información semánticamente relevante antes de responder.
*   **🔍 Extracción Proactiva:** Cada 200 mensajes, el bot analiza la conversación en segundo plano para extraer datos clave de los integrantes y guardarlos en Pinecone.
*   **⚡ Arquitectura de Alto Rendimiento:** 
    *   **Caché de Identidad:** Minimiza latencia y consumo de tokens.
    *   **Procesamiento Asíncrono:** La extracción de lore no bloquea la respuesta de WhatsApp.
    *   **Patrón Command/Managers:** Código ultra-organizado y fácil de mantener.
*   **🖼️ Generación de Imágenes:** Integración con Pollinations para crear arte visual bajo demanda.
*   **👁️ Visión Multimodal:** Entiende y analiza imágenes enviadas o citadas (replies).

## 🛠️ Arquitectura (SOLID)

- **Handlers:** `MessageHandler` (Orquestador central).
- **Managers:** `IdentityManager` (Personalidad y Caché) y `LoreManager` (Conocimiento y Pinecone).
- **Services:** `OpenAIService`, `VectorService` (Embeddings), `PollinationsService`.
- **Core:** `WhatsAppProvider` (Independencia de librería).

## 🚀 Instalación Rápida

1.  **Instalar dependencias:** `npm install`
2.  **Variables de Entorno (.env):**
    ```env
    OPENAI_API_KEY=...
    PINECONE_API_KEY=...
    PINECONE_INDEX=...
    BOT_NAME="Yoshi"
    BOT_INSTRUCTIONS="Prompt de Yoshi..."
    ```
3.  **Iniciar:** `npm run dev`

## 🧪 Validación
- **Smoke Test:** `node smoke-test.js`
- **Service Test:** `node test-services.js`

---
Hecho con ❤️ para la comunidad de desarrolladores de IA. 🚀🛸
