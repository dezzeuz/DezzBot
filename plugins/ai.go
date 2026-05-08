package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	APIChat       = "https://ai.alfisy.my.id/api/chat"
	APITranscribe = "https://ai.alfisy.my.id/api/transcribe"
	APIOCR        = "https://ai.alfisy.my.id/api/ocr"
	APITxt2Img    = "https://ai.alfisy.my.id/api/txt2img"
	APIImg2Img    = "https://ai.alfisy.my.id/api/img2img"
)

type APIResponse struct {
	ImageUrl      string `json:"imageUrl"`
	Response      string `json:"response"`
	Text          string `json:"text"`
	Transcription string `json:"transcription"`
	Result        string `json:"result"`
	Error         string `json:"error"`
}

func main() {
	if len(os.Args) < 6 {
		fmt.Println("⚫ **ERROR**\nSistem gagal mengirim parameter lengkap.")
		return
	}

	text := os.Args[3]
	filePath := os.Args[4]
	fileType := os.Args[5]

	args := strings.Fields(text)
	subCmd := ""
	prompt := text

	if len(args) > 0 {
		subCmd = strings.ToLower(args[0])
	}

	// ==========================================
	// 1. TXT2IMG (Teks ke Gambar)
	// ==========================================
	if subCmd == "txt2img" {
		prompt = strings.Join(args[1:], " ")
		if prompt == "" {
			fmt.Println("⚪ **PENGGUNAAN** ⚪\n\nPrompt tidak boleh kosong.\nContoh: `/ai txt2img cyberpunk city neon`")
			return
		}

		payload := map[string]string{"prompt": prompt, "model": "Flux1schnell"}
		resp, err := postJSON(APITxt2Img, payload)
		if err != nil {
			fmt.Printf("⚫ **ERROR**\nGagal terhubung ke API: %v\n", err)
			return
		}

		if resp.Error != "" {
			fmt.Printf("⚫ **ERROR API**\n%s\n", resp.Error)
			return
		}

		if resp.ImageUrl != "" {
			localPath, err := downloadImage(resp.ImageUrl)
			if err != nil {
				fmt.Printf("⚫ **ERROR**\nGagal mengunduh hasil gambar: %v\n", err)
				return
			}
			caption := fmt.Sprintf("🎨 **TEXT-TO-IMAGE**\n\n📝 **Prompt:** `%s`\n🤖 **Model:** `Flux1schnell`", prompt)
			fmt.Printf("SEND_FILE:%s|%s", localPath, caption)
		}
		return
	}

	// ==========================================
	// 2. IMG2IMG (Gambar ke Gambar)
	// ==========================================
	if subCmd == "img2img" {
		prompt = strings.Join(args[1:], " ")
		if prompt == "" {
			fmt.Println("⚪ **PENGGUNAAN** ⚪\n\nPrompt tidak boleh kosong.\nContoh: `/ai img2img jadikan anime` (Sambil reply/kirim gambar)")
			return
		}
		if fileType != "photo" || filePath == "none" {
			fmt.Println("⚪ **PENGGUNAAN** ⚪\n\nLu wajib ngirim gambar buat make fitur ini boss.")
			return
		}

		extraParams := map[string]string{"prompt": prompt}
		resp, err := postMultipart(APIImg2Img, "image", filePath, extraParams)
		if err != nil {
			fmt.Printf("⚫ **ERROR**\nGagal memproses gambar: %v\n", err)
			return
		}

		if resp.Error != "" {
			fmt.Printf("⚫ **ERROR API**\n%s\n", resp.Error)
			return
		}

		if resp.ImageUrl != "" {
			localPath, err := downloadImage(resp.ImageUrl)
			if err != nil {
				fmt.Printf("⚫ **ERROR**\nGagal mengunduh hasil gambar: %v\n", err)
				return
			}
			caption := fmt.Sprintf("🖼️ **IMAGE-TO-IMAGE**\n\n📝 **Prompt:** `%s`", prompt)
			fmt.Printf("SEND_FILE:%s|%s", localPath, caption)
		}
		return
	}

	// ==========================================
	// 3. VISION (Analisis Gambar)
	// ==========================================
	if fileType == "photo" {
		if text == "" {
			text = "Analisis gambar ini secara detail"
		}

		base64Str, err := fileToBase64(filePath)
		if err != nil {
			fmt.Println("⚫ **ERROR**\nGagal membaca file gambar.")
			return
		}

		imageData := "data:image/jpeg;base64," + base64Str
		payload := map[string]string{
			"message":   text,
			"model":     "pixtral",
			"imageData": imageData,
		}

		resp, err := postJSON(APIChat, payload)
		if err != nil {
			fmt.Printf("⚫ **ERROR**\n%v\n", err)
			return
		}

		fmt.Printf("👁️ **AI VISION** 👁️\n\n%s", getResponseText(resp))
		return
	}

	// ==========================================
	// 4. TRANSCRIBE (Audio to Text)
	// ==========================================
	if fileType == "audio" || fileType == "voice" {
		resp, err := postMultipart(APITranscribe, "audio", filePath, nil)
		if err != nil {
			fmt.Printf("⚫ **ERROR**\nGagal mentranskripsi audio: %v\n", err)
			return
		}
		fmt.Printf("🎙️ **TRANSKRIPSI AUDIO** 🎙️\n\n%s", getResponseText(resp))
		return
	}

	// ==========================================
	// 5. OCR (Baca Dokumen PDF/DLL)
	// ==========================================
	if fileType == "document" {
		base64Str, err := fileToBase64(filePath)
		if err != nil {
			fmt.Println("⚫ **ERROR**\nGagal membaca dokumen.")
			return
		}

		fileData := "data:application/pdf;base64," + base64Str
		payload := map[string]string{
			"fileData": fileData,
			"fileName": "document.pdf",
		}

		resp, err := postJSON(APIOCR, payload)
		if err != nil {
			fmt.Printf("⚫ **ERROR**\n%v\n", err)
			return
		}

		fmt.Printf("📄 **HASIL OCR** 📄\n\n%s", getResponseText(resp))
		return
	}

	// ==========================================
	// 6. CHAT AI (Teks Biasa)
	// ==========================================
	if text != "" {
		payload := map[string]string{
			"message": text,
			"model":   "mistral-agent",
		}
		resp, err := postJSON(APIChat, payload)
		if err != nil {
			fmt.Printf("⚫ **ERROR**\n%v\n", err)
			return
		}
		
		fmt.Printf("⚪ **AI ASSISTANT** ⚪\n\n%s", getResponseText(resp))
		return
	}

	// Jika tidak ada input sama sekali
	fmt.Println("❌ Format salah! Kirim teks, gambar, atau audio.\nContoh:\n`/ai Halo, siapa kamu?`\n`/ai txt2img gunung merapi`\n`/ai img2img jadikan anime` (Sambil kirim foto)")
}

