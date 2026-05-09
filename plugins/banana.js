const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

// Tangkap argumen dari The Boss (index.js)
const args = process.argv.slice(2);
const chatId = args[0];
const userId = args[1];
const prompt = args[2] || '';

// Setup Telegram Bot buat Live Update
const bot = new TelegramBot(config.botToken);

if (!prompt) {
    console.log("⚪ **PENGGUNAAN AI BANANA** ⚪\n\nKetik `/banana [prompt]` buat bikin gambar anime/realistis.\nContoh: `/banana cyberpunk city, neon lights, 4k`");
    process.exit(0);
}

// ==========================================
// CLOUDFLARE TURNSTILE BYPASS ENGINE
// ==========================================
class TurnstileSolver {
    constructor() {
        this.solverURL = "https://cf-solver-renofc.my.id/api/solvebeta";
    }

    async solve(url, siteKey, mode = "turnstile-min") {
        const response = await axios.post(this.solverURL, {
            url: url,
            siteKey: siteKey,
            mode: mode
        }, {
            headers: { "Content-Type": "application/json" }
        });
        return response.data.token.result.token;
    }
}

// ==========================================
// AIBANANA GENERATOR CORE
// ==========================================
class AIBanana {
    constructor() {
        this.baseURL = "https://aibanana.net";
        this.siteKey = "0x4AAAAAAB2-fh9F_EBQqG2_";
        this.solver = new TurnstileSolver();
    }

    generateFingerprint() { return crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex"); }
    generateDeviceId() { return crypto.randomBytes(8).toString("hex"); }

    generateRandomUserAgent() {
        const osList = ["Windows NT 10.0; Win64; x64", "Macintosh; Intel Mac OS X 10_15_7", "X11; Linux x86_64", "Windows NT 6.1; Win64; x64"];
        const os = osList[Math.floor(Math.random() * osList.length)];
        const chromeVersion = Math.floor(Math.random() * 40) + 100;
        return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
    }

    generateRandomViewport() {
        const resolutions = [ { w: 1366, h: 768 }, { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 1536, h: 864 } ];
        return resolutions[Math.floor(Math.random() * resolutions.length)];
    }

    generateRandomPlatform() { return ["Windows", "Linux", "macOS", "Chrome OS"][Math.floor(Math.random() * 4)]; }
    generateRandomLanguage() { return ["en-US,en;q=0.9", "id-ID,id;q=0.9,en-US;q=0.8", "en-GB,en;q=0.9"][Math.floor(Math.random() * 3)]; }

    async generateImage(prompt) {
        const turnstileToken = await this.solver.solve(this.baseURL, this.siteKey, "turnstile-min");
        const fingerprint = this.generateFingerprint();
        const deviceId = this.generateDeviceId();
        const userAgent = this.generateRandomUserAgent();
        const viewport = this.generateRandomViewport();
        const platform = this.generateRandomPlatform();
        const language = this.generateRandomLanguage();
        const chromeVersion = Math.floor(Math.random() * 30) + 110;

        const response = await axios.post(`${this.baseURL}/api/image-generation`, {
            prompt: prompt,
            model: "nano-banana-2",
            mode: "text-to-image",
            numImages: 1,
            aspectRatio: "1:1",
            clientFingerprint: fingerprint,
            turnstileToken: turnstileToken,
            deviceId: deviceId
        }, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Accept-Language": language,
                "Origin": this.baseURL,
                "Referer": `${this.baseURL}/`,
                "User-Agent": userAgent,
                "Sec-Ch-Ua": `"Chromium";v="${chromeVersion}", "Not-A.Brand";v="24", "Google Chrome";v="${chromeVersion}"`,
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": `"${platform}"`,
                "Viewport-Width": viewport.w.toString(),
                "Viewport-Height": viewport.h.toString(),
                "X-Forwarded-For": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
            }
        });

        return response.data;
    }
}

// ==========================================
// EXECUTION & TELEGRAM INTEGRATION
// ==========================================
(async () => {
    // 1. Kirim pesan Loading
    const loadMsg = await bot.sendMessage(chatId, "⚪ **AIBANANA ENGINE** ⚪\n\n🛡️ `Status: Bypassing Cloudflare Turnstile...`\n⏳ Sedang menyiapkan token dan memecahkan captcha rahasia...", { parse_mode: 'Markdown' });

    try {
        const banana = new AIBanana();
        
        // 2. Tembus CF & Generate Gambar
        const result = await banana.generateImage(prompt);

        // Edit pesan biar user tau CF berhasil ditembus
        await bot.editMessageText(`⚪ **AIBANANA ENGINE** ⚪\n\n✅ \`Cloudflare Bypassed!\`\n🎨 Sedang me-render gambar \`Nano-Banana-2\`...`, { chat_id: chatId, message_id: loadMsg.message_id, parse_mode: 'Markdown' }).catch(() => {});

        // 3. Cari URL gambar dari response JSON (Handling struktur API yang dinamis)
        let imgUrl = null;
        if (typeof result === 'string' && result.startsWith('http')) imgUrl = result;
        else if (result.images && result.images[0]) imgUrl = result.images[0];
        else if (result.data && result.data[0] && result.data[0].url) imgUrl = result.data[0].url;
        else if (result[0]) imgUrl = result[0];
        else imgUrl = result.url;

        if (!imgUrl) throw new Error("Gagal parsing URL dari server AIBanana.");

        // 4. Download Gambar ke VPS (Folder temp)
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const imgPath = path.join(tempDir, `banana_${Date.now()}.jpg`);
        const writer = fs.createWriteStream(imgPath);
        const dl = await axios.get(imgUrl, { responseType: 'stream' });
        dl.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // 5. Hapus pesan loading dan instruksikan index.js kirim file
        await bot.deleteMessage(chatId, loadMsg.message_id).catch(() => {});

        const caption = `⚪ **AIBANANA GENERATED** ⚪\n\n📝 **Prompt:** \`${prompt}\`\n🧩 **Model:** \`Nano-Banana-2\`\n🛡️ **Security:** \`Turnstile Bypassed\``;
        
        console.log(`SEND_FILE:${imgPath}|${caption}`);

    } catch (error) {
        await bot.deleteMessage(chatId, loadMsg.message_id).catch(() => {});
        console.log(`⚫ **ERROR**\nSistem gagal menembus Cloudflare atau limit API habis.\nLog: \`${error.message}\``);
    }
    
    process.exit(0);
})();
