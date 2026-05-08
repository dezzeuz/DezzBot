// Parameter yang dikirim bos masuk ke process.argv
// [0] node, [1] path_file, [2] chatId, [3] userId, [4] text
const args = process.argv.slice(2);
const chatId = args[0];
const userId = args[1];
const text = args[2];

// Cetak ke layar = otomatis dikirim ke Telegram sama Boss
console.log(`Pong! 🏓\nUser ID lu: ${userId}`);