// --- HELPER FUNCTIONS ---

func getResponseText(resp APIResponse) string {
	if resp.Error != "" {
		return "Error API: " + resp.Error
	}
	if resp.Response != "" {
		return resp.Response
	}
	if resp.Text != "" {
		return resp.Text
	}
	if resp.Transcription != "" {
		return resp.Transcription
	}
	if resp.Result != "" {
		return resp.Result
	}
	return "Tidak ada respon dari server."
}

func fileToBase64(filePath string) (string, error) {
	bytes, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(bytes), nil
}

func postJSON(url string, data interface{}) (APIResponse, error) {
	var apiResp APIResponse
	jsonData, _ := json.Marshal(data)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return apiResp, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	json.Unmarshal(body, &apiResp)
	return apiResp, nil
}

func postMultipart(url string, fileField string, filePath string, extra map[string]string) (APIResponse, error) {
	var apiResp APIResponse

	file, err := os.Open(filePath)
	if err != nil {
		return apiResp, err
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile(fileField, filepath.Base(filePath))
	if err != nil {
		return apiResp, err
	}
	io.Copy(part, file)

	for key, val := range extra {
		_ = writer.WriteField(key, val)
	}
	writer.Close()

	req, _ := http.NewRequest("POST", url, body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return apiResp, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	json.Unmarshal(respBody, &apiResp)
	return apiResp, nil
}

func downloadImage(url string) (string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	cwd, _ := os.Getwd()
	tempDir := filepath.Join(cwd, "temp")
	fileName := fmt.Sprintf("ai_res_%d.jpg", time.Now().UnixNano())
	outPath := filepath.Join(tempDir, fileName)

	out, err := os.Create(outPath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	io.Copy(out, resp.Body)
	return outPath, nil
}
