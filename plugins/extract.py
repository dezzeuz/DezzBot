import sys
import os
import time
import requests
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import json

# ==========================================
# 1. MAIN FUNCTION
# ==========================================
def main():
    if len(sys.argv) < 6:
        print("⚫ **ERROR SYSTEM**\nSistem gagal mengirim parameter ke plugin Python.")
        return

    chat_id = sys.argv[1]
    user_id = sys.argv[2]
    query = sys.argv[3].strip()
    file_path = sys.argv[4]
    file_type = sys.argv[5]

    # Validasi Input
    if not query and file_type == 'none':
        print("⚪ **PENGGUNAAN FITUR** ⚪\n\nMasukan URL target boss!\nContoh: `/ekstrak target.com`")
        return

    # Rapihkan URL
    url = query
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url

    # ==========================================
    # 2. PROSES DEEP SCRAPING
    # ==========================================
    try:
        headers_req = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        start_time = time.time()
        
        # 1. Grab Main Source
        res = requests.get(url, headers=headers_req, timeout=15)
        soup = BeautifulSoup(res.text, 'html.parser')

        # 2. Extract Server Headers
        server_headers = res.headers

        # 3. Extract Title & JS Files
        page_title = soup.title.string if soup.title else "Tidak ada title"
        scripts = soup.find_all('script')
        js_links = []
        for script in scripts:
            if script.get('src'):
                js_url = urljoin(url, script.get('src'))
                js_links.append(js_url)

        # 4. Extract Potential APIs
        potential_apis = set(re.findall(r'https?://[^\s"\'<>]+', res.text))
        api_endpoints = [ep for ep in potential_apis if any(keyword in ep.lower() for keyword in ['api', 'v1', 'v2', 'graphql', 'json'])]

        # 5. Call API Sample (Maks 3 Endpoint)
        api_responses = ""
        for api in api_endpoints[:3]:
            try:
                api_res = requests.get(api, headers=headers_req, timeout=5)
                content_type = api_res.headers.get('Content-Type', '')
                
                api_responses += f"[*] ENDPOINT : {api}\n"
                api_responses += f"[-] STATUS   : {api_res.status_code}\n"
                
                if 'application/json' in content_type.lower():
                    parsed_json = api_res.json()
                    pretty_json = json.dumps(parsed_json, indent=2)
                    api_responses += f"[-] RESPONS  :\n{pretty_json[:800]} {'... [TRUNCATED]' if len(pretty_json) > 800 else ''}\n\n"
                else:
                    api_responses += f"[-] RESPONS  : \n{api_res.text[:500]} {'... [TRUNCATED]' if len(api_res.text) > 500 else ''}\n\n"
            except Exception as e:
                api_responses += f"[*] ENDPOINT : {api}\n[-] ERROR    : {str(e)}\n\n"

        process_time = round(time.time() - start_time, 2)

        # ==========================================
        # 3. FORMATTING FILE OUTPUT
        # ==========================================
        output_filename = f"Dump_{user_id}_{int(time.time())}.txt"
        
        # Pastikan masuk ke folder temp/ agar otomatis terhapus
        temp_dir = os.path.join(os.getcwd(), "temp")
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, output_filename)
        
        with open(temp_path, "w", encoding="utf-8") as f:
            f.write("="*60 + "\n")
            f.write(" ⬛ DEEP WEB EXTRACTOR - INTELLIGENCE REPORT ⬛\n")
            f.write("="*60 + "\n\n")
            
            f.write("[+] INFORMATION GATHERING\n")
            f.write(f"    - Target URL   : {url}\n")
            f.write(f"    - Page Title   : {page_title}\n")
            f.write(f"    - HTTP Status  : {res.status_code}\n")
            f.write(f"    - Process Time : {process_time} seconds\n\n")

            f.write("[+] SERVER HEADERS (FOOTPRINTING)\n")
            for key, value in server_headers.items():
                f.write(f"    - {key.ljust(15)} : {value}\n")
            f.write("\n" + "-"*60 + "\n\n")

            f.write(f"[+] FOUND {len(api_endpoints)} POTENTIAL API ENDPOINTS\n")
            if api_endpoints:
                for api in api_endpoints:
                    f.write(f"    -> {api}\n")
            else:
                f.write("    -> Tidak ada endpoint API terekspos yang ditemukan.\n")
            f.write("\n" + "-"*60 + "\n\n")

            f.write("[+] API SAMPLE RESPONSES (TEST CALL)\n")
            if api_responses:
                f.write(api_responses)
            else:
                f.write("    -> Tidak ada data respon API.\n")
            f.write("-"*60 + "\n\n")

            f.write(f"[+] FOUND {len(js_links)} EXTERNAL JAVASCRIPT FILES\n")
            for js in js_links:
                f.write(f"    -> {js}\n")
            f.write("\n" + "-"*60 + "\n\n")

            f.write("[+] RAW HTML SOURCE (FIRST 15,000 CHARACTERS)\n\n")
            f.write(res.text[:15000] + "\n\n... [TRUNCATED] ...")

        # ==========================================
        # 4. OUTPUT KE TELEGRAM
        # ==========================================
        server_info = server_headers.get('Server', 'Unknown')
        
        caption = f"⚫ **EXTRACTION COMPLETE** ⚪\n\n"
        caption += f"🌐 **Target:** `{url}`\n"
        caption += f"🖥 **Server:** `{server_info}`\n"
        caption += f"📡 **Status:** `{res.status_code}`\n"
        caption += f"⏱ **Speed:** `{process_time}s`\n\n"
        caption += f"**[ SUMMARY ]**\n"
        caption += f"┣ 📜 JS Files : `{len(js_links)}`\n"
        caption += f"┗ 🔌 API Found: `{len(api_endpoints)}`\n\n"
        caption += f"> `Report generated successfully. Open the attached file to see Headers, API responses, and source code.`"
        
        print(f"SEND_FILE:{temp_path}|{caption}")

    except Exception as e:
        print(f"⚫ **SYSTEM FAILURE** ⚪\n\nGagal melakukan ekstraksi data pada target.\n**Log:** `{str(e)}`")

# ==========================================
# 5. AUTO-RUN
# ==========================================
if __name__ == '__main__':
    main()
