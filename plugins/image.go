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
	// Args: [1]chatId, [2]userId, [3]prompt, [4]filePath, [5]fileType, [6]thumb
	if len(os.Args) < 4 || os.Args[3] == "" {
		fmt.Println("⚪ **PENGGUNAAN** ⚪\n\nMasukan prompt gambarnya boss.\nContoh: `/image anime style, 4k, ultra realistic`")
		return
	}

	prompt := os.Args[3]
	encodedPrompt := url.QueryEscape(prompt)
	
	// Gunakan URL API tanpa nologo=true jika ingin rasio default yang lebih stabil
	// Pollinations AI secara default kasih 1:1 jika tidak disetting
	apiURL := fmt.Sprintf("https://image.pollinations.ai/prompt/%s?seed=%d", encodedPrompt, time.Now().Unix())

	cwd, _ := os.Getwd()
	// Pastikan folder temp ada di root bot
	tempDir := filepath.Join(cwd, "temp")
	
	fileName := fmt.Sprintf("ai_%d.jpg", time.Now().UnixMilli())
	filePath := filepath.Join(tempDir, fileName)

	// Mulai download
	resp, err := http.Get(apiURL)
	if err != nil {
		fmt.Printf("⚫ **ERROR**: Gagal akses API: %v", err)
		return
	}
	defer resp.Body.Close()

	// Buat file penampung mentah
	out, err := os.Create(filePath)
	if err != nil {
		fmt.Printf("⚫ **ERROR**: Gagal buat file temp: %v", err)
		return
	}
	defer out.Close()

	// Copy data mentah dari API ke file (Menjaga keaslian data/rasio)
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		fmt.Printf("⚫ **ERROR**: Gagal copy data: %v", err)
		return
	}

	// Caption Premium
	caption := fmt.Sprintf("⚪ **IMAGE GENERATED** ⚪\n\n💬 **Prompt:** `%s`\n📐 **Ratio:** `Original (API)`\n🎨 **Engine:** `Pollinations AI`", prompt)
	
	// Kirim instruksi ke index.js
	fmt.Printf("SEND_FILE:%s|%s", filePath, caption)
}
