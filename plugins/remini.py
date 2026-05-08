import sys
import os
import time
import requests

def main():
    # Urutan Argumen dari Super Engine:
    # [1]chatId, [2]userId, [3]argString, [4]filePathOnVps, [5]fileType, [6]thumb
    if len(sys.argv) < 6:
        print("⚫ **ERROR**\nArgumen tidak lengkap dari sistem.")
        return

    file_path = sys.argv[4]
    file_type = sys.argv[5]

    # Validasi apakah user beneran ngirim gambar
    if file_type != 'photo' or not os.path.exists(file_path):
        print("⚪ **PENGGUNAAN** ⚪\n\nKirim gambar dengan caption `/hd` boss biar fotonya jadi jernih.")
        return

    api_url = 'https://ihancer.com/api/enhance'

    # Form Data persis kayak di JS lu
    payload = {
        'method': '1',
        'is_pro_version': 'false',
        'is_enhancing_more': 'false',
        'max_image_size': 'high'
    }

    # Headers kustom (requests bakal otomatis nambahin boundary multipart)
    headers = {
        'accept-encoding': 'gzip',
        'host': 'ihancer.com',
        'user-agent': 'Dart/3.5 (dart:io)'
    }

    # Bikin nama file output yang bakal disimpan sementara di VPS
    temp_dir = os.path.dirname(file_path)
    out_filename = f"hd_{int(time.time() * 1000)}.jpg"
    out_filepath = os.path.join(temp_dir, out_filename)

    try:
        # Buka foto yang udah didownload sama index.js
        with open(file_path, 'rb') as img_file:
            files = {
                'file': (f"oota_{int(time.time() * 1000)}.jpg", img_file, 'image/jpeg')
            }
            
            # Post ke API iHancer
            response = requests.post(api_url, data=payload, files=files, headers=headers)
            
            if response.status_code != 200:
                print(f"⚫ **ERROR**\nGomen Gomen, gagal dari servernya. (Status: {response.status_code})")
                return

            # Simpan hasil gambar HD (arraybuffer/bytes) ke file baru
            with open(out_filepath, 'wb') as out_file:
                out_file.write(response.content)

    except Exception as e:
        print(f"⚫ **ERROR**\nGomen Gomen, Error Mungkin Lu Kebanyakan Request.\n`{str(e)}`")
        return

    # Caption Premium
    caption = "⚪ **DONE ENHANCE FOTO** ⚪\n\n> *(+)* Scrape From Randy\n> *(+)* Engine iHancer"

    # Kirim instruksi ke index.js biar filenya dikirim ke Telegram
    print(f"SEND_FILE:{out_filepath}|{caption}")

if __name__ == '__main__':
    main()
