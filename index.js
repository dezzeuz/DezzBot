const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Anti Crash
process.on('uncaughtException', (err) => {
    console.log('[BOSS ERROR] Kacangin error:', err.message);
});
process.on('unhandledRejection', (err) => {
    console.log('[BOSS ERROR] Kacangin promise:', err.message);
});

// MASUKIN TOKEN LU DI SINI
const token = '8741013211:AAGBW4n3ebT2TMx_ljzUF2-MWOxbHFNDu0M'; 
const bot = new TelegramBot(token, { polling: true });

const OWNER_ID = '8302651892'; // ID lu
const PLUGINS_DIR = path.join(__dirname, 'plugins');

if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR);
}

console.log('🤖 BOSS udah nyala! Pantau chat masuk di bawah ini...\n');

bot.on('message', (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const text = msg.text || '';
    const username = msg.from.username || msg.from.first_name || 'Unknown';

    // FITUR BARU: Menampilkan chat yang masuk ke Console
    console.log(`[📥 CHAT MASUK] Dari: ${username} (ID: ${userId}) | Pesan: "${text}"`);

    // Kalo bukan command, kacangin
    if (!text.startsWith('/')) return; 

    const args = text.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase(); 
    const argString = text.replace(`/${command}`, '').trim(); 

    const jsPlugin = path.join(PLUGINS_DIR, `${command}.js`);
    const pyPlugin = path.join(PLUGINS_DIR, `${command}.py`);
    const goPlugin = path.join(PLUGINS_DIR, `${command}.go`);

    let execCommand = '';

    if (fs.existsSync(jsPlugin)) {
        execCommand = `node "${jsPlugin}" "${chatId}" "${userId}" "${argString}"`;
        console.log(`[⚙️ EKSEKUSI] Nyuruh pekerja Node.js: ${command}.js`);
    } else if (fs.existsSync(pyPlugin)) {
        execCommand = `python3 "${pyPlugin}" "${chatId}" "${userId}" "${argString}"`;
        console.log(`[⚙️ EKSEKUSI] Nyuruh pekerja Python: ${command}.py`);
    } else if (fs.existsSync(goPlugin)) {
        execCommand = `go run "${goPlugin}" "${chatId}" "${userId}" "${argString}"`;
        console.log(`[⚙️ EKSEKUSI] Nyuruh pekerja Golang: ${command}.go`);
    } else {
        // Log kalo plugin ga ada
        console.log(`[⚠️ INFO] Command /${command} dipanggil, tapi file plugin ga ada. Bos diem aja.`);
        return; 
    }

    exec(execCommand, (error, stdout, stderr) => {
        if (error || stderr) {
            console.log(`[❌ PEKERJA RUSAK] Plugin /${command} error:\n${stderr || error.message}`);
            return; 
        }

        const replyText = stdout.trim();
        if (replyText) {
            bot.sendMessage(chatId, replyText);
            console.log(`[📤 BOSS BALAS] Ke: ${username} | Teks: "${replyText}"`);
        }
    });
});
