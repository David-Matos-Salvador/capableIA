const fs = require('fs');
const path = require('path');
const readline = require('readline');

function ask(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

function promptMultiline(rl, question) {
    return new Promise((resolve) => {
        console.log(question);
        console.log('(Escribe tu respuesta. Línea vacía + Enter para finalizar)');
        let lines = [];
        rl.on('line', (line) => {
            if (line === '' && lines.length > 0 && lines[lines.length - 1] === '') {
                lines.pop();
                rl.removeAllListeners('line');
                resolve(lines.join('\n').trim());
            } else {
                lines.push(line);
            }
        });
    });
}

async function runSetup() {
    const envPath = path.resolve(__dirname, '../../.env');
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf-8');
    } catch {
        // .env doesn't exist yet
    }

    if (envContent.includes('BOT_INSTRUCTIONS=')) {
        console.log('ℹ️  BOT_INSTRUCTIONS ya configurada. Omitiendo setup.');
        return;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║     CapableIA - Setup Inicial       ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    console.log('No se encontró BOT_INSTRUCTIONS en .env.');
    console.log('Responde las preguntas para configurar la personalidad del bot.');
    console.log('');

    const name = await ask(rl, `Nombre del bot (default: CapableIA): `);
    const language = await ask(rl, `Idioma (default: español): `);
    const instructions = await promptMultiline(rl, `Describe la personalidad del bot:`);

    const botName = name.trim() || 'CapableIA';
    const botLanguage = language.trim() || 'español';

    let appendContent = `\n# Configurado por setup wizard\nBOT_NAME=${botName}\nBOT_LANGUAGE=${botLanguage}\n`;
    if (instructions) {
        const escaped = instructions.replace(/"/g, '\\"');
        appendContent += `BOT_INSTRUCTIONS="${escaped}"\n`;
    }

    fs.appendFileSync(envPath, appendContent, 'utf-8');
    console.log('\n✅ Configuración guardada en .env\n');

    rl.close();
}

module.exports = { runSetup };