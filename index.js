const TelegramBot = require('node-telegram-bot-api');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Set Global Thumbnail biar bisa dipanggil di mana aja dalam index.js
global.thumb = config.thumb;

// ==========================================
// ANTI-CRASH SYSTEM (Boss Mode)
// ==========================================
process.on('uncaughtException', (err) => console.log('⚪ [ERROR]', err.message));
process.on('unhandledRejection', (err) => console.log('⚪ [REJECTION]', err.message));

const bot = new TelegramBot(config.botToken, { polling: true });
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const USERS_DB = path.join(__dirname, 'users.json');

if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR);
if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, '[]');

console.log('⚪ ——————————————————————————————————— ⚪');
console.log('🤖 DEZZ-BOT SYSTEM ONLINE');
console.log('🛠️  MODE: MULTI-LANGUAGE (JS, PY, GO)');
console.log('⚪ ——————————————————————————————————— ⚪\n');

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
                        console.log(`⚫ [INSTALL] Node.js Package: ${pkg}`);
                        execSync(`npm install ${pkg}`);
                    }
                });
            }
        } else if (ext === '.py') {
            const matches = content.match(/^(?:import|from)\s+([^\s\.]+)/gm);
            if (matches) {
                const packages = matches.map(m => m.replace(/^(import|from)\s+/, '').trim())
                    .filter(p => !['sys', 'os', 'json', 'urllib', 'time', 're', 'math'].includes(p));
                packages.forEach(pkg => {
                    console.log(`⚫ [INSTALL] Python Package: ${pkg}`);
                    execSync(`pip install ${pkg} --break-system-packages`);
                });
            }
        } else if (ext === '.go') {
            const goModPath = path.join(PLUGINS_DIR, 'go.mod');
            if (!fs.existsSync(goModPath)) {
                execSync(`go mod init botplugins`, { cwd: PLUGINS_DIR });
            }
            execSync(`go mod tidy`, { cwd: PLUGINS_DIR });
        }
    } catch (err) {
        console.log(`⚫ [INSTALL FAIL] ${ext}:`, err.message);
    }
}

// ==========================================
// MESSAGE HANDLER
// ==========================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const text = msg.text || '';
    const username = msg.from.username || msg.from.first_name || 'User';

    // 1. AUTO LOG NEW USER (COMMENT SYSTEM)
    let users = JSON.parse(fs.readFileSync(USERS_DB));
    if (!users.includes(userId)) {
        users.push(userId);
        fs.writeFileSync(USERS_DB, JSON.stringify(users));

        const logMsg = `⚪ **NEW USER DETECTED** ⚪\n\n👤 **Name:** ${username}\n🆔 **ID:** \`${userId}\`\n📅 **Date:** ${new Date().toLocaleString()}`;
        bot.sendMessage(config.logChatId, logMsg, { 
            parse_mode: 'Markdown',
            reply_to_message_id: config.logMsgId 
        }).catch(() => {});
    }

    console.log(`⚪ [CHAT] ${username}: ${text}`);
    if (!text.startsWith('/')) return;

    // 2. FORCE SUBSCRIBE (PREMIUM UI)
    if (msg.chat.type === 'private') {
        try {
            const member = await bot.getChatMember(config.channelId, userId);
            if (['left', 'kicked'].includes(member.status)) {
                return bot.sendPhoto(chatId, global.thumb, {
                    caption: `⚪ **ACCESS DENIED** ⚪\n\nMaaf boss, lu harus gabung ke channel dulu untuk menggunakan layanan ini.\n\nKlik tombol di bawah untuk join!`,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '➕ JOIN CHANNEL', url: config.channelUrl }]]
                    }
                });
            }
        } catch (e) {
            if (userId === config.ownerId) bot.sendMessage(chatId, "⚫ Bot harus admin di channel!");
        }
    }

    // 3. PLUGIN ENGINE
    const args = text.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const argString = text.replace(`/${command}`, '').trim();

    const files = {
        '.js': path.join(PLUGINS_DIR, `${command}.js`),
        '.py': path.join(PLUGINS_DIR, `${command}.py`),
        '.go': path.join(PLUGINS_DIR, `${command}.go`)
    };

    let execCmd = '';
    for (const [ext, filePath] of Object.entries(files)) {
        if (fs.existsSync(filePath)) {
            installMissingPackages(filePath, ext);
            // Tambahin argumen ke-4 sebagai Global Thumbnail agar plugin bisa baca
            const baseCmd = `"${chatId}" "${userId}" "${argString}" "${global.thumb}"`;
            if (ext === '.js') execCmd = `node "${filePath}" ${baseCmd}`;
            if (ext === '.py') execCmd = `python3 "${filePath}" ${baseCmd}`;
            if (ext === '.go') execCmd = `go run "${filePath}" ${baseCmd}`;
            break;
        }
    }

    if (!execCmd) return;

    exec(execCmd, (error, stdout, stderr) => {
        if (error || stderr) {
            console.log(`⚫ [CMD ERR] /${command}:`, stderr || error.message);
            return;
        }
        const reply = stdout.trim();
        if (reply) bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
    });
});
