import sys
import os
import json
import urllib.parse
import re
import requests
from bs4 import BeautifulSoup

def main():
    # Args dari Super Engine: 1:chatId, 2:userId, 3:argString, 4:filePath, 5:fileType, 6:thumb
    if len(sys.argv) < 4:
        print("⚫ **ERROR**\nArgumen tidak lengkap dari sistem.")
        return

    chat_id = sys.argv[1]
    query = sys.argv[3].strip()

    if not query:
        print("⚪ **PENGGUNAAN DAFONT** ⚪\n\nKetik `/font [nama_font]` untuk mencari.\nKetik `/font [angka]` untuk mendownload.\n\n**Contoh:**\n`/font arial`\n`/font 1`")
        return

    # File database sementara untuk nyimpen hasil pencarian di grup/private chat ini
    db_file = os.path.join("database", f"font_{chat_id}.json")

    # ==========================================
    # MODE DOWNLOAD (JIKA INPUT ADALAH ANGKA)
    # ==========================================
    if query.isdigit():
        idx = int(query) - 1
        
        if not os.path.exists(db_file):
            print("⚫ **ERROR**\nLu belum nyari font apa-apa boss. Cari dulu pake `/font [nama font]`.")
            return
            
        with open(db_file, 'r') as f:
            data = json.load(f)
            
        if idx < 0 or idx >= len(data):
            print("⚫ **ERROR**\nNomornya ga valid boss. Liat angka di list yang bener.")
            return
            
        font = data[idx]
        dl_url = font.get('download')
        name = font.get('name', 'Font_Unknown')
        
        if not dl_url:
            print("⚫ **ERROR**\nLink download nggak ketemu dari webnya.")
            return

        print(f"⚪ **MENGUNDUH...**\nSedang mendownload font `{name}`, tunggu sebentar boss.")
            
        # Proses Download File ZIP ke VPS
        temp_dir = os.path.join(os.getcwd(), "temp")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Bersihin nama file biar ga error di Linux
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', name)
        zip_path = os.path.join(temp_dir, f"{safe_name}.zip")
        
        try:
            r = requests.get(dl_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with open(zip_path, 'wb') as f:
                f.write(r.content)
                
            # Preview ditaruh di caption sebagai Markdown Link (Otomatis dirender Telegram jadi gambar)
            preview_link = font.get('preview', '')
            caption = f"⚪ **DAFONT DOWNLOADER** ⚪\n\n🔠 **Nama:** `{name}`\n👤 **Author:** `{font.get('author')}`\n📄 **Lisensi:** `{font.get('license')}`\n📥 **Total DL:** `{font.get('downloads')}`\n\n[🖼️ KLIK UNTUK LIHAT PREVIEW FONT]({preview_link})"
            
            # Instruksi ke index.js untuk mengirim file
            print(f"SEND_FILE:{zip_path}|{caption}")
            
        except Exception as e:
            print(f"⚫ **ERROR**\nGagal mendownload ZIP dari server: `{str(e)}`")
            
        return

    # ==========================================
    # MODE PENCARIAN (JIKA INPUT ADALAH TEKS)
    # ==========================================
    url = f"https://www.dafont.com/search.php?q={urllib.parse.quote(query)}"
    
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        soup = BeautifulSoup(r.text, 'html.parser')
        
        results = []
        
        # Scraping HTML persis kayak Cheerio di JS lu
        for el in soup.select('.lv1left.dfbg'):
            raw_text = el.text.strip()
            author_tag = el.find('a')
            author = author_tag.text.strip() if author_tag else "Unknown"
            
            # Bersihin teks "by Author" dari nama font
            name = re.sub(r'\s*by\s*.+$', '', raw_text, flags=re.IGNORECASE).strip()
            
            lv2 = el.find_next_sibling(class_='lv2right')
            dlbox = el.find_next_sibling(class_='dlbox')
            previewBox = el.find_next_sibling(class_='preview')
            
            downloads, yesterday, license_txt = "Unknown", "Unknown", "Unknown"
            
            if lv2:
                light = lv2.find(class_='light')
                if light:
                    info = light.text.strip()
                    dl_match = re.search(r'([\d,]+)\s+downloads', info)
                    if dl_match: downloads = dl_match.group(1)
                    y_match = re.search(r'\((.*?)\)', info)
                    if y_match: yesterday = y_match.group(1)
                
                help_tag = lv2.find('a', class_='help')
                if help_tag: license_txt = help_tag.text.strip()
                
            download_url = None
            if dlbox:
                dl_tag = dlbox.find('a', class_='dl')
                if dl_tag and dl_tag.has_attr('href'):
                    download_url = "https:" + dl_tag['href']
                    
            preview_url = None
            if previewBox and previewBox.has_attr('style'):
                style = previewBox['style']
                p_match = re.search(r'url\((.*?)\)', style)
                if p_match:
                    preview_url = "https://www.dafont.com" + p_match.group(1)
                    
            results.append({
                'name': name,
                'author': author,
                'downloads': downloads,
                'yesterday': yesterday,
                'license': license_txt,
                'download': download_url,
                'preview': preview_url
            })
            
        if not results:
            print("⚫ **TIDAK DITEMUKAN**\nFont tidak ada di database DaFont boss.")
            return
            
        # Simpan hasil scraping ke Database sementara
        os.makedirs("database", exist_ok=True)
        with open(db_file, 'w') as f:
            json.dump(results, f)
            
        # Bikin Output Premium
        txt = "⚪ **DAFONT SEARCH RESULTS** ⚪\n\n"
        for i, v in enumerate(results[:10]): # Limit tampil 10 biji aja biar ga nyepam chat
            txt += f"{i+1}. **{v['name']}**\n"
            txt += f"   👤 Author: `{v['author']}`\n"
            txt += f"   📥 DLs: `{v['downloads']}`\n"
            txt += f"   📄 Lisensi: `{v['license']}`\n\n"
            
        txt += f"> 💡 **Ketik `/font [nomor]` untuk mendownload ZIP-nya.**\n> Contoh: `/font 1`"
        
        print(txt)
        
    except Exception as e:
        print(f"⚫ **ERROR SCRAPING**\nSistem gagal mengambil data: `{str(e)}`")

if __name__ == '__main__':
    main()
