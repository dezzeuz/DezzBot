const TelegramBot = require('node-telegram-bot-api');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('./config');

global.thumb = config.thumb;
const bot = new TelegramBot(config.botToken, { polling: true });
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const TEMP_DIR = path.join(__dirname, 'temp');
const DB_DIR = path.join(__dirname, 'database');

const USERS_DB = path.join(DB_DIR, 'users.json');
const BANNED_DB = path.join(DB_DIR, 'banned.json');

[PLUGINS_DIR, TEMP_DIR, DB_DIR].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir); });
if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, '[]');
if (!fs.existsSync(BANNED_DB)) fs.writeFileSync(BANNED_DB, '[]');

// ==========================================
// SUPREME CONSOLE DESIGN (FOR JUICESSH)
// ==========================================
const ASCII = `
\x1b[1m\x1b[37m    ____  __________  __________  _________ __
   / __ \\/ ____/__  |/_  /__  /  /  _/ ____/\\ \\/ /
  / / / / __/    / /  / /  / /   / // /_     \\  / 
 / /_/ / /___   / /__ / /  / /_ _/ // __/     / /  
/_____/_____/  /____//_/  /____/___/_/       /_/   \x1b[0m

\x1b[90m       PREMIUM OMNI-ENGINE • NOT A DEVELOPER
\x1b[37m+--------------------------------------------------+
\x1b[1m\x1b[37m [ SYSTEM INFORMATION ]\x1b[0m
\x1b[37m |
 |  - ENGINE   : \x1b[1mDEZZIFY LOBSTER V4.0\x1b[0m
 |  - ARCH     : \x1b[1mOPENCLAW-X64\x1b[0m
 |  - V-CORE   : \x1b[1m16 CORE (RYZEN 9 7950X)\x1b[0m
 |  - V-RAM    : \x1b[1m64GB DDR5 (HYPER-X)\x1b[0m
 |  - NETWORK  : \x1b[1m10GBPS (LOW LATENCY)\x1b[0m
 |  - LOCATION : \x1b[1mBANDAR LAMPUNG, ID\x1b[0m
 |
\x1b[37m+--------------------------------------------------+
\x1b[1m\x1b[37m [ MULTI-LANGUAGE RUNTIME ]\x1b[0m
\x1b[37m |
 |  - Node.js    : \x1b[32mSUPPORTED\x1b[37m
 |  - Python3    : \x1b[32mSUPPORTED\x1b[37m
 |  - Golang     : \x1b[32mSUPPORTED\x1b[37m
 |  - PHP-Cli    : \x1b[32mSUPPORTED\x1b[37m
 |  - Bash/SH    : \x1b[32mSUPPORTED\x1b[37m
 |
\x1b[37m+--------------------------------------------------+
\x1b[1m\x1b[32m >>> DEZZIFY SYSTEM IS ONLINE\x1b[0m\n`;

console.clear();
console.log(ASCII);

// Anti-Crash
process.on('uncaughtException', (err) => console.log('\x1b[31m[ ⚫ SYS-ERR ]\x1b[0m', err.message));

const getDB = (file) => JSON.parse(fs.readFileSync(file));
const saveDB = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return `${bytes.toFixed(2)} ${units[i]}`;
}

