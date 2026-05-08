const TelegramBot = require('node-telegram-bot-api');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('./config');

// ASCII ART DEZZIFY - PREMIUM MONOCHROME
const ASCII = `
\x1b[37m  _____  ______ ________ ________ _____ ______驰 __   __
 |  __ \\|  ____|___  /|___  /|_   _|  ____| \\ \\ / /
 | |  | | |__     / /    / /   | | | |__     \\ V / 
 | |  | |  __|   / /    / /    | | |  __|     | |  
 | |__| | |____ / /__  / /__  _| |_| |        | |  
 |_____/|______|/____|/____||_____|_|        |_|  \x1b[0m
                                                   
    \x1b[90mSTAY PREMIUM • NOT A DEVELOPER • SINCE 2026\x1b[0m
\x1b[37m⚪ ———————————————————————————————————————————————— ⚪\x1b[0m`;

global.thumb = config.thumb;
const bot = new TelegramBot(config.botToken, { polling: true });
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const TEMP_DIR = path.join(__dirname, 'temp');
const DB_DIR = path.join(__dirname, 'database');

const USERS_DB = path.join(DB_DIR, 'users.json');
const BANNED_DB = path.join(DB_DIR, 'banned.json');

// Initialize folders & files
[PLUGINS_DIR, TEMP_DIR, DB_DIR].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir); });
if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, '[]');
if (!fs.existsSync(BANNED_DB)) fs.writeFileSync(BANNED_DB, '[]');

// ==========================================
// PRETTY CONSOLE LOGGING (FOR JJ CONTENT)
// ==========================================
console.clear();
console.log(ASCII);
console.log(`\x1b[37m[ ${new Date().toLocaleTimeString()} ] ⚪ SYSTEM: \x1b[1mDEZZIFY INFINITY ENGINE V3\x1b[0m`);
console.log(`\x1b[37m[ ${new Date().toLocaleTimeString()} ] ⚪ NODE: \x1b[1m${process.version}\x1b[0m`);
console.log(`\x1b[37m[ ${new Date().toLocaleTimeString()} ] ⚪ RAM: \x1b[1m8GB (VPS NAT ENABLED)\x1b[0m`);
console.log(`\x1b[37m[ ${new Date().toLocaleTimeString()} ] ⚪ LOC: \x1b[1mBandar Lampung, Indonesia\x1b[0m`);
console.log(`\x1b[37m[ ${new Date().toLocaleTimeString()} ] ⚪ STATUS: \x1b[32mSTABLE & ONLINE\x1b[0m`);
console.log(`\x1b[37m⚪ ———————————————————————————————————————————————— ⚪\x1b[0m`);

// TAMPILAN SUPPORT BAHASA (INI YANG LU MAU)
console.log(`\x1b[1m\x1b[37m    SUPPORTED LANGUAGES & ENGINES:\x1b[0m`);
const languages = [
    { lang: 'Node.js', ext: '.js', status: '✅ READY' },
    { lang: 'Python', ext: '.py', status: '✅ READY' },
    { lang: 'Golang', ext: '.go', status: '✅ READY' },
    { lang: 'PHP-Cli', ext: '.php', status: '✅ READY' },
    { lang: 'Bash/SH', ext: '.sh', status: '✅ READY' },
    { lang: 'TypeScript', ext: '.ts', status: '✅ READY' },
    { lang: 'Ruby', ext: '.rb', status: '✅ READY' },
    { lang: 'C++/Binary', ext: '.cpp', status: '✅ READY' },
    { lang: 'Rust/Cargo', ext: '.rs', status: '✅ READY' },
    { lang: 'Java/JDK', ext: '.java', status: '✅ READY' }
];
languages.forEach(l => {
    console.log(`    \x1b[90m> ${l.lang.padEnd(12)} (${l.ext.padEnd(5)})  \x1b[37m${l.status}\x1b[0m`);
});
console.log(`\x1b[37m⚪ ———————————————————————————————————————————————— ⚪\x1b[0m\n`);

