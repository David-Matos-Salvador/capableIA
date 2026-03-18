const fs = require('fs');

class PersistenceService {
    constructor() {
        this.paths = {
            groups: './initialized_groups.json',
            summaries: './group_summaries.json',
            history: './group_history.json'
        };
    }

    save(key, data) {
        const path = this.paths[key] || `./${key}.json`;
        const content = key === 'groups' ? JSON.stringify([...data]) : JSON.stringify(data);
        fs.writeFileSync(path, content);
    }

    load(key) {
        const path = this.paths[key] || `./${key}.json`;
        if (fs.existsSync(path)) {
            try {
                const data = JSON.parse(fs.readFileSync(path, 'utf8'));
                return key === 'groups' ? new Set(data) : data;
            } catch (e) {
                console.error(`Error cargando ${key}:`, e);
            }
        }
        return key === 'groups' ? new Set() : {};
    }
}

module.exports = new PersistenceService();
