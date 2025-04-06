import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AutoSizer, List, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import 'react-virtualized/styles.css';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [uniqueSenders, setUniqueSenders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateSearch, setDateSearch] = useState('');
  const [dateInputValue, setDateInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const listRef = useRef();

  const cache = useRef(
    new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 80,
      minHeight: 50,
    })
  );

  useEffect(() => {
    let isMounted = true;

    const fetchAndProcessFile = async () => {
      try {
        const response = await fetch('/chat.txt');
        const text = await response.text();
        const lines = text.split('\n');

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

        if (isMounted) {
          setMessages(parsedMessages);
          const senders = [...new Set(parsedMessages.map((msg) => msg.sender))];
          setUniqueSenders(senders);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      }
    };

    fetchAndProcessFile();
    return () => {
      isMounted = false;
    };
  }, []);

  const rowRenderer = useCallback(
    ({ index, key, parent, style }) => {
      const msg = messages[index];
      const isSent = msg.sender === currentUser;
      const isHighlighted = index === selectedMessageIndex;

      return (
        <CellMeasurer
          cache={cache.current}
          columnIndex={0}
          key={key}
          parent={parent}
          rowIndex={index}
        >
          {({ measure, registerChild }) => (
            <div
              ref={registerChild}
              style={{ ...style, padding: 0 }}
              className={`${isHighlighted ? 'highlighted-message' : ''}`}
            >
              <div className={`message-wrapper ${isSent ? 'sent-wrapper' : 'received-wrapper'}`}>
                <div className={`message ${isSent ? 'sent' : 'received'}`}>
                  {msg.sender !== currentUser && <div className="sender">{msg.sender}</div>}
                  {msg.content.includes('(file attached)') ? (
                    <Media content={msg.content} onLoad={measure} index={index} />
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  <div className="timestamp">{msg.timestamp}</div>
                </div>
              </div>
            </div>
          )}
        </CellMeasurer>
      );
    },
    [currentUser, selectedMessageIndex, messages]
  );

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim() && uniqueSenders.includes(userInput.trim())) {
      setCurrentUser(userInput.trim());
    } else {
      alert('Please enter a valid name from the list.');
    }
  };

  const performSearch = useCallback(() => {
    const results = messages
      .map((msg, index) => {
        const contentMatch = searchTerm
          ? msg.content.toLowerCase().includes(searchTerm.toLowerCase())
          : true;
        const dateMatch = dateSearch ? msg.date === dateSearch : true;
        return contentMatch && dateMatch ? index : null;
      })
      .filter((index) => index !== null);

    setSearchResults(results);
    return results;
  }, [messages, searchTerm, dateSearch]);

  const handleSearch = useCallback(() => {
   const results = performSearch();
    if (results.length > 0) {
      setSelectedMessageIndex(results[0]);
      if (listRef.current) {
        listRef.current.scrollToRow(results[0]);
        listRef.current.recomputeRowHeights(results[0] - 10);
      }
    } else {
      alert('No messages found matching your search criteria.');
    }
  }, [performSearch]);

  const jumpToNext = () => {
    if (searchResults.length === 0) return;
    const currentIndex = searchResults.indexOf(selectedMessageIndex);
    const nextIndex = (currentIndex + 1) % searchResults.length;
    setSelectedMessageIndex(searchResults[nextIndex]);
    if (listRef.current) {
      listRef.current.scrollToRow(searchResults[nextIndex]);
      listRef.current.recomputeRowHeights(searchResults[nextIndex] - 10);
    }
  };

  const jumpToPrevious = () => {
    if (searchResults.length === 0) return;
    const currentIndex = searchResults.indexOf(selectedMessageIndex);
    const prevIndex = (currentIndex - 1 + searchResults.length) % searchResults.length;
    setSelectedMessageIndex(searchResults[prevIndex]);
    if (listRef.current) {
      listRef.current.scrollToRow(searchResults[prevIndex]);
      listRef.current.recomputeRowHeights(searchResults[prevIndex] - 10);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDateSearch('');
    setDateInputValue('');
    setSearchResults([]);
    setSelectedMessageIndex(null);
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('/');
    const fullYear = parseInt(year) < 100 ? `20${year}` : year;
    return `${fullYear}-${month}-${day}`;
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    setDateInputValue(value);

    if (value) {
      const [year, month, day] = value.split('-');
      if (year && month && day && year.length === 4) {
        const parsedYear = parseInt(year);
        if (parsedYear >= 2000 && parsedYear <= 2099) {
          const appDate = `${day}/${month}/${year.slice(2)}`;
          setDateSearch(appDate);
        } else {
          setDateSearch('');
        }
      } else {
        setDateSearch('');
      }
    } else {
      setDateSearch('');
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
          value={dateInputValue}
          onChange={handleDateChange}
          className="date-input"
          min="2000-01-01"
          max="2099-12-31"
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

      <div className="chat-container" style={{ height: 'calc(100vh - 60px)' }}>
        <AutoSizer>
          {({ width, height }) => (
            <List
              ref={listRef}
              width={width}
              height={height}
              rowCount={messages.length}
              deferredMeasurementCache={cache.current}
              rowHeight={cache.current.rowHeight}
              rowRenderer={rowRenderer}
              overscanRowCount={10} 
              scrollToAlignment="start"
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

function Media({ content, onLoad, index }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const mediaRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (mediaRef.current) {
      observer.observe(mediaRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(); 
    }
  };

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

  const mediaHeights = {
    'jpg': 300,
    'webp': 300,
    'mp4': 250,
    'opus': 60,
    'mp3': 60,
    'audio': 60,
    'zip': 50,
    'pdf': 50,
    'download': 50,
  };

  const fixedHeight = mediaHeights[extension] || 50;
  const loadingStyle = {
    display: isLoaded || !isInView ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
    width: '250px',
    height: `${fixedHeight}px`,
  };

  const mediaContainerStyle = {
    maxWidth: '300px',
    height: `${fixedHeight}px`,
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '5px 0',
  };

  if (!isInView) {
    return <div ref={mediaRef} style={{ height: `${fixedHeight}px` }} />;
  }

  switch (extension) {
    case 'jpg':
    case 'webp':
      return (
        <div ref={mediaRef}>
          {!isLoaded && <div style={loadingStyle}>Loading image...</div>}
          <div style={isLoaded ? mediaContainerStyle : null}>
            <img
              src={`/media/${fileName}`}
              alt="img"
              onLoad={handleLoad}
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                objectFit: 'contain',
                display: isLoaded ? 'block' : 'none',
                cursor: 'pointer',
              }}
              onClick={() => window.open(`/media/${fileName}`, '_blank')}
            />
          </div>
        </div>
      );
    case 'mp4':
      return (
        <div ref={mediaRef}>
          {!isLoaded && <div style={loadingStyle}>Loading video...</div>}
          <div style={isLoaded ? mediaContainerStyle : null}>
            <video
              src={`/media/${fileName}`}
              controls
              onLoadedMetadata={handleLoad}
              style={{
                maxWidth: '100%',
                maxHeight: '250px',
                display: isLoaded ? 'block' : 'none',
              }}
              preload="metadata"
            />
          </div>
        </div>
      );
    case 'opus':
    case 'mp3':
    case 'audio':
      return (
        <div ref={mediaRef} style={{ width: '100%' }}>
          {!isLoaded && <div style={loadingStyle}>Loading audio...</div>}
          <div style={isLoaded ? mediaContainerStyle : null}>
            <audio
              src={`/media/${fileName}`}
              controls
              onLoadedData={handleLoad}
              style={{ width: '100%', display: isLoaded ? 'block' : 'none' }}
              preload="metadata"
              className="audio-player"
            />
          </div>
        </div>
      );
    case 'zip':
    case 'pdf':
    case 'download':
      return (
        <div ref={mediaRef} style={{ display: 'flex', alignItems: 'center', marginTop: '5px', marginBottom: '5px', height: `${fixedHeight}px` }}>
          <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
            <path fill="#555" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
          <a
            href={`/media/${fileName}`}
            download
            onLoad={handleLoad}
            className="file-download"
            style={{ textDecoration: 'none', color: '#2980b9', fontWeight: 500 }}
          >
            {`Download ${fileName}`}
          </a>
        </div>
      );
    default:
      return (
        <div ref={mediaRef} style={{ display: 'flex', alignItems: 'center', marginTop: '5px', marginBottom: '5px', height: `${fixedHeight}px` }}>
          <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
            <path fill="#555" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
          <a
            href={`/media/${fileName}`}
            download
            onLoad={handleLoad}
            className="file-download"
            style={{ textDecoration: 'none', color: '#2980b9', fontWeight: 500 }}
          >
            {`Download ${fileName} (Unknown)`}
          </a>
        </div>
      );
  }
}

export default App;