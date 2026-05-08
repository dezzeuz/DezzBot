const TelegramBot = require('node-telegram-bot-api');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('./config');

// Global setup
global.thumb = config.thumb;
const bot = new TelegramBot(config.botToken, { polling: true });
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const TEMP_DIR = path.join(__dirname, 'temp');
const DB_DIR = path.join(__dirname, 'database');

// Database Paths
const USERS_DB = path.join(DB_DIR, 'users.json');
const BANNED_DB = path.join(DB_DIR, 'banned.json');

// Initialize folders & files
[PLUGINS_DIR, TEMP_DIR, DB_DIR].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir); });
if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, '[]');
if (!fs.existsSync(BANNED_DB)) fs.writeFileSync(BANNED_DB, '[]');

const startTime = Date.now();

// ==========================================
// AESTHETIC CONSOLE FOR JJ CONTENT
// ==========================================
const ASCII = `
\x1b[1m\x1b[37m
 ██████╗ ███████╗███████╗███████╗██╗███████╗██╗   ██╗
 ██╔══██╗██╔════╝╚══███╔╝╚══███╔╝██║██╔════╝╚██╗ ██╔╝
 ██║  ██║█████╗    ███╔╝   ███╔╝ ██║█████╗   ╚████╔╝ 
 ██║  ██║██╔══╝   ███╔╝   ███╔╝  ██║██╔══╝    ╚██╔╝  
 ██████╔╝███████╗███████╗███████╗██║██║        ██║   
 ╚═════╝ ╚══════╝╚══════╝╚══════╝╚═╝╚═╝        ╚═╝   
\x1b[0m
      \x1b[90mNOT A DEVELOPER • MONOCHROME PREMIUM UI\x1b[0m
\x1b[37m⚪ ———————————————————————————————————————————————— ⚪\x1b[0m`;

console.clear();
console.log(ASCII);
console.log(`\x1b[37m[ ⚪ ] SYSTEM  : \x1b[1mDEZZIFY SUPREME ENGINE\x1b[0m`);
console.log(`\x1b[37m[ ⚪ ] RAM     : \x1b[1m8GB (VPS NAT ENABLED)\x1b[0m`);
console.log(`\x1b[37m[ ⚪ ] LOC     : \x1b[1mBandar Lampung, Indonesia\x1b[0m`);
console.log(`\x1b[37m[ ⚪ ] STATUS  : \x1b[32mONLINE & SECURE\x1b[0m`);
console.log(`\x1b[37m⚪ ———————————————————————————————————————————————— ⚪\x1b[0m\n`);

// Anti-Crash
process.on('uncaughtException', (err) => console.log('\x1b[31m[ ⚫ SYS-ERR ]\x1b[0m', err.message));

