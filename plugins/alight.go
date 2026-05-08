package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
)

// Struktur data buat dikirim ke server Alight Motion
type Payload struct {
	Data struct {
		UID          string `json:"uid"`
		PID          string `json:"pid"`
		Platform     string `json:"platform"`
		AppBuild     int    `json:"appBuild"`
		AcctTestMode string `json:"acctTestMode"`
	} `json:"data"`
}

func main() {
	// Pengecekan argumen dari bot (index.js ngirim: chatId, userId, text)
	if len(os.Args) < 4 || os.Args[3] == "" {
		fmt.Println("⚠️ Format salah!\nCara pakai: /alight <url_preset_alight_motion>")
		return
	}

	url := os.Args[3]

	// Ekstrak UID dan PID pakai Regex persis kayak di JS lu
	re := regexp.MustCompile(`/u/([^/]+)/p/([^/\?#]+)`)
	matches := re.FindStringSubmatch(url)

	if len(matches) < 3 {
		fmt.Println("❌ URL Alight Motion tidak valid atau formatnya salah.")
		return
	}

	uid := matches[1]
	pid := matches[2]

	// Siapin data payload
	payloadData := Payload{}
	payloadData.Data.UID = uid
	payloadData.Data.PID = pid
	payloadData.Data.Platform = "android"
	payloadData.Data.AppBuild = 1028417
	payloadData.Data.AcctTestMode = "normal"

	jsonData, err := json.Marshal(payloadData)
	if err != nil {
		fmt.Println("❌ Gagal memproses data internal bot.")
		return
	}

	// Bikin request ke API Alight Motion
	req, err := http.NewRequest("POST", "https://us-central1-alight-creative.cloudfunctions.net/getProjectMetadata", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("❌ Gagal membuat request ke server.")
		return
	}

	// Masukin Headers (Gua hapus 'accept-encoding: gzip' biar Golang ga perlu repot nge-decompress datanya, langsung dapet JSON mentah)
	req.Header.Set("content-type", "application/json; charset=utf-8")
	req.Header.Set("firebase-instance-id-token", "fc6bqgfcTGu_ZBBe4tVPwV:APA91bFHrAkrm7xVzZDvQbuK51muxf72x391Zv7dgsAWikyQoaBrO60JlfEHotVWThR7ZL7h5xWCg8peCtVA09Eq41i0VXpgYmMBRBFZubgqvVnh42AYQjg")
	req.Header.Set("user-agent", "okhttp/4.12.0")
	req.Header.Set("x-firebase-appcheck", "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("❌ Gagal menghubungi server Alight Motion.")
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	// Parsing JSON biar output di Telegram rapi
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Println("❌ Gagal membaca respon dari server AM.")
		return
	}

	// Ambil data spesifik dari object "result"
	if res, ok := result["result"].(map[string]interface{}); ok {
		// Set default kalo misalnya datanya ga ada
		title := "Tidak diketahui"
		if t, ok := res["title"].(string); ok {
			title = t
		}
		
		author := "Tidak diketahui"
		if a, ok := res["authorName"].(string); ok {
			author = a
		}

		// Cetak ke terminal (dan otomatis dikirim ke Telegram sama si Boss)
		fmt.Printf("✅ **Metadata Preset Ditemukan**\n\n📌 Judul: %s\n👤 Author: %s\n🆔 UID: %s\n🔑 PID: %s\n", title, author, uid, pid)
	} else {
		// Kalo format JSON dari sananya beda, kita print mentahannya aja
		fmt.Printf("✅ **Data Ditemukan:**\n%s", string(body))
	}
}
