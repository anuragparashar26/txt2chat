import React, { useEffect, useState, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [uniqueSenders, setUniqueSenders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateSearch, setDateSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const chatContainerRef = useRef(null);
  const messageRefs = useRef({});

  useEffect(() => {
    fetch('/chat.txt')
      .then((response) => response.text())
      .then((data) => {
        const lines = data.split('\n');
        const parsedMessages = lines
          .map((line) => {
            const regex = /^(\d{2}\/\d{2}\/\d{2}), (\d{1,2}:\d{2}\s[ap]m) - (.*?): (.*)$/;
            const match = line.match(regex);
            if (match) {
              const [_, date, time, sender, content] = match;
              return {
                timestamp: `${date}, ${time}`,
                date,
                time,
                sender,
                content,
              };
            }
            return null;
          })
          .filter(Boolean);

        setMessages(parsedMessages);
        const senders = [...new Set(parsedMessages.map((msg) => msg.sender))];
        setUniqueSenders(senders);
      })
      .catch((error) => console.error('Error loading chat:', error));
  }, []);


  useEffect(() => {
    if (selectedMessageIndex !== null && messageRefs.current[selectedMessageIndex]) {
      messageRefs.current[selectedMessageIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } else if (chatContainerRef.current && selectedMessageIndex === null) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, searchTerm, selectedMessageIndex]);

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim() && uniqueSenders.includes(userInput.trim())) {
      setCurrentUser(userInput.trim());
    } else {
      alert('Please enter a valid name from the list.');
    }
  };


  const performSearch = () => {
    let results = [];
    
    if (searchTerm) {
      results = messages.map((msg, index) => {
        if (msg.content.toLowerCase().includes(searchTerm.toLowerCase())) {
          return index;
        }
        return null;
      }).filter(Boolean);
    }
    
    if (dateSearch) {
      const dateResults = messages.map((msg, index) => {
        if (msg.date === dateSearch) {
          return index;
        }
        return null;
      }).filter(Boolean);
      
      results = searchTerm ? results.filter(index => dateResults.includes(index)) : dateResults;
    }
    
    setSearchResults(results);
    return results;
  };

  const handleSearch = () => {
    const results = performSearch();
    if (results.length > 0) {
      setSelectedMessageIndex(results[0]);
    } else {
      alert('No messages found matching your search criteria.');
    }
  };

  const jumpToNext = () => {
    if (searchResults.length === 0) return;
    
    const currentIndex = searchResults.indexOf(selectedMessageIndex);
    const nextIndex = (currentIndex + 1) % searchResults.length;
    setSelectedMessageIndex(searchResults[nextIndex]);
  };

  const jumpToPrevious = () => {
    if (searchResults.length === 0) return;
    
    const currentIndex = searchResults.indexOf(selectedMessageIndex);
    const prevIndex = (currentIndex - 1 + searchResults.length) % searchResults.length;
    setSelectedMessageIndex(searchResults[prevIndex]);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDateSearch('');
    setSearchResults([]);
    setSelectedMessageIndex(null);
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';

    const [month, day, year] = dateStr.split('/');
    return `20${year}-${month}-${day}`;
  };

 
  const convertToAppDateFormat = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year.slice(2)}`;
  };

  
  const filteredMessages = messages;

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
      <div className="search-container">
        <input
          type="text"
          placeholder="Search message content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <input
          type="date"
          value={formatDateForInput(dateSearch)}
          onChange={(e) => setDateSearch(convertToAppDateFormat(e.target.value))}
          className="date-input"
        />
        <button onClick={handleSearch} className="search-button">Search</button>
        {searchResults.length > 0 && (
          <>
            <span className="search-count">
              {`${searchResults.indexOf(selectedMessageIndex) + 1}/${searchResults.length}`}
            </span>
            <button onClick={jumpToPrevious} className="nav-button">↑</button>
            <button onClick={jumpToNext} className="nav-button">↓</button>
            <button onClick={clearSearch} className="clear-button">Clear</button>
          </>
        )}
      </div>

      <div className="chat-container" ref={chatContainerRef}>
        {filteredMessages.map((msg, index) => {
          const isSent = msg.sender === currentUser;
          const isHighlighted = index === selectedMessageIndex;
          
          return (
            <div
              key={index}
              ref={(el) => (messageRefs.current[index] = el)}
              className={`message-wrapper ${isSent ? 'sent-wrapper' : 'received-wrapper'} ${isHighlighted ? 'highlighted-message' : ''}`}
            >
              <div className={`message ${isSent ? 'sent' : 'received'}`}>
                {msg.sender !== currentUser && <div className="sender">{msg.sender}</div>}
                {msg.content.includes('(file attached)') ? (
                  <Media content={msg.content} />
                ) : (
                  <p>{msg.content}</p>
                )}
                <div className="timestamp">{msg.timestamp}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Media({ content }) {
  const fileNameMatch = content.match(/([A-Za-z0-9-_]+\.(jpg|webp|mp4|opus|mp3|zip|pdf|\w+)?|_)/);
  if (!fileNameMatch) return <p>{content}</p>;

  let fileName = fileNameMatch[0];
  let extension = fileName.split('.').pop().toLowerCase();

  if (fileName.endsWith('.') || fileName.endsWith('_')) {
    const baseName = fileName.slice(0, -1);
    fileName = `${baseName}_`;
    if (baseName.startsWith('AUD-') || baseName.startsWith('PTT-')) {
      extension = 'audio';
    } else {
      extension = 'download';
    }
  }

  switch (extension) {
    case 'jpg':
    case 'webp':
      return <img src={`/media/${fileName}`} alt="img" />;
    case 'mp4':
      return <video src={`/media/${fileName}`} controls />;
    case 'opus':
    case 'mp3':
    case 'audio':
      return <audio src={`/media/${fileName}`} controls />;
    case 'zip':
    case 'pdf':
    case 'download':
      return <a href={`/media/${fileName}`} download>{`Download ${fileName}`}</a>;
    default:
      return <a href={`/media/${fileName}`} download>{`Download ${fileName} (Unknown)`}</a>;
  }
}

export default App;