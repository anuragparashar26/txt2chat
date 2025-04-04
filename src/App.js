import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetch('/chat.txt')
      .then(response => response.text())
      .then(data => {
        const lines = data.split('\n');
        const parsedMessages = lines.map(line => {
          const regex = /(\d{2}\/\d{2}\/\d{2}, \d{1,2}:\d{2}\s[ap]m) - (.*?): (.*)/;
          const match = line.match(regex);
          if (match) {
            const [, timestamp, sender, content] = match;
            return { timestamp, sender, content };
          }
          return null;
        }).filter(Boolean);
        setMessages(parsedMessages);
      })
      .catch(error => console.error('Error loading chat:', error));
  }, []);

  return (
    <div className="app">
      <div className="chat-container">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === 'Abhishek' ? 'received' : 'sent'}`}
          >
            <div className="sender">{msg.sender}</div>
            <div className="timestamp">{msg.timestamp}</div>
            {msg.content.includes('(file attached)') ? (
              <Media content={msg.content} />
            ) : (
              <p>{msg.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Media({ content }) {
  const fileNameMatch = content.match(/([A-Za-z0-9-]+\.(jpg|webp|mp4|opus|mp3|zip|pdf|\w+)?|_)/);
  if (!fileNameMatch) return <p>{content}</p>;

  let fileName = fileNameMatch[0];
  let extension = fileName.split('.').pop().toLowerCase();

  if (fileName.endsWith('.') || fileName.endsWith('_')) {
    const baseName = fileName.endsWith('.') ? fileName.slice(0, -1) : fileName.slice(0, -1);
    fileName = `${baseName}_`;
    if (baseName.startsWith('AUD-') || baseName.startsWith('PTT-')) {
      extension = 'audio';
    } else if (baseName.startsWith('DOC-')) {
      extension = 'download';
    } else {
      extension = 'download';
    }
  }

  switch (extension) {
    case 'jpg':
      return <img src={`/media/${fileName}`} alt="img" />;
    case 'webp':
      return <img src={`/media/${fileName}`} alt="sticker" />;
    case 'mp4':
      return <video src={`/media/${fileName}`} controls />;
    case 'opus':
    case 'mp3':
    case 'audio':
      return <audio src={`/media/${fileName}`} controls onError={() => <a href={`/media/${fileName}`} download={fileName}>Download {fileName}</a>} />;
    case 'zip':
    case 'pdf':
    case 'download':
      return (
        <a href={`/media/${fileName}`} download={fileName}>
          Download {fileName}
        </a>
      );
    default:
      return (
        <a href={`/media/${fileName}`} download={fileName}>
          Download {fileName} (Unknown type)
        </a>
      );
  }
}

export default App;