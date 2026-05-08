const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ==========================================
// ANTI CRASH SYSTEM (Boss Mode: ON)
// ==========================================
// Kalo ada error parah dari Node.js, kita kacangin aja biar bot ga mati.
process.on('uncaughtException', (err) => {
    console.log('[BOSS] Ada error sistem, tapi gua kacangin:', err.message);
});
process.on('unhandledRejection', (err) => {
    console.log('[BOSS] Ada promise rejection, gua kacangin:', err.message);
});

// Konfigurasi
const token = 'ISI_TOKEN_BOT_TELEGRAM_LU_DISINI'; 
const bot = new TelegramBot(token, { polling: true });

const OWNER_ID = '8302651892'; // ID lu
const PLUGINS_DIR = path.join(__dirname, 'plugins');

// Bikin folder plugins otomatis kalo lu lupa bikin
if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR);
}

console.log('🤖 BOSS (index.js) udah nyala! Siap mantau command...');

bot.on('message', (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const text = msg.text || '';

    // Deteksi command (misal: /ping, /halo)
    // Kalo user ngetik biasa (bukan command), bos diem aja
    if (!text.startsWith('/')) return; 

    // Misahin command dan teks tambahannya
    const args = text.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase(); // Ambil kata pertama (cth: "ping")
    const argString = text.replace(`/${command}`, '').trim(); // Sisa teks

    // ==========================================
    // AUTO LOAD SYSTEM (Mencari Pekerja)
    // ==========================================
    const jsPlugin = path.join(PLUGINS_DIR, `${command}.js`);
    const pyPlugin = path.join(PLUGINS_DIR, `${command}.py`);
    const goPlugin = path.join(PLUGINS_DIR, `${command}.go`);

    let execCommand = '';

    // Deteksi plugin mana yang ada, lalu siapin perintah eksekusi terminalnya
    // Format kirim data ke pekerja: script <chatId> <userId> <sisa teks>
    if (fs.existsSync(jsPlugin)) {
        execCommand = `node "${jsPlugin}" "${chatId}" "${userId}" "${argString}"`;
    } else if (fs.existsSync(pyPlugin)) {
        execCommand = `python3 "${pyPlugin}" "${chatId}" "${userId}" "${argString}"`;
    } else if (fs.existsSync(goPlugin)) {
        execCommand = `go run "${goPlugin}" "${chatId}" "${userId}" "${argString}"`;
    } else {
        // Plugin ga ada = Kacangin.
        return; 
    }

    // ==========================================
    // ISOLASI PEKERJA (Eksekusi Terpisah)
    // ==========================================
    // Bos ngelempar tugas ke terminal baru. 
    exec(execCommand, (error, stdout, stderr) => {
        // Kalau pekerja numbur tembok (error/rusak) = Kacangin!
        if (error || stderr) {
            console.log(`[PEKERJA ERROR] Plugin '/${command}' rusak. Bos bodo amat.`);
            
            // Opsional: Cuma ngirim info error kalo yang ngetik command itu elu (Owner)
            if (userId === OWNER_ID) {
                // bot.sendMessage(chatId, `⚠️ Plugin Error:\n${stderr || error.message}`);
            }
            return; 
        }

        // Kalau pekerja selesai ngolah dan ada hasilnya (print/console.log)
        // Kirim hasil cetakannya ke Telegram
        const replyText = stdout.trim();
        if (replyText) {
            bot.sendMessage(chatId, replyText);
        }
    });
});
