import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userInput, setUserInput] = useState(''); 
  const [uniqueSenders, setUniqueSenders] = useState([]);

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

       
        const senders = [...new Set(parsedMessages.map(msg => msg.sender))];
        setUniqueSenders(senders);
      })
      .catch(error => console.error('Error loading chat:', error));
  }, []);

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim() && uniqueSenders.includes(userInput.trim())) {
      setCurrentUser(userInput.trim()); 
    } else {
      alert("Please enter a valid name from the list.");
    }
  };

 
  if (!currentUser) {
    return (
      <div className="app">
        <div className="chat-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <form onSubmit={handleUserSubmit} style={{ textAlign: 'center' }}>
            <h3>Who are you?</h3>
            {uniqueSenders.length > 1 ? (
              <>
                <p>Multiple users found:</p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {uniqueSenders.map((sender, index) => (
                    <li key={index}>{sender}</li>
                  ))}
                </ul>
              </>
            ) : uniqueSenders.length === 1 ? (
              <p>Only one user found: {uniqueSenders[0]}</p>
            ) : (
              <p>Loading chat data...</p>
            )}
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Enter your name from the list"
              style={{ padding: '10px', margin: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
            />
            <button
              type="submit"
              style={{ padding: '10px 20px', background: '#128c7e', color: '#fff', border: 'none', borderRadius: '5px' }}
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="chat-container">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === currentUser ? 'sent' : 'received'}`}
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