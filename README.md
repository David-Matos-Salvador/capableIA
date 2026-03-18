# CapableIA - WhatsApp Bot con Memoria Inteligente 🤖🚀

**CapableIA** es un bot de WhatsApp de nivel profesional construido sobre Node.js, diseñado bajo los principios **SOLID** y utilizando la potencia de **OpenAI (GPT-4o)** para ofrecer una experiencia de conversación contextual, inteligente y multimodal.

## 💡 Motivación

Este proyecto nació de la necesidad de superar las limitaciones de las soluciones de IA nativas actuales. **CapableIA** resuelve esto mediante una **arquitectura abierta y escalable**, permitiendo integrar cualquier motor de IA, generador de imágenes o herramienta externa, convirtiéndola en una plataforma mucho más robusta que las opciones estándar.

## ✨ Características Principales

*   **🧠 Memoria Inteligente:** El bot mantiene un historial local de los últimos 200 mensajes por grupo para ofrecer contexto real en las conversaciones.
*   **🖼️ Generación de Imágenes:** Integración inteligente con herramientas de IA para crear arte digital bajo demanda (Function Calling).
*   **🛡️ Arquitectura SOLID:** Diseño desacoplado utilizando el patrón *Strategy* y *Adapter*, facilitando el cambio de proveedores (IA, Imágenes, WhatsApp) sin romper la lógica central.
*   **👥 Gestión de Grupos:** El bot solo responde en grupos tras usar `init ia`, garantizando privacidad.
*   **👁️ Contexto Completo:** El bot entiende mensajes citados (replies) y analiza imágenes adjuntas o citadas.

## 🛠️ Arquitectura (SOLID)

- **Core:** `WhatsAppProvider` (Abstracción de la librería de mensajería).
- **Services:** Lógica aislada para IA (`OpenAIService`), Imágenes (`PollinationsService`) y Persistencia local.
- **Handlers:** Orquestador central (`MessageHandler`) que recibe dependencias inyectadas.

## 🚀 Instalación Rápida

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/capableia.git
    cd capableia
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno (.env):**
    ```env
    OPENAI_API_KEY=tu_clave_openai
    ```

4.  **Iniciar el bot:**
    ```bash
    npm run dev
    ```

## ⌨️ Comandos en WhatsApp

*   **Inicializar en Grupo:** Menciona al bot seguido de `init ia`.
*   **Conversar:** Menciona al bot o responde a uno de sus mensajes.
*   **Imágenes:** Pídele que dibuje o genere algo (ej: *"@bot dibuja un atardecer cyberpunk"*).

## 📄 Licencia

Este proyecto está bajo la licencia ISC.

---
Hecho con ❤️ para la comunidad de desarrolladores de IA.
