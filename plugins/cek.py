import sys
import os

# Urutan Argumen:
# 0: path script, 1: chatId, 2: userId, 3: teks, 4: file_path_vps, 5: tipe_file, 6: thumb
chat_id = sys.argv[1]
user_id = sys.argv[2]
caption = sys.argv[3]
file_vps = sys.argv[4]
tipe = sys.argv[5]

if tipe == 'none':
    print("⚪ **INFO**\n\nLu cuma ngirim teks boss, ga ada filenya.")
else:
    ukuran = os.path.getsize(file_vps) / 1024 # KB
    print(f"⚪ **DETAIL FILE** ⚪\n\n📁 **Tipe:** {tipe}\n⚖️ **Ukuran:** {ukuran:.2f} KB\n📝 **Caption:** {caption}\n📍 **Loc:** `{file_vps}`")