function getRuntime(seconds) {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

// ==========================================
// AUTO-INSTALLER
// ==========================================
function installMissingPackages(filePath, ext) {
    const content = fs.readFileSync(filePath, 'utf8');
    try {
        if (ext === '.js') {
            const matches = content.match(/require\(['"](.+?)['"]\)/g);
            if (matches) {
                matches.map(m => m.match(/['"](.+?)['"]/)[1])
                    .filter(p => !p.startsWith('.') && !p.includes('/') && !require('module').builtinModules.includes(p))
                    .forEach(pkg => { 
                        try { require.resolve(pkg); } 
                        catch (e) { 
                            console.log(`\x1b[90m[ INSTALL ] ${pkg}\x1b[0m`);
                            execSync(`npm install ${pkg}`); 
                        }
                    });
            }
        } else if (ext === '.py') {
            const matches = content.match(/^(?:import|from)\s+([^\s\.]+)/gm);
            if (matches) {
                matches.map(m => m.replace(/^(import|from)\s+/, '').trim())
                    .filter(p => !['sys', 'os', 'json', 'urllib', 'time', 're', 'math'].includes(p))
                    .forEach(pkg => {
                        console.log(`\x1b[90m[ INSTALL ] ${pkg}\x1b[0m`);
                        execSync(`pip install ${pkg} --break-system-packages`);
                    });
            }
        } else if (ext === '.go') {
            if (!fs.existsSync(path.join(PLUGINS_DIR, 'go.mod'))) {
                execSync(`go mod init botplugins`, { cwd: PLUGINS_DIR });
            }
            execSync(`go mod tidy`, { cwd: PLUGINS_DIR });
        }
    } catch (err) {}
}

// ==========================================
// MESSAGE HANDLER
// ==========================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const username = msg.from.username || msg.from.first_name || 'User';
    let text = msg.text || msg.caption || '';
    const isOwner = userId === config.ownerId;

    // Log Activity (JuiceSSH Aesthetic)
    console.log(`\x1b[37m[ ${new Date().toLocaleTimeString()} ] \x1b[1m${username.padEnd(12)}\x1b[0m : ${text.substring(0, 30)}`);

    const banned = getDB(BANNED_DB);
    if (banned.includes(userId) && !isOwner) return;

    let users = getDB(USERS_DB);
    if (!users.includes(userId)) {
        users.push(userId);
        saveDB(USERS_DB, users);
        bot.sendMessage(config.logChatId, `⚪ **DEZZIFY LOG**\n👤 ${username} (\`${userId}\`)`, { reply_to_message_id: config.logMsgId, parse_mode: 'Markdown' }).catch(() => {});
    }

    if (!text.startsWith('/')) return;

    const args = text.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const q = text.replace(`/${command}`, '').trim();

    if (isOwner) {
        if (command === 'runtime') {
            const ut_bot = getRuntime(process.uptime());
            const ut_sys = getRuntime(os.uptime());
            const res = `⚪ **SYSTEM RUNTIME** ⚪\n\n` +
                        `🤖 **Bot Active:** \`${ut_bot}\`\n` +
                        `🖥️ **VPS Uptime:** \`${ut_sys}\`\n` +
                        `💾 **RAM:** \`12.45 GB / 64.00 GB\`\n` +
                        `🧠 **CPU:** \`AMD Ryzen 9 7950X\`\n` +
                        `🦀 **Engine:** \`OpenClaw Lobster V4.0\``;
            return bot.sendMessage(chatId, res, { parse_mode: 'Markdown' });
        }
        
        if (command === 'broadcast' || command === 'bc') {
            if (!q) return bot.sendMessage(chatId, "⚫ Masukan pesan broadcastnya.");
            const allUsers = getDB(USERS_DB);
            bot.sendMessage(chatId, `⚪ Memulai broadcast ke ${allUsers.length} user...`);
            for (let id of allUsers) {
                try { await bot.sendMessage(id, `⚪ **BROADCAST** ⚪\n\n${q}`, { parse_mode: 'Markdown' }); } catch (e) {}
            }
            return bot.sendMessage(chatId, `✅ Broadcast selesai.`);
        }
    }

    const extensions = { '.js': 'node', '.py': 'python3', '.go': 'go run' };
    let filePathOnVps = 'none', fileType = 'none';

    if (msg.photo) { filePathOnVps = await bot.downloadFile(msg.photo[msg.photo.length-1].file_id, TEMP_DIR); fileType = 'photo'; }
    else if (msg.document) { filePathOnVps = await bot.downloadFile(msg.document.file_id, TEMP_DIR); fileType = 'document'; }

    for (const [ext, runner] of Object.entries(extensions)) {
        const pluginPath = path.join(PLUGINS_DIR, `${command}${ext}`);
        if (fs.existsSync(pluginPath)) {
            console.log(`\x1b[32m  └─ EXECUTING:\x1b[0m /${command}${ext}`);
            installMissingPackages(pluginPath, ext);
            const cmdToExec = `${runner} "${pluginPath}" "${chatId}" "${userId}" "${q}" "${filePathOnVps}" "${fileType}" "${global.thumb}"`;

            exec(cmdToExec, (error, stdout, stderr) => {
                if (filePathOnVps !== 'none' && fs.existsSync(filePathOnVps)) setTimeout(() => { try{fs.unlinkSync(filePathOnVps)}catch(e){} }, 5000);
                if (error || stderr) return;
                const out = stdout.trim();
                if (!out) return;

                if (out.startsWith('SEND_FILE:')) {
                    const [fPath, ...cap] = out.replace('SEND_FILE:', '').split('|');
                    const finalP = fPath.trim();
                    const caption = cap.join('|') || '';
                    if (['.jpg','.jpeg','.png','.webp'].includes(path.extname(finalP).toLowerCase())) {
                        bot.sendPhoto(chatId, finalP, { caption, parse_mode: 'Markdown' }).then(() => { if(fs.existsSync(finalP)) fs.unlinkSync(finalP); });
                    } else {
                        bot.sendDocument(chatId, finalP, { caption, parse_mode: 'Markdown' }).then(() => { if(fs.existsSync(finalP)) fs.unlinkSync(finalP); });
                    }
                } else {
                    bot.sendMessage(chatId, out, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, out));
                }
            });
            return;
        }
    }
});
