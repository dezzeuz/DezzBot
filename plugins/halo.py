import sys

# Ambil data dari Boss
chat_id = sys.argv[1]
user_id = sys.argv[2]
text = sys.argv[3]

if text == "":
    print("Halo! Mau dibantuin apa pake Python? 🐍")
else:
    print(f"Halo user {user_id}, pesan lu: '{text}' udah diproses sama Python.") 
