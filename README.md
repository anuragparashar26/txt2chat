# 📱 WhatsApp Chat Viewer (WIP)

> **Status**: 🚧 Under Development

This is a work-in-progress React app to **visualize and explore WhatsApp exported chat files**. It supports basic parsing of `chat.txt`, identifies users, and displays the messages in a chat-like UI. Media preview for image, video, and audio attachments is also being integrated.

## ✅ Current Features

- Parse and display messages from `chat.txt`
- Identify unique senders and prompt for user selection
- Highlight messages sent by the current user
- Search by:
  - Message content
  - Date (MM/DD/YY format)
  - Combined filters
- Navigate through search results
- Scroll to matched messages
- Media rendering (basic support for jpg, mp4, opus, etc.)
- Virtualized rendering for huge chat files 
- Lazy-load media files inside the chat
- Full-text search indexing

## 🛠️ Work In Progress

- [ ] Layout Improvements
- [ ] Fixing Flickering Issues for Very Large Chat Data

## 📁 Setup (Development)

1. Place `chat.txt` in the `public/` folder
2. Add media files inside `public/media/`
3. Run the project:

```bash
npm install
npm start
```

App runs at [http://localhost:3000](http://localhost:3000)

## 🧠 Notes

- Currently supports only simple message format:
  ```
  12/31/22, 11:59 PM - Sender: Message content
  ```
- Multi-line and system messages are **not** handled yet.
- File detection in media is based on pattern matching—may need refinement for real-world chats.
