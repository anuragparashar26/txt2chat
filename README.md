# txt2chat: WhatsApp Chat Viewer

**txt2chat** is a fast, modern React app to **visualize and explore WhatsApp exported chat files**. It loads chat data and media directly from the `public/` folder for maximum performance and privacy. The UI is optimized for huge chat logs, with smooth scrolling and instant search. 


## Features

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



## How to Use


### For Web (React App)
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

---

### For Windows (.exe and Portable)

#### **Pre-built .exe**
1. Download the latest `txt2chat-win-setup-v2.0.0.exe` installer from the [GitHub Releases](https://github.com/anuragparashar26/txt2chat/releases) page.
2. Run the installer.
3. Launch **TXT2Chat** from the Start Menu.
4. On first launch, select your exported chat folder when prompted.

#### **Portable Version**
1. Download the `txt2chat-win-portable-v2.0.0.exe` from [GitHub Releases](https://github.com/anuragparashar26/txt2chat/releases).
2. Run the `.exe` file.
3. On first launch, select your exported chat folder when prompted.

#### **Build Electron App Manually (Advanced)**
1. Install dependencies:
  ```bash
  npm install
  ```
2. Build the React app:
  ```bash
  npm run build
  ```
3. Build the Electron app for Windows:
  ```bash
  npm run build-electron
  ```
  The output `.exe` and portable folders will be in the `dist/` directory.

---



## Installing via .deb Release (Linux)

You can install txt2chat on any Debian-based Linux distribution using the pre-built `.deb` package from the [GitHub Releases](https://github.com/anuragparashar26/txt2chat/releases) page.

1. Download the latest `.deb` file from the Releases section.
2. Install it using:
   ```bash
   sudo dpkg -i txt2chat-linux-2.0.0.deb
   ```
3. Launch the app from your applications menu or with:
   ```bash
   txt2chat
   ```
4. If you encounter missing dependencies, run:
   ```bash
   sudo apt-get install -f
   ```


## Note

- Only supports simple WhatsApp export format:
  ```
  12/31/22, 11:59 PM - Sender: Message content
  ```

**Privacy:** All chat data and media stay in your browser. No uploads or external APIs.

