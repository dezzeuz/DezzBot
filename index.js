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

console.log('⚪ ——————————————————————————————————— ⚪');
console.log('🤖 DEZZ-BOT INFINITY ENGINE ONLINE');
console.log('🌍 LANGUAGES: JS, PY, GO, PHP, SH, CPP, JAVA, RB, RS, TS');
console.log('⚪ ——————————————————————————————————— ⚪\n');

process.on('uncaughtException', (err) => console.log('⚫ [SYS-ERR]', err.message));

// ==========================================
// AUTO-INSTALLER & COMPILER
// ==========================================
function preparePlugin(filePath, ext) {
    try {
        if (ext === '.js' || ext === '.ts') {
            const content = fs.readFileSync(filePath, 'utf8');
            const matches = content.match(/require\(['"](.+?)['"]\)|import\s+.+?\s+from\s+['"](.+?)['"]/g);
            if (matches) {
                matches.forEach(m => {
                    const pkg = m.match(/['"](.+?)['"]/)[1];
                    if (!pkg.startsWith('.') && !pkg.includes('/') && !require('module').builtinModules.includes(pkg)) {
                        try { require.resolve(pkg); } catch (e) { execSync(`npm install ${pkg}`); }
                    }
                });
            }
        } else if (ext === '.py') {
            const content = fs.readFileSync(filePath, 'utf8');
            const matches = content.match(/^(?:import|from)\s+([^\s\.]+)/gm);
            if (matches) {
                matches.forEach(m => {
                    const pkg = m.replace(/^(import|from)\s+/, '').trim();
                    if (!['sys', 'os', 'json', 'urllib', 'time', 're', 'math'].includes(pkg)) {
                        execSync(`pip install ${pkg} --break-system-packages`);
                    }
                });
            }
        } else if (ext === '.cpp') {
            const outPath = filePath.replace('.cpp', '.out');
            execSync(`g++ "${filePath}" -o "${outPath}"`);
        } else if (ext === '.java') {
            execSync(`javac "${filePath}"`);
        } else if (ext === '.rs') {
            const outPath = filePath.replace('.rs', '.bin');
            execSync(`rustc "${filePath}" -o "${outPath}"`);
        }
    } catch (err) { console.log(`⚫ [PREP-FAIL] ${ext}:`, err.message); }
}

// ==========================================
// MESSAGE HANDLER
// ==========================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const username = msg.from.username || msg.from.first_name || 'User';
    let text = msg.text || msg.caption || '';
    
    if (JSON.parse(fs.readFileSync(BANNED_DB)).includes(userId)) return;

    // Log New User
    let users = JSON.parse(fs.readFileSync(USERS_DB));
    if (!users.includes(userId)) {
        users.push(userId);
        fs.writeFileSync(USERS_DB, JSON.stringify(users));
        bot.sendMessage(config.logChatId, `⚪ **USER BARU**\n👤 ${username} (\`${userId}\`)`, { reply_to_message_id: config.logMsgId, parse_mode: 'Markdown' }).catch(() => {});
    }

    if (!text.startsWith('/')) return;

    const args = text.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const q = text.replace(`/${command}`, '').trim();

    // Mapping Ekstensi & Runner
    const extensions = { 
        '.js': 'node', 
        '.py': 'python3', 
        '.go': 'go run',
        '.php': 'php',
        '.sh': 'bash',
        '.ts': 'npx ts-node',
        '.rb': 'ruby',
        '.cpp': './' + command + '.out',
        '.rs': './' + command + '.bin',
        '.java': 'java'
    };

    let filePathOnVps = 'none', fileType = 'none';
    if (msg.photo) { filePathOnVps = await bot.downloadFile(msg.photo[msg.photo.length-1].file_id, TEMP_DIR); fileType = 'photo'; }
    else if (msg.document) { filePathOnVps = await bot.downloadFile(msg.document.file_id, TEMP_DIR); fileType = 'document'; }

    for (const [ext, runner] of Object.entries(extensions)) {
        const pluginPath = path.join(PLUGINS_DIR, `${command}${ext}`);
        if (fs.existsSync(pluginPath)) {
            preparePlugin(pluginPath, ext);
            
            let finalRunner = runner;
            let finalPath = pluginPath;

            // Handle khusus Java (butuh nama class)
            if (ext === '.java') finalPath = command; 
            // Handle binary (CPP/Rust)
            if (ext === '.cpp' || ext === '.rs') {
                finalRunner = '';
                finalPath = path.join(PLUGINS_DIR, (ext === '.cpp' ? command + '.out' : command + '.bin'));
            }

            const cmdToExec = `${finalRunner} "${finalPath}" "${chatId}" "${userId}" "${q}" "${filePathOnVps}" "${fileType}" "${global.thumb}"`;
            
            exec(cmdToExec, { cwd: PLUGINS_DIR }, (error, stdout, stderr) => {
                if (filePathOnVps !== 'none' && fs.existsSync(filePathOnVps)) setTimeout(() => { try{fs.unlinkSync(filePathOnVps)}catch(e){} }, 5000);
                if (error || stderr) return console.log(`⚫ [PLUGIN-ERR]`, stderr || error.message);
                
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
