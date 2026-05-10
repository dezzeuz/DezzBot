const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

// Tangkap argumen dari index.js
const args = process.argv.slice(2);
const chatId = args[0];
const userId = args[1];
const query = args[2] ? args[2].trim() : '';

// Setup bot untuk kirim pesan langsung (bypass blocking)
const bot = new TelegramBot(config.botToken);

// ==========================================
// VEEPN SMS API CONFIGURATION
// ==========================================
const BASE_URL = "https://veepn.com/online-sms/countries/indonesia";
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://veepn.com/"
};

// ==========================================
// MAIN EXECUTION
// ==========================================
(async () => {
    try {
        // MODE 1: CEK INBOX (JIKA ADA INPUT NOMOR)
        if (query) {
            // Bersihin spasi atau tanda '+' kalau user iseng masukin
            const targetNumber = query.replace(/[^0-9]/g, '');
            
            const loadMsg = await bot.sendMessage(chatId, `⚪ **TEMPSMS ENGINE** ⚪\n\n⏳ Sedang menyadap kotak masuk untuk nomor \`${targetNumber}\`...`, { parse_mode: 'Markdown' });

            const res = await axios.get(`${BASE_URL}/${targetNumber}/?page=1&count=10`, { headers: HEADERS });
            const data = res.data.data;

            if (!data || data.length === 0) {
                await bot.editMessageText(`⚫ **INBOX KOSONG**\n\nTidak ada pesan atau OTP baru di nomor \`${targetNumber}\`.`, { chat_id: chatId, message_id: loadMsg.message_id, parse_mode: 'Markdown' });
                process.exit(0);
            }

            let resultText = `⚪ **INBOX: ${targetNumber}** ⚪\n\n`;
            resultText += `*Menampilkan 10 pesan SMS terakhir:*\n\n`;

            data.forEach((sms, index) => {
                // Rapihkan format pesan
                const sender = sms.in_number || "Unknown";
                const time = sms.data_humans || sms.created_at;
                const msg = sms.text.replace(/\n/g, ' '); // Hilangkan enter biar rapi

                resultText += `**${index + 1}. Dari: \`${sender}\`** (${time})\n`;
                resultText += `💬 \`${msg}\`\n`;
                resultText += `+-----------------------------------------+\n`;
            });

            resultText += `\n> *(+)* \`Data ditarik menggunakan Lobster V4.0\``;

            // Update pesan loading dengan hasil inbox
            await bot.editMessageText(resultText, { chat_id: chatId, message_id: loadMsg.message_id, parse_mode: 'Markdown' });
            process.exit(0);
        } 
        
        // MODE 2: LIST NOMOR TERSEDIA (JIKA INPUT KOSONG)
        else {
            const loadMsg = await bot.sendMessage(chatId, `⚪ **TEMPSMS ENGINE** ⚪\n\n⏳ Mengambil daftar nomor virtual Indonesia...`, { parse_mode: 'Markdown' });

            const res = await axios.get(`${BASE_URL}/`, { headers: HEADERS });
            const numbers = res.data;

            if (!numbers || numbers.length === 0) {
                await bot.editMessageText(`⚫ **ERROR**\n\nSistem gagal menemukan nomor aktif dari server.`, { chat_id: chatId, message_id: loadMsg.message_id, parse_mode: 'Markdown' });
                process.exit(0);
            }

            let resultText = `⚪ **INDONESIAN VIRTUAL NUMBERS** ⚪\n\n`;
            resultText += `*Pilih nomor di bawah ini untuk mendaftar akun/menerima OTP:*\n\n`;

            // Ambil 15 nomor teratas biar chat nggak terlalu panjang
            const limit = Math.min(numbers.length, 15);
            for (let i = 0; i < limit; i++) {
                const numData = numbers[i];
                const status = numData.is_archive ? "🗄️ Archived" : "🟢 Active";
                resultText += `**${i + 1}.** \`${numData.full_number}\` _(${status})_\n`;
            }

            resultText += `\n> 💡 **Cara Cek Pesan / OTP:**\n> Ketik \`/tempsms [nomor]\`\n> Contoh: \`/tempsms 6282122789908\``;

            // Update pesan loading
            await bot.editMessageText(resultText, { chat_id: chatId, message_id: loadMsg.message_id, parse_mode: 'Markdown' });
            process.exit(0);
        }

    } catch (error) {
        console.log(`⚫ **SYSTEM FAILURE**\nSistem gagal terhubung ke VeePN API: ${error.message}`);
        process.exit(0);
    }
})();
