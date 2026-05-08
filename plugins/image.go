package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"
)

func main() {
	// Urutan Argumen dari index.js (Super Engine):
	// [1]chatId, [2]userId, [3]argString (Prompt), [4]filePathOnVps, [5]fileType, [6]thumb
	if len(os.Args) < 4 || os.Args[3] == "" {
		fmt.Println("⚪ **PENGGUNAAN** ⚪\n\nFormat salah boss. Masukin prompt-nya.\nContoh: `/image Cyberpunk city, monochrome style, 8k`")
		return
	}

	prompt := os.Args[3]
	encodedPrompt := url.QueryEscape(prompt)
	
	// API Pollinations AI
	apiURL := fmt.Sprintf("https://image.pollinations.ai/prompt/%s?width=1024&height=1024&seed=%d&nologo=true", encodedPrompt, time.Now().Unix())

	// Tentukan folder temp (sejajar sama index.js)
	// Kita arahkan ke folder 'temp' biar otomatis dihapus sama index.js setelah dikirim
	cwd, _ := os.Getwd()
	tempDir := filepath.Join(cwd, "temp")
	
	// Bikin nama file unik
	fileName := fmt.Sprintf("ai_gen_%d.jpg", time.Now().UnixMilli())
	filePath := filepath.Join(tempDir, fileName)

	// Proses Download Gambar
	resp, err := http.Get(apiURL)
	if err != nil {
		fmt.Printf("⚫ **ERROR**\nGagal menghubungi server AI: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		fmt.Printf("⚫ **ERROR**\nServer sibuk (Status: %d). Coba lagi nanti boss.", resp.StatusCode)
		return
	}

	// Simpan ke VPS
	out, err := os.Create(filePath)
	if err != nil {
		fmt.Printf("⚫ **ERROR**\nGagal membuat file di VPS: %v", err)
		return
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		fmt.Printf("⚫ **ERROR**\nGagal menulis data gambar: %v", err)
		return
	}

	// Output khusus untuk Super Engine index.js
	// Format: SEND_FILE:path_file|caption
	caption := fmt.Sprintf("⚪ **IMAGE GENERATED** ⚪\n\n💬 **Prompt:** `%s`\n🎨 **Engine:** `Pollinations AI`", prompt)
	
	fmt.Printf("SEND_FILE:%s|%s", filePath, caption)
}
