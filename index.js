const TelegramBot = require('node-telegram-bot-api');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Global Vars
global.thumb = config.thumb;
const bot = new TelegramBot(config.botToken, { polling: true });
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const TEMP_DIR = path.join(__dirname, 'temp');
const USERS_DB = path.join(__dirname, 'users.json');

// Initial Setup
if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR);
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);
if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, '[]');

console.log('⚪ ——————————————————————————————————— ⚪');
console.log('🤖 DEZZ-BOT SUPER ENGINE ONLINE');
console.log('📦 SUPPORT: TEXT, IMAGE, VIDEO, AUDIO, FILE');
console.log('⚪ ——————————————————————————————————— ⚪\n');

// Anti-Crash
process.on('uncaughtException', (err) => console.log('⚫ [SYS-ERR]', err.message));

// ==========================================
// AUTO-INSTALLER ENGINE
// ==========================================
function installMissingPackages(filePath, ext) {
    const content = fs.readFileSync(filePath, 'utf8');
    try {
        if (ext === '.js') {
            const matches = content.match(/require\(['"](.+?)['"]\)/g);
            if (matches) {
                const packages = matches.map(m => m.match(/['"](.+?)['"]/)[1])
                    .filter(p => !p.startsWith('.') && !p.includes('/') && !require('module').builtinModules.includes(p));
                packages.forEach(pkg => {
                    try { require.resolve(pkg); } 
                    catch (e) {
                        console.log(`⚫ [INSTALL] Node.js: ${pkg}`);
                        execSync(`npm install ${pkg}`);
                    }
                });
            }
        } else if (ext === '.py') {
            const matches = content.match(/^(?:import|from)\s+([^\s\.]+)/gm);
            if (matches) {
                const packages = matches.map(m => m.replace(/^(import|from)\s+/, '').trim())
                    .filter(p => !['sys', 'os', 'json', 'urllib', 'time', 're', 'math', 'shutil'].includes(p));
                packages.forEach(pkg => {
                    console.log(`⚫ [INSTALL] Python: ${pkg}`);
                    execSync(`pip install ${pkg} --break-system-packages`);
                });
            }
        } else if (ext === '.go') {
            if (!fs.existsSync(path.join(PLUGINS_DIR, 'go.mod'))) execSync(`go mod init botplugins`, { cwd: PLUGINS_DIR });
            execSync(`go mod tidy`, { cwd: PLUGINS_DIR });
        }
    } catch (err) { console.log(`⚫ [INSTALL-FAIL]`, err.message); }
}

// ==========================================
// MESSAGE HANDLER (THE BOSS)
// ==========================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const username = msg.from.username || msg.from.first_name || 'User';
    
    // Deteksi Tipe Pesan & File
    let text = msg.text || msg.caption || '';
    let fileId = null;
    let fileType = 'none';
    let filePathOnVps = 'none';

    if (msg.photo) { fileId = msg.photo[msg.photo.length - 1].file_id; fileType = 'photo'; }
    else if (msg.video) { fileId = msg.video.file_id; fileType = 'video'; }
    else if (msg.audio) { fileId = msg.audio.file_id; fileType = 'audio'; }
    else if (msg.voice) { fileId = msg.voice.file_id; fileType = 'voice'; }
    else if (msg.document) { fileId = msg.document.file_id; fileType = 'document'; }

    // 1. LOG NEW USER
    let users = JSON.parse(fs.readFileSync(USERS_DB));
    if (!users.includes(userId)) {
        users.push(userId);
        fs.writeFileSync(USERS_DB, JSON.stringify(users));
        bot.sendMessage(config.logChatId, `⚪ **USER BARU**\n👤 ${username} (\`${userId}\`)`, { reply_to_message_id: config.logMsgId, parse_mode: 'Markdown' }).catch(() => {});
    }

    if (!text.startsWith('/')) return;

    // 2. FORCE SUBSCRIBE
    if (msg.chat.type === 'private') {
        const member = await bot.getChatMember(config.channelId, userId).catch(() => ({ status: 'member' }));
        if (['left', 'kicked'].includes(member.status)) {
            return bot.sendPhoto(chatId, global.thumb, {
                caption: `⚪ **AKSES DITOLAK**\n\nJoin channel dulu boss buat pake bot.`,
                reply_markup: { inline_keyboard: [[{ text: '➕ JOIN CHANNEL', url: config.channelUrl }]] }
            });
        }
    }

    // 3. DOWNLOAD MEDIA JIKA ADA
    if (fileId) {
        console.log(`⚫ [DOWNLOAD] Mengambil file ${fileType}...`);
        try {
            const downloadPath = await bot.downloadFile(fileId, TEMP_DIR);
            filePathOnVps = downloadPath;
        } catch (e) { console.log('⚫ [DL-ERR]', e.message); }
    }

    // 4. EXECUTE PLUGIN
    const argsArr = text.slice(1).trim().split(/ +/);
    const command = argsArr.shift().toLowerCase();
    const argString = text.replace(`/${command}`, '').trim();

    const extensions = { '.js': 'node', '.py': 'python3', '.go': 'go run' };
    let found = false;

    for (const [ext, runner] of Object.entries(extensions)) {
        const pluginPath = path.join(PLUGINS_DIR, `${command}${ext}`);
        if (fs.existsSync(pluginPath)) {
            found = true;
            installMissingPackages(pluginPath, ext);

            // Susunan Argumen: 1.chatId 2.userId 3.teks/caption 4.file_path 5.file_type 6.thumb
            const cmdToExec = `${runner} "${pluginPath}" "${chatId}" "${userId}" "${argString}" "${filePathOnVps}" "${fileType}" "${global.thumb}"`;

            console.log(`⚪ [EXEC] /${command} by ${username}`);
            
            exec(cmdToExec, (error, stdout, stderr) => {
                // Hapus file temp setelah diolah plugin biar RAM/Disk ga penuh
                if (filePathOnVps !== 'none' && fs.existsSync(filePathOnVps)) {
                    setTimeout(() => fs.unlinkSync(filePathOnVps), 5000); 
                }

                if (error || stderr) return console.log(`⚫ [PLUGIN-ERR]`, stderr || error.message);
                
                const out = stdout.trim();
                if (!out) return;

                // FITUR: Jika plugin output "SEND_FILE:path_ke_file|caption"
                if (out.startsWith('SEND_FILE:')) {
                    const [fPath, ...cap] = out.replace('SEND_FILE:', '').split('|');
                    bot.sendDocument(chatId, fPath.trim(), { caption: cap.join('|') || '' });
                } else {
                    bot.sendMessage(chatId, out, { parse_mode: 'Markdown' });
                }
            });
            break;
        }
    }
    if (!found && text.startsWith('/')) console.log(`⚫ [SKIP] Command /${command} tidak ada.`);
});
