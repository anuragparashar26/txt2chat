# 📱 txt2chat: WhatsApp Chat Viewer

**txt2chat** is a fast, modern React app to **visualize and explore WhatsApp exported chat files**. It loads chat data and media directly from the `public/` folder for maximum performance and privacy. The UI is optimized for huge chat logs, with smooth scrolling and instant search. 


## ✅ Features

- **Parse and display** messages from `public/chat.txt`
- **Identify unique senders** and select your user
- **Highlight** your messages
- **Search** by:
  - Message content
  - Date (MM/DD/YY format)
  - Combined filters
- **Navigate** and scroll to search results
- **Media rendering** (jpg, mp4, opus, etc.) from `public/media/`
- **Stable, flicker-free virtualization** for huge chat files
- **Lazy-load media** for performance
- **Full-text search**
- **All assets and icons** loaded from `public/` (no local file/folder picker)



## 🚀 How to Use

1. **Clone the repository:**

  ```bash
  git clone https://github.com/anuragparashar26/txt2chat.git
  cd txt2chat
  ```

2. **Add your chat and media:**
  - Place your exported `chat.txt` in the `public/` folder.
  - (Optional) Add media files (images, videos, audio) in `public/media/`.

3. **Install dependencies and start the app:**

  ```bash
  npm install
  npm start
  ```

4. **Open in your browser:**
  - Go to [http://localhost:3000](http://localhost:3000)

**Note:** The app loads only from the `public/` folder. No local file/folder picker is used. All icons and branding use `public/icon.png`.


## 🧠 Notes

- Only supports simple WhatsApp export format:
  ```
  12/31/22, 11:59 PM - Sender: Message content
  ```
- Multi-line and system messages are **not** handled yet.
- Media file detection is pattern-based; may need adjustment for some exports.


**Privacy:** All chat data and media stay in your browser. No uploads or external APIs.
