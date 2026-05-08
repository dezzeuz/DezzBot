const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

const args = process.argv.slice(2);
const chatId = args[0];
const userId = args[1];
const prompt = args[2] || '';
const file_vps = args[3];
const file_type = args[4];

// Trik Dewa: Panggil bot di dalam plugin buat ngirim live update tanpa nunggu exec() selesai
const bot = new TelegramBot(config.botToken);

if (!prompt && file_type !== 'photo') {
    console.log("⚪ **PENGGUNAAN** ⚪\n\nKirim prompt atau reply gambar boss.\n\n**Contoh:**\n`/aivideo mobil terbang di kota cyberpunk`\n`/aivideo (sambil reply gambar) jadikan animasi`");
    process.exit(0);
}

const baseApi = "https://www.freeaivideos.org";
const headers = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "origin": "https://www.freeaivideos.org",
    "referer": "https://www.freeaivideos.org/",
    "accept": "*/*"
};

async function generateVideo() {
    try {
        // 1. Kirim pesan loading awal
        const msg = await bot.sendMessage(chatId, `⚪ **AI VIDEO ENGINE** ⚪\n\n⏳ Menyiapkan data dan menghubungi server...\n📝 Prompt: \`${prompt || 'Animate this image'}\``, { parse_mode: 'Markdown' });

        let form = new FormData();
        form.append("prompt", prompt || "animate this image");

        // 2. Kalau ada gambar yang dikirim, masukin ke form data
        if (file_type === 'photo' && fs.existsSync(file_vps)) {
            form.append("initialFrame", fs.createReadStream(file_vps));
        }

        // 3. Tembak API
        const res = await axios.post(`${baseApi}/api/video_generation`, form, {
            headers: { ...headers, ...form.getHeaders() },
            timeout: 60000
        });

        const reqId = res.data?.request_id;
            if (!reqId) {
            console.log("⚫ **ERROR**\nGagal mendapatkan ID request dari server. Coba lagi nanti.");
            process.exit(0);
        }

        // 4. Update pesan loading jadi status tracking
        await bot.editMessageText(`⚪ **PROSES DIMULAI** ⚪\n\n🆔 Request ID: \`${reqId}\`\n⏳ Estimasi: 3-10 Menit.\n\n*Sistem OpenClaw sedang memantau proses di background, lu bisa santai atau sambil ngetes fitur lain boss.*`, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown'
        });

        // 5. Polling System (Ngecek status video tiap 5 detik)
        const startTime = Date.now();
        const timeoutMs = 15 * 60 * 1000; // Maksimal nunggu 15 menit
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const pollRes = await axios.get(`${baseApi}/api/video_generation?request_id=${reqId}&prompt=`, { headers });
                
                // Kalau videonya udah jadi
                if (pollRes.data && pollRes.data.video_url) {
                    const vidUrl = pollRes.data.video_url;
                    
                    // Download video ke folder temp VPS
                    const outName = `aivideo_${Date.now()}.mp4`;
                    const tempDir = path.join(__dirname, '..', 'temp');
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
                    const outPath = path.join(tempDir, outName);
                    
                    const writer = fs.createWriteStream(outPath);
                    const dl = await axios.get(vidUrl, { responseType: 'stream' });
                    dl.data.pipe(writer);
                    
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // Hapus pesan loading biar chatnya rapi
                    await bot.deleteMessage(chatId, msg.message_id).catch(() => {});

                    // 6. Output ke index.js biar dikirim filenya
                    const caption = `⚪ **AI VIDEO GENERATED** ⚪\n\n📝 **Prompt:** \`${prompt || 'Animate image'}\`\n🎥 **Engine:** \`FreeAIVideos x Lobster V4.0\`\n\n> *(+)* Selesai diproses oleh engine.`;
                    
                    console.log(`SEND_FILE:${outPath}|${caption}`);
                    process.exit(0);
                }
            } catch (e) {
                // Kalo error pas ngecek (misal server timeout bentar), abaikan aja
            }
            
            // Jeda 5 detik sebelum ngecek lagi
            await new Promise(r => setTimeout(r, 5000));
        }
        
        // Kalo lewat 15 menit belum kelar
        console.log("⚫ **TIMEOUT**\nProses terlalu lama (lebih dari 15 menit), antrean AI sedang penuh.");
        process.exit(0);

    } catch (error) {
        console.log(`⚫ **ERROR**\nSistem AI Gagal: ${error.message}`);
        process.exit(0);
    }
}

generateVideo();
