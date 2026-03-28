const vector = require('../services/VectorService');

class IdentityManager {
    constructor() {
        this.cachedIdentity = null;
        this.lastRefresh = 0;
    }

    /**
     * Obtiene la identidad de Yoshi. Usa caché si está disponible.
     */
    async getIdentity() {
        // Si ya tenemos caché, la devolvemos de inmediato (Máxima velocidad)
        if (this.cachedIdentity) {
            return this.cachedIdentity;
        }

        console.log('🧠 [IdentityManager] Caché vacía. Recuperando identidad de Pinecone...');
        return await this.refreshIdentity();
    }

    /**
     * Fuerza la actualización del caché desde Pinecone
     */
    async refreshIdentity() {
        try {
            const identity = await vector.queryLore("¿Quién soy yo? ¿Cómo debo comportarme?", 3);
            this.cachedIdentity = identity || "Aún no has tenido evoluciones significativas.";
            this.lastRefresh = Date.now();
            return this.cachedIdentity;
        } catch (error) {
            console.error('❌ [IdentityManager] Error refrescando identidad:', error);
            return this.cachedIdentity || "";
        }
    }

    /**
     * Guarda una nueva lección y limpia el caché para que se refresque en la siguiente pregunta
     */
    async evolve(leccion) {
        console.log(`✨ [IdentityManager] Evolucionando: ${leccion}`);
        const success = await vector.upsertLore(null, `Lección aprendida: ${leccion}`, { type: 'self-identity' });
        if (success) {
            this.cachedIdentity = null; // Forzamos refresco en la próxima llamada
        }
        return success;
    }
}

module.exports = new IdentityManager();