process.on('uncaughtException', (err) => console.log(`\x1b[31m[ ERROR ] ${err.message}\x1b[0m`));

// ==========================================
// AUTO-INSTALLER ENGINE
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
                        try { require.resolve(pkg); } catch (e) { 
                            console.log(`\x1b[90m[ AUTO-INSTALL ] Installing Node package: ${pkg}\x1b[0m`);
                            execSync(`npm install ${pkg}`); 
                        }
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
                        try { execSync(`pip install ${pkg} --break-system-packages`); } catch (e) {}
                    }
                });
            }
        } else if (ext === '.cpp') { execSync(`g++ "${filePath}" -o "${filePath.replace('.cpp', '.out')}"`); }
        else if (ext === '.java') { execSync(`javac "${filePath}"`); }
        else if (ext === '.rs') { execSync(`rustc "${filePath}" -o "${filePath.replace('.rs', '.bin')}"`); }
    } catch (err) { console.log(`\x1b[31m[ PREP-FAIL ] ${ext}: ${err.message}\x1b[0m`); }
}

// ==========================================
// MESSAGE HANDLER
// ==========================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const username = msg.from.username || msg.from.first_name || 'User';
    let text = msg.text || msg.caption || '';
    
    // Log Chat to Console (JJ Style)
    console.log(`\x1b[37m[ ${new Date().toLocaleTimeString()} ] ⚪\x1b[0m \x1b[1m${username}\x1b[0m: ${text.substring(0, 50)}`);

    if (JSON.parse(fs.readFileSync(BANNED_DB)).includes(userId)) return;

    // Database Log
    let users = JSON.parse(fs.readFileSync(USERS_DB));
    if (!users.includes(userId)) {
        users.push(userId);
        fs.writeFileSync(USERS_DB, JSON.stringify(users));
        bot.sendMessage(config.logChatId, `⚪ **DEZZIFY LOG**\n👤 ${username} (\`${userId}\`)`, { reply_to_message_id: config.logMsgId, parse_mode: 'Markdown' }).catch(() => {});
    }

    if (!text.startsWith('/')) return;

    const argsArr = text.slice(1).trim().split(/ +/);
    const command = argsArr.shift().toLowerCase();
    const q = text.replace(`/${command}`, '').trim();

    const extensions = { 
        '.js': 'node', '.py': 'python3', '.go': 'go run', '.php': 'php', 
        '.sh': 'bash', '.ts': 'npx ts-node', '.rb': 'ruby', 
        '.cpp': './' + command + '.out', '.rs': './' + command + '.bin', '.java': 'java'
    };

    let filePathOnVps = 'none', fileType = 'none';
    if (msg.photo) { filePathOnVps = await bot.downloadFile(msg.photo[msg.photo.length-1].file_id, TEMP_DIR); fileType = 'photo'; }
    else if (msg.document) { filePathOnVps = await bot.downloadFile(msg.document.file_id, TEMP_DIR); fileType = 'document'; }

    for (const [ext, runner] of Object.entries(extensions)) {
        const pluginPath = path.join(PLUGINS_DIR, `${command}${ext}`);
        if (fs.existsSync(pluginPath)) {
            preparePlugin(pluginPath, ext);
            
            let finalRunner = runner, finalPath = pluginPath;
            if (ext === '.java') finalPath = command; 
            if (ext === '.cpp' || ext === '.rs') {
                finalRunner = '';
                finalPath = path.join(PLUGINS_DIR, (ext === '.cpp' ? command + '.out' : command + '.bin'));
            }

            const cmdToExec = `${finalRunner} "${finalPath}" "${chatId}" "${userId}" "${q}" "${filePathOnVps}" "${fileType}" "${global.thumb}"`;
            
            exec(cmdToExec, { cwd: PLUGINS_DIR }, (error, stdout, stderr) => {
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
