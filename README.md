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

## 🎮 Comandos

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia el bot en modo producción |
| `npm run dev` | Inicia con **nodemon** (recarga automática al guardar cambios) |
| `npm run clean:session` | **Borra la sesión de WhatsApp** - Útil cuando no aparece el QR o querés vincular un número nuevo |

### ¿Cuándo usar `clean:session`?

- **No aparece el QR** al iniciar el bot
- Querés **vincular un número de WhatsApp diferente**
- La sesión actual **expiró o fue cerrada** desde el celular

Después de borrar la sesión, al reiniciar (`npm start`) se mostrará el código QR para escanear.

## 📱 Cómo usar el Bot en WhatsApp

### Activar el bot en un grupo
1. Agrega el número del bot a un grupo de WhatsApp
2. Escribe **`init ia`** (en cualquier mensaje, puede ser mezclado con otro texto)
3. El bot responderá: `✅ Bot CapableIA activado.`

### Interactuar con el bot
Una vez activado, el bot responde cuando:
- **Lo mencionas** con `@nombre-del-bot`
- **Respondes** a uno de sus mensajes
- **Incluyes su número** en el texto del mensaje

### Funciones disponibles
El bot puede hacer estas acciones automáticamente según la conversación:

| Función | Descripción | Ejemplo de uso |
|---------|-------------|----------------|
| 🧠 **Responder** | Responde con su personalidad (Yoshi) | Cualquier mensaje mencionándolo |
| 🎨 **Generar imágenes** | Crea imágenes con IA | *"Yoshi, dibújame un gato espacial"* |
| 🖼️ **Analizar imágenes** | Describe imágenes que le envíes o cites | Envía una foto mencionándolo o cita una imagen |
| 💾 **Guardar lore** | Aprende y recuerda datos del grupo | Ocurre automáticamente en conversaciones |
| 🔄 **Evolucionar** | Mejora su personalidad con el tiempo | Ocurre automáticamente |

> 💡 **Tip:** El bot analiza automáticamente los últimos 200 mensajes del grupo para aprender el "lore" (historia, inside jokes, datos importantes) y los usa en sus respuestas.

## 🧪 Validación
- **Smoke Test:** `node smoke-test.js` (Verifica configuración, IA, Pinecone, herramientas).

## 📄 Licencia
Este proyecto está bajo la licencia ISC.

---
Hecho con ❤️ para la comunidad de desarrolladores de IA. 🚀🛸
