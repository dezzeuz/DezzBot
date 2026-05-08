const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ==========================================
// ANTI CRASH & KONFIGURASI
// ==========================================
process.on('uncaughtException', (err) => console.log('[BOSS ERROR]', err.message));
process.on('unhandledRejection', (err) => console.log('[BOSS ERROR]', err.message));

// MASUKIN TOKEN LU DI SINI
const token = '8741013211:AAGBW4n3ebT2TMx_ljzUF2-MWOxbHFNDu0M'; 
const bot = new TelegramBot(token, { polling: true });

const OWNER_ID = '8302651892'; // ID lu
const CHANNEL_ID = '-1003564796583'; // ID Channel lu
const LOG_POST_ID = 11; // ID postingan buat naruh komen log

const PLUGINS_DIR = path.join(__dirname, 'plugins');
const USERS_DB = path.join(__dirname, 'users.json');

// Bikin folder & database kalo belum ada
if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR);
if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, '[]'); // Bikin file array kosong

console.log('🤖 BOSS udah nyala! Fitur Force Sub & Log User AKTIF...\n');

bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const text = msg.text || '';
    const username = msg.from.username || msg.from.first_name || 'Unknown';

    // 1. CEK USER BARU & KIRIM LOG KOMEN
    let users = JSON.parse(fs.readFileSync(USERS_DB));
    if (!users.includes(userId)) {
        users.push(userId);
        fs.writeFileSync(USERS_DB, JSON.stringify(users)); // Simpan ke database

        const logText = `🚨 **LOG NEW USER**\n👤 Nama: ${username}\n🆔 ID: \`${userId}\`\n💬 Masuk lewat chat PM.`;
        
        // Bot ngirim log dengan me-reply postingan ID 11 di channel
        bot.sendMessage(CHANNEL_ID, logText, { 
            parse_mode: 'Markdown',
            reply_to_message_id: LOG_POST_ID 
        }).catch(err => console.log('[⚠️ ERROR LOG]', err.message));

        console.log(`[🎉 USER BARU] ${username} (${userId})`);
    }

    console.log(`[📥 CHAT MASUK] Dari: ${username} | Pesan: "${text}"`);

    // Kalo bukan command, kacangin
    if (!text.startsWith('/')) return; 

    // 2. FITUR WAJIB FOLLOW (FORCE SUBSCRIBE) KHUSUS DI PM
    if (msg.chat.type === 'private') {
        try {
            const member = await bot.getChatMember(CHANNEL_ID, userId);
            const status = member.status;

            // Kalau user statusnya left atau kicked (belum join / keluar)
            if (status === 'left' || status === 'kicked') {
                const joinMsg = `⚠️ **WAJIB FOLLOW DULU BOSS!**\n\nLu belum join channel gua. Wajib follow dulu buat pake bot ini.`;
                
                bot.sendMessage(chatId, joinMsg, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📢 Join Channel Dezz', url: 'https://t.me/ChannelDezz' }]
                        ]
                    }
                });
                return; // Berhenti di sini, command nggak bakal dilanjutin ke plugin
            }
        } catch (error) {
            console.log('[⚠️ ERROR FORCE SUB]', error.message);
            // Kalau bot bukan admin di channel, dia bakal error. Kita kasih tau lu (owner)
            if (userId === OWNER_ID) {
                bot.sendMessage(chatId, `⚠️ Bot gagal ngecek member. Pastiin bot udah diangkat jadi **Admin** di channel ${CHANNEL_ID}!`);
            }
        }
    }

    // ==========================================
    // AUTO LOAD SYSTEM (Lempar ke Pekerja)
    // ==========================================
    const args = text.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase(); 
    const argString = text.replace(`/${command}`, '').trim(); 

    const jsPlugin = path.join(PLUGINS_DIR, `${command}.js`);
    const pyPlugin = path.join(PLUGINS_DIR, `${command}.py`);
    const goPlugin = path.join(PLUGINS_DIR, `${command}.go`);

    let execCommand = '';

    if (fs.existsSync(jsPlugin)) {
        execCommand = `node "${jsPlugin}" "${chatId}" "${userId}" "${argString}"`;
    } else if (fs.existsSync(pyPlugin)) {
        execCommand = `python3 "${pyPlugin}" "${chatId}" "${userId}" "${argString}"`;
    } else if (fs.existsSync(goPlugin)) {
        execCommand = `go run "${goPlugin}" "${chatId}" "${userId}" "${argString}"`;
    } else {
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
        }
    });
});