// Helpers
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
                            console.log(`\x1b[90m[ INSTALL ] Node Module: ${pkg}\x1b[0m`);
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
                        console.log(`\x1b[90m[ INSTALL ] Python Module: ${pkg}\x1b[0m`);
                        execSync(`pip install ${pkg} --break-system-packages`);
                    });
            }
        } else if (ext === '.go') {
            if (!fs.existsSync(path.join(PLUGINS_DIR, 'go.mod'))) {
                console.log(`\x1b[90m[ INIT ] Golang Module\x1b[0m`);
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

    // Log Chat Masuk buat di Terminal (Biar keren pas JJ)
    console.log(`\x1b[90m[ CHAT ]\x1b[0m \x1b[37m${username}\x1b[0m: ${text.substring(0, 40)}${text.length > 40 ? '...' : ''}`);

    // Security Check: Ban
    const banned = getDB(BANNED_DB);
    if (banned.includes(userId) && !isOwner) return;

    // Log User & New User Comment
    let users = getDB(USERS_DB);
    if (!users.includes(userId)) {
        users.push(userId);
        saveDB(USERS_DB, users);
        bot.sendMessage(config.logChatId, `⚪ **USER BARU**\n👤 ${username} (\`${userId}\`)`, { reply_to_message_id: config.logMsgId, parse_mode: 'Markdown' }).catch(() => {});
    }

    if (!text.startsWith('/')) return;

    const args = text.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const q = text.replace(`/${command}`, '').trim();

    // ==========================================
    // OWNER COMMANDS
    // ==========================================
    if (isOwner) {
        if (command === 'runtime') {
            const ut_bot = getRuntime(process.uptime());
            const ut_sys = getRuntime(os.uptime());
            const ram_total = formatSize(os.totalmem());
            const ram_free = formatSize(os.freemem());
            const ram_used = formatSize(os.totalmem() - os.freemem());
            const cpu = os.cpus()[0].model;
            const res = `⚪ **SYSTEM RUNTIME** ⚪\n\n` +
                        `🤖 **Bot Active:** \`${ut_bot}\`\n` +
                        `🖥️ **VPS Uptime:** \`${ut_sys}\`\n` +
                        `💾 **RAM:** \`${ram_used} / ${ram_total}\`\n` +
                        `🧠 **CPU:** \`${cpu}\` (${os.cpus().length} Cores)\n` +
                        `⚙️ **Platform:** \`${os.platform()} ${os.arch()}\``;
            return bot.sendMessage(chatId, res, { parse_mode: 'Markdown' });
        }

        if (command === 'broadcast' || command === 'bc') {
            if (!q) return bot.sendMessage(chatId, "⚫ Masukan pesan broadcastnya boss.");
            const allUsers = getDB(USERS_DB);
            let success = 0;
            bot.sendMessage(chatId, `⚪ Memulai broadcast ke ${allUsers.length} user...`);
            for (let id of allUsers) {
                try { await bot.sendMessage(id, `⚪ **BROADCAST** ⚪\n\n${q}`, { parse_mode: 'Markdown' }); success++; } catch (e) {}
            }
            return bot.sendMessage(chatId, `✅ Broadcast selesai. Sukses: ${success}/${allUsers.length}`);
        }

        if (command === 'ban') {
            const target = q || (msg.reply_to_message ? msg.reply_to_message.from.id.toString() : '');
            if (!target) return bot.sendMessage(chatId, "⚫ Tag orangnya atau ketik ID-nya.");
            let banList = getDB(BANNED_DB);
            if (!banList.includes(target)) { banList.push(target); saveDB(BANNED_DB, banList); }
            return bot.sendMessage(chatId, `✅ User \`${target}\` berhasil di-ban.`);
        }

        if (command === 'unban') {
            let banList = getDB(BANNED_DB).filter(id => id !== q);
            saveDB(BANNED_DB, banList);
            return bot.sendMessage(chatId, `✅ User \`${q}\` berhasil di-unban.`);
        }

        if (command === 'listuser') {
            return bot.sendMessage(chatId, `⚪ **LIST USER**\n\nTotal: ${users.length} user.\n\`${users.join(', ')}\``, { parse_mode: 'Markdown' });
        }

        if (command === 'deluser') {
            let filtered = users.filter(id => id !== q);
            saveDB(USERS_DB, filtered);
            return bot.sendMessage(chatId, `✅ User \`${q}\` dihapus dari DB.`);
        }

        if (command === 'listdb') {
            const dbFiles = fs.readdirSync(DB_DIR);
            return bot.sendMessage(chatId, `⚪ **DATABASE FILES**\n\n${dbFiles.map(f => `📁 ${f}`).join('\n')}`);
        }
    }

    // ==========================================
    // PLUGIN ENGINE (SMART LOADER)
    // ==========================================
    const extensions = { '.js': 'node', '.py': 'python3', '.go': 'go run' };
    let filePathOnVps = 'none', fileType = 'none';

    if (msg.photo) { filePathOnVps = await bot.downloadFile(msg.photo[msg.photo.length-1].file_id, TEMP_DIR); fileType = 'photo'; }
    else if (msg.document) { filePathOnVps = await bot.downloadFile(msg.document.file_id, TEMP_DIR); fileType = 'document'; }

    for (const [ext, runner] of Object.entries(extensions)) {
        const pluginPath = path.join(PLUGINS_DIR, `${command}${ext}`);
        if (fs.existsSync(pluginPath)) {
            console.log(`\x1b[32m[ EXEC ]\x1b[0m \x1b[37mRunning /${command}${ext}...\x1b[0m`);
            installMissingPackages(pluginPath, ext);
            const cmdToExec = `${runner} "${pluginPath}" "${chatId}" "${userId}" "${q}" "${filePathOnVps}" "${fileType}" "${global.thumb}"`;

            exec(cmdToExec, (error, stdout, stderr) => {
                // Auto cleanup temp file
                if (filePathOnVps !== 'none' && fs.existsSync(filePathOnVps)) setTimeout(() => { try{fs.unlinkSync(filePathOnVps)}catch(e){} }, 5000);

                if (error || stderr) {
                    console.log(`\x1b[31m[ ERR ]\x1b[0m /${command} failed: ${stderr || error.message}`);
                    return;
                }
                const out = stdout.trim();
                if (!out) return;

                if (out.startsWith('SEND_FILE:')) {
                    const [fPath, ...cap] = out.replace('SEND_FILE:', '').split('|');
                    const finalP = fPath.trim();
                    const caption = cap.join('|') || '';
                    const isImg = ['.jpg','.jpeg','.png','.webp'].includes(path.extname(finalP).toLowerCase());

                    if (isImg) {
                        bot.sendPhoto(chatId, finalP, { caption, parse_mode: 'Markdown' }).then(() => { if(fs.existsSync(finalP)) fs.unlinkSync(finalP); });
                    } else {
                        bot.sendDocument(chatId, finalP, { caption, parse_mode: 'Markdown' }).then(() => { if(fs.existsSync(finalP)) fs.unlinkSync(finalP); });
                    }
                } else {
                    bot.sendMessage(chatId, out, { parse_mode: 'Markdown' }).catch(e => {
                        bot.sendMessage(chatId, out);
                    });
                }
            });
            return;
        }
    }
});
