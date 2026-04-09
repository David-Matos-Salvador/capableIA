# CapableIA - Bot de WhatsApp Evolutivo y Multimodal 🤖🚀

**CapableIA** (Alias: **Yoshi**) es un bot de WhatsApp de nivel profesional construido sobre Node.js con arquitectura **SOLID**. Utiliza **OpenAI (GPT-4o)** para conversaciones inteligentes y **Pinecone** para memoria a largo plazo, ofreciendo una experiencia que evoluciona, recuerda y analiza el lore del grupo.

## 💡 Motivación
Nacido para superar las limitaciones de las IAs nativas, CapableIA es una entidad que aprende, recuerda y adapta su personalidad.

## ✨ Características Clave
*   **🤖 Personalidad Evolutiva (Yoshi):** Configurable vía `.env` (`BOT_INSTRUCTIONS`). Adaptable en tono (chacotero/experto), concisión y jerga.
*   **🌲 Memoria Vectorial (Pinecone):**
    *   **Lore Grupal:** Extracción proactiva de datos relevantes (últimos 200 (default) mensajes).
    *   **Identidad Propia:** Yoshi aprende de la charla y guarda lecciones sobre sí mismo en Pinecone.
*   **💬 Estilo de Conversación Dual:** Responde de forma concisa y chacotera en chats casuales, o detallada y profesional en temas técnicos/históricos.
*   **🖼️ Generación y Análisis de Imágenes:** Crea imágenes (Pollinations) y extrae tags de imágenes enviadas/citadas.
*   **🔗 Arquitectura SOLID:** Core (`WhatsAppProvider`), Services (`OpenAIService`, `VectorService`, etc.), Managers (`LoreManager`, `IdentityManager`), Handlers (`MessageHandler`).

## 🚀 Instalación Rápida
1.  **Clonar:** `git clone [URL_DEL_REPO]` y `cd capableia`
2.  **Instalar dependencias:** `npm install`
3.  **Variables de Entorno (.env):**
    ```env
    OPENAI_API_KEY=...
    PINECONE_API_KEY=...
    PINECONE_INDEX=capableia
    BOT_NAME="Yoshi"
    BOT_INSTRUCTIONS="Prompt detallado de Yoshi..."
    ```
4.  **Iniciar:** `npm run dev`

## 🧪 Validación
- **Smoke Test:** `node smoke-test.js` (Verifica configuración, IA, Pinecone, herramientas).

## 📄 Licencia
Este proyecto está bajo la licencia ISC.

---
Hecho con ❤️ para la comunidad de desarrolladores de IA. 🚀🛸
