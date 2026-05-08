const TelegramBot = require('node-telegram-bot-api');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Anti Crash
process.on('uncaughtException', (err) => console.log('[BOSS ERROR]', err.message));
process.on('unhandledRejection', (err) => console.log('[BOSS ERROR]', err.message));

const bot = new TelegramBot(config.botToken, { polling: true });
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const USERS_DB = path.join(__dirname, 'users.json');

if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR);
if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, '[]');

console.log('🤖 BOSS AKTIF! Fitur: Force Sub, Auto-Log Comment, & Auto-Installer.\n');

// Fungsi Auto-Installer Package
function installMissingPackages(filePath, ext) {
    const content = fs.readFileSync(filePath, 'utf8');
    let packages = [];

    if (ext === '.js') {
        const matches = content.match(/require\(['"](.+?)['"]\)/g);
        if (matches) {
            packages = matches.map(m => m.match(/['"](.+?)['"]/)[1])
                .filter(p => !p.startsWith('.') && !p.includes('/') && !require('module').builtinModules.includes(p));
        }
        packages.forEach(pkg => {
            try { require.resolve(pkg); } 
            catch (e) {
                console.log(`[📦 INSTALL] Node.js package: ${pkg}...`);
                execSync(`npm install ${pkg}`);
            }
        });
    } else if (ext === '.py') {
        const matches = content.match(/^(?:import|from)\s+([^\s\.]+)/gm);
        if (matches) {
            packages = matches.map(m => m.replace(/^(import|from)\s+/, '').trim())
                .filter(p => !['sys', 'os', 'json', 'urllib', 'time', 're', 'math'].includes(p));
        }
        packages.forEach(pkg => {
            console.log(`[📦 INSTALL] Python package: ${pkg}...`);
            execSync(`pip install ${pkg} --break-system-packages`);
        });
    } else if (ext === '.go') {
        console.log(`[📦 INSTALL] Go Dependencies...`);
        execSync(`go get -u ./...`, { cwd: PLUGINS_DIR });
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const text = msg.text || '';
    const username = msg.from.username || msg.from.first_name || 'User';

    // 1. LOG NEW USER (Komen di Postingan Spesifik)
    let users = JSON.parse(fs.readFileSync(USERS_DB));
    if (!users.includes(userId)) {
        users.push(userId);
        fs.writeFileSync(USERS_DB, JSON.stringify(users));

        const logText = `🚨 **LOG NEW USER**\n👤 User: ${username}\n🆔 ID: \`${userId}\`\n✅ Status: Berhasil terdaftar.`;
        
        bot.sendMessage(config.logChatId, logText, { 
            parse_mode: 'Markdown',
            reply_to_message_id: config.logMsgId 
        }).catch(err => console.log('[⚠️ LOG ERROR]', err.message));
    }

    console.log(`[📥 CHAT] ${username}: "${text}"`);
    if (!text.startsWith('/')) return;

    // 2. FORCE SUBSCRIBE (Hanya di Private Chat)
    if (msg.chat.type === 'private') {
        try {
            const member = await bot.getChatMember(config.channelId, userId);
            if (['left', 'kicked'].includes(member.status)) {
                return bot.sendMessage(chatId, `⚠️ **AKSES DITOLAK**\n\nLu wajib follow channel gua dulu boss sebelum bisa pake fitur bot!`, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{ text: '📢 Join Channel', url: config.channelUrl }]] }
                });
            }
        } catch (e) {
            if (userId === config.ownerId) bot.sendMessage(chatId, "⚠️ Cek admin channel!");
        }
    }

    // 3. PLUGIN LOADER & AUTO INSTALLER
    const args = text.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const argString = text.replace(`/${command}`, '').trim();

    const files = {
        '.js': path.join(PLUGINS_DIR, `${command}.js`),
        '.py': path.join(PLUGINS_DIR, `${command}.py`),
        '.go': path.join(PLUGINS_DIR, `${command}.go`)
    };

    let execCmd = '';
    let extUsed = '';

    for (const [ext, filePath] of Object.entries(files)) {
        if (fs.existsSync(filePath)) {
            installMissingPackages(filePath, ext); // Cek & Install Package
            if (ext === '.js') execCmd = `node "${filePath}" "${chatId}" "${userId}" "${argString}"`;
            if (ext === '.py') execCmd = `python3 "${filePath}" "${chatId}" "${userId}" "${argString}"`;
            if (ext === '.go') execCmd = `go run "${filePath}" "${chatId}" "${userId}" "${argString}"`;
            extUsed = ext;
            break;
        }
    }

    if (!execCmd) return;

    exec(execCmd, (error, stdout, stderr) => {
        if (error || stderr) return console.log(`[❌ ERR /${command}]`, stderr || error.message);
        const reply = stdout.trim();
        if (reply) bot.sendMessage(chatId, reply);
    });
});
