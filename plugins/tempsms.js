const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

const args = process.argv.slice(2);
const chatId = args[0];
const userId = args[1];
const query = args[2] ? args[2].trim() : '';

const bot = new TelegramBot(config.botToken);

const BASE_URL = "https://veepn.com/online-sms/countries/indonesia";
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://veepn.com/"
};

(async () => {
    try {
        // ==========================================
        // MODE 1: AUTO GET SMS (MENAMPILKAN INBOX)
        // ==========================================
        if (query) {
            const targetNumber = query.replace(/[^0-9]/g, '');
            const loadMsg = await bot.sendMessage(chatId, `⚪ **TEMPSMS ENGINE** ⚪\n\n⏳ Sedang menyadap kotak masuk \`${targetNumber}\`...`, { parse_mode: 'Markdown' });

            const res = await axios.get(`${BASE_URL}/${targetNumber}/?page=1&count=10`, { headers: HEADERS });
            const data = res.data.data;

            // Layout Tombol untuk Auto-Refresh
            const keyboard = {
                inline_keyboard: [
                    [{ text: "🔄 REFRESH SMS BARU", callback_data: `/tempsms ${targetNumber}` }],
                    [{ text: "🔙 KEMBALI KE MENU", callback_data: `/tempsms` }]
                ]
            };

            if (!data || data.length === 0) {
                await bot.editMessageText(`⚫ **INBOX KOSONG**\n\nBelum ada pesan / OTP yang masuk ke nomor \`${targetNumber}\`.\n*Klik Refresh untuk menyadap ulang.*`, { 
                    chat_id: chatId, 
                    message_id: loadMsg.message_id, 
                    parse_mode: 'Markdown', 
                    reply_markup: keyboard 
                });
                process.exit(0);
            }

            let resultText = `⚪ **INBOX: ${targetNumber}** ⚪\n\n`;
            // Cukup tampilkan 5 SMS teratas biar gak kepanjangan
            data.slice(0, 5).forEach((sms, index) => {
                const sender = sms.in_number || "Unknown";
                const time = sms.data_humans || sms.created_at;
                const msg = sms.text.replace(/\n/g, ' ');

                resultText += `**${index + 1}. Dari: \`${sender}\`** _(${time})_\n`;
                resultText += `💬 \`${msg}\`\n`;
                resultText += `+-----------------------------------------+\n`;
            });

            await bot.editMessageText(resultText, { 
                chat_id: chatId, 
                message_id: loadMsg.message_id, 
                parse_mode: 'Markdown', 
                reply_markup: keyboard 
            });
            process.exit(0);
        } 
        
        // ==========================================
        // MODE 2: MENAMPILKAN DAFTAR NOMOR (FULL BUTTONS)
        // ==========================================
        else {
            const loadMsg = await bot.sendMessage(chatId, `⚪ **TEMPSMS ENGINE** ⚪\n\n⏳ Mengambil daftar nomor virtual Indonesia...`, { parse_mode: 'Markdown' });

            const res = await axios.get(`${BASE_URL}/`, { headers: HEADERS });
            const numbers = res.data;

            if (!numbers || numbers.length === 0) {
                await bot.editMessageText(`⚫ **ERROR**\n\nSistem gagal menemukan nomor aktif dari server.`, { chat_id: chatId, message_id: loadMsg.message_id, parse_mode: 'Markdown' });
                process.exit(0);
            }

            let resultText = `⚪ **INDONESIAN VIRTUAL NUMBERS** ⚪\n\n*Pilih nomor dari tombol di bawah ini untuk melihat SMS / OTP masuk:*`;

            let inline_keyboard = [];
            // Ambil 10 nomor teratas, disusun 2 tombol per baris
            const limit = Math.min(numbers.length, 10);
            for (let i = 0; i < limit; i += 2) {
                let row = [];
                row.push({ text: `🇮🇩 ${numbers[i].number}`, callback_data: `/tempsms ${numbers[i].full_number}` });
                if (i + 1 < limit) {
                    row.push({ text: `🇮🇩 ${numbers[i+1].number}`, callback_data: `/tempsms ${numbers[i+1].full_number}` });
                }
                inline_keyboard.push(row);
            }
            
            // Tambahkan tombol refresh list di paling bawah
            inline_keyboard.push([{ text: "🔄 REFRESH DAFTAR NOMOR", callback_data: "/tempsms" }]);

            await bot.editMessageText(resultText, { 
                chat_id: chatId, 
                message_id: loadMsg.message_id, 
                parse_mode: 'Markdown', 
                reply_markup: { inline_keyboard } 
            });
            process.exit(0);
        }

    } catch (error) {
        console.log(`⚫ **SYSTEM FAILURE**\nSistem gagal terhubung ke VeePN API: ${error.message}`);
        process.exit(0);
    }
})();
