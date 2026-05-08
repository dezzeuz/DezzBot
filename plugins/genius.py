# Base : https://play.google.com/store/apps/details?id=com.genius.android
# Author : ZennzXD
# Python Port : Auto-Load Telegram Plugin

import urllib.request
import urllib.parse
import json
import sys

headers = {
    'x-genius-app-background-request': '0',
    'x-genius-logged-out': 'true',
    'x-genius-android-version': '8.1.1',
    'user-agent': 'Genius/8.1.1 (Android; Android 13; ZN/Android)'
}

# Fungsi bantuan buat nge-fetch API
def fetch_json(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

# Fungsi parse lirik rekursif
def parse_lirik(node):
    if isinstance(node, str):
        return node
    if not node:
        return ''
    if node.get('tag') == 'br':
        return '\n'
    if 'children' not in node:
        return ''
    
    return ''.join(parse_lirik(child) for child in node['children'])

# Fungsi ambil detail lagu & lirik
def detail(song_id):
    url = f"https://api.genius.com/songs/{song_id}"
    data = fetch_json(url)
    song = data['response']['song']
    
    lyrics = None
    if song.get('lyrics'):
        dom = song['lyrics'].get('dom')
        if dom:
            lyrics = parse_lirik(dom).strip()
            
    return {
        'id': song.get('id'),
        'title': song.get('title'),
        'artist': song.get('artist_names'),
        'header_image_url': song.get('header_image_url'),
        'song_art_image_url': song.get('song_art_image_url'),
        'instrumental': song.get('instrumental'),
        'is_music': song.get('is_music'),
        'hidden': song.get('hidden'),
        'explicit': song.get('explicit'),
        'release_date': song.get('release_date_for_display'),
        'url': song.get('url'),
        'lyrics': lyrics
    }

# Fungsi cari lagu
def search(query):
    url = f"https://api.genius.com/search/multi?q={urllib.parse.quote(query)}"
    data = fetch_json(url)
    
    songs = []
    for section in data['response']['sections']:
        if section.get('type') in ['song', 'top_hit']:
            for hit in section.get('hits', []):
                if hit.get('type') == 'song':
                    song = hit['result']
                    songs.append({
                        'id': song.get('id'),
                        'title': song.get('title'),
                        'artist': song.get('artist_names'),
                        'header_image_url': song.get('header_image_url'),
                        'url': song.get('url')
                    })
    return songs


if __name__ == '__main__':
    # ========================================================
    # MODE PEKERJA BOT (Dipanggil lewat index.js)
    # ========================================================
    if len(sys.argv) >= 4:
        chat_id = sys.argv[1]
        user_id = sys.argv[2]
        text = sys.argv[3].strip()

        if not text:
            print("⚠️ Mau nyari lirik lagu apa bro?\nContoh: `/genius bergema sampai selamanya`")
            sys.exit()

        try:
            # Kalau input cuma angka, berarti dia masukin ID Genius
            if text.isdigit():
                res = detail(text)
                print(f"🎵 **{res['title']}** - {res['artist']}\n\n{res['lyrics']}")
            else:
                # Kalau teks biasa, kita search dulu -> ambil urutan pertama -> get detail
                results = search(text)
                if not results:
                    print("❌ Lagunya ga ketemu, coba judul atau artis lain.")
                else:
                    top_song = results[0]
                    res = detail(top_song['id'])
                    
                    # Print lirik, ini bakal otomatis dikirim ke user via chat Telegram
                    print(f"🎵 **{res['title']}** - {res['artist']}\n\n{res['lyrics']}")
        except Exception as e:
            print(f"❌ Error pas narik data: {str(e)}")

    # ========================================================
    # MODE TEST MANUAL (Jalan di terminal)
    # ========================================================
    else:
        # Usage test persis kayak di JS lu
        print(json.dumps(detail('11422842'), indent=2))
        
        # print(json.dumps(search('bergema sampai selamanya'), indent=2))
