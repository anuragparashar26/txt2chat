import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AutoSizer, List } from 'react-virtualized';
import 'react-virtualized/styles.css';
import './App.css';

const MESSAGE_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}\s(?:am|pm))\s-\s([^:]+):\s([\s\S]*)$/i;

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

const normalizeDateToDdMmYy = (rawDate) => {
  const parts = rawDate.split('/');
  if (parts.length !== 3) return null;

  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2].length === 4 ? parts[2].slice(-2) : parts[2].padStart(2, '0');
  return `${day}/${month}/${year}`;
};

const estimateTextMessageHeight = (content) => {
  const safeContent = content || '';
  const approxCharsPerLine = 42;
  const approxLineHeight = 20;
  const baseHeight = 72;

  const wrappedLineCount = safeContent
    .split('\n')
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / approxCharsPerLine)), 0);

  const calculatedHeight = baseHeight + wrappedLineCount * approxLineHeight;
  return Math.max(80, calculatedHeight);
};

const getEstimatedMessageHeight = (content) => {
  if (content.includes('(file attached)')) {
    return getMediaPreviewHeight(content) + 70;
  }

  return estimateTextMessageHeight(content);
};

const parseChatLine = (line) => {
  const match = line.match(MESSAGE_REGEX);
  if (!match) return null;

  const [, rawDate, rawTime, sender, rawContent] = match;
  const normalizedDate = normalizeDateToDdMmYy(rawDate);
  if (!normalizedDate) return null;

  const time = rawTime.toLowerCase();
  const content = rawContent ?? '';
  const estimatedHeight = getEstimatedMessageHeight(content);

  return {
    timestamp: `${normalizedDate}, ${time}`,
    date: normalizedDate,
    time,
    sender: sender.trim(),
    content,
    contentLower: content.toLowerCase(),
    estimatedHeight,
  };
};

const parseChatFromText = (text, onProgress) => {
  const lines = text.split(/\r?\n/);
  const parsedMessages = [];
  let lastMessage = null;

  lines.forEach((line, index) => {
    const parsed = parseChatLine(line);
    if (parsed) {
      parsedMessages.push(parsed);
      lastMessage = parsed;
    } else if (lastMessage && line.trim().length > 0) {
      lastMessage.content = `${lastMessage.content}\n${line}`;
      lastMessage.contentLower = lastMessage.content.toLowerCase();
      lastMessage.timestamp = `${lastMessage.date}, ${lastMessage.time}`;
      lastMessage.estimatedHeight = getEstimatedMessageHeight(lastMessage.content);
    }

    if (onProgress && index % 5000 === 0) {
      onProgress(Math.min(99, Math.round((index / lines.length) * 100)));
    }
  });

  if (onProgress) onProgress(100);
  return parsedMessages;
};

const parseChatFromStream = async (stream, totalBytes, onProgress) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let bytesRead = 0;
  let chunkCount = 0;
  const parsedMessages = [];
  let lastMessage = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    chunkCount += 1;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const parsed = parseChatLine(line);
      if (parsed) {
        parsedMessages.push(parsed);
        lastMessage = parsed;
      } else if (lastMessage && line.trim().length > 0) {
        lastMessage.content = `${lastMessage.content}\n${line}`;
        lastMessage.contentLower = lastMessage.content.toLowerCase();
        lastMessage.estimatedHeight = getEstimatedMessageHeight(lastMessage.content);
      }
    }

    if (onProgress && totalBytes) {
      onProgress(Math.min(99, Math.round((bytesRead / totalBytes) * 100)));
    }

    if (chunkCount % 8 === 0) {
      await yieldToMain();
    }
  }

  buffer += decoder.decode();
  if (buffer.length > 0) {
    const parsed = parseChatLine(buffer);
    if (parsed) {
      parsedMessages.push(parsed);
    } else if (lastMessage && buffer.trim().length > 0) {
      lastMessage.content = `${lastMessage.content}\n${buffer}`;
      lastMessage.contentLower = lastMessage.content.toLowerCase();
      lastMessage.estimatedHeight = getEstimatedMessageHeight(lastMessage.content);
    }
  }

  if (onProgress) onProgress(100);
  return parsedMessages;
};

const MEDIA_PREVIEW_REGEX = /([A-Za-z0-9][A-Za-z0-9_.-]*\.(?:jpe?g|png|webp|mp4|opus|mp3|m4a|aac|ogg|wav|zip|pdf|docx?|xlsx?|pptx?|txt)|[A-Za-z0-9_-]+_)/i;
const loadedMediaKeys = new Set();

const getMediaPreviewHeight = (content) => {
  const fileNameMatch = content.match(MEDIA_PREVIEW_REGEX);
  if (!fileNameMatch) return 50;

  const normalizedFileName = fileNameMatch[0].replace(/\s/g, '');
  let extension = normalizedFileName.includes('.')
    ? normalizedFileName.split('.').pop().toLowerCase()
    : 'download';

  if (normalizedFileName.endsWith('_')) {
    const baseName = normalizedFileName.slice(0, -1);
    extension = baseName.startsWith('AUD-') || baseName.startsWith('PTT-') ? 'audio' : 'download';
  }

  const mediaHeights = {
    jpg: 300,
    jpeg: 300,
    png: 300,
    webp: 300,
    mp4: 250,
    opus: 60,
    mp3: 60,
    m4a: 60,
    aac: 60,
    ogg: 60,
    wav: 60,
    audio: 60,
    zip: 50,
    pdf: 50,
    download: 50,
  };

  return mediaHeights[extension] || 50;
};

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
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [parseProgress, setParseProgress] = useState(0);
  const listRef = useRef();
  const messagesRef = useRef([]);
  const mediaUrlCacheRef = useRef(new Map());

  const getRowHeight = useCallback(({ index }) => {
    if (!messages[index]) return 80;
    return messages[index].estimatedHeight || 80;
  }, [messages]);

  const clearMediaObjectUrlCache = useCallback(() => {
    mediaUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
    mediaUrlCacheRef.current.clear();
  }, []);

  const normalizeDateInputToSearch = useCallback((inputValue) => {
    const value = inputValue.trim();
    if (!value) return '';

    const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const parsedYear = Number(year);
      if (parsedYear >= 2000 && parsedYear <= 2099) {
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(2)}`;
      }
      return '';
    }

    const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      const fullYear = year.length === 2 ? Number(`20${year}`) : Number(year);
      if (fullYear >= 2000 && fullYear <= 2099) {
        const normalizedYear = String(fullYear).slice(2);
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${normalizedYear}`;
      }
      return '';
    }

    return '';
  }, []);

  const applyParsedMessages = useCallback((parsedMessages) => {
    setMessages(parsedMessages);
    messagesRef.current = parsedMessages;
    const senders = [...new Set(parsedMessages.map((msg) => msg.sender))];
    setUniqueSenders(senders);
    setSearchResults([]);
    setSelectedMessageIndex(null);
    if (listRef.current) {
      listRef.current.recomputeRowHeights();
      listRef.current.forceUpdateGrid();
    }
  }, []);

  const loadChatFromResponse = useCallback(async (response) => {
    if (!response.ok) {
      throw new Error(`Unable to read chat.txt (status ${response.status})`);
    }

    setLoadingStatus('Parsing chat file...');
    const contentLengthHeader = response.headers.get('content-length');
    const totalBytes = contentLengthHeader ? Number(contentLengthHeader) : undefined;

    if (response.body && response.body.getReader) {
      return parseChatFromStream(response.body, totalBytes, setParseProgress);
    }

    const fallbackText = await response.text();
    return parseChatFromText(fallbackText, setParseProgress);
  }, []);

  const loadChatFromPublicFolder = useCallback(async () => {
    setIsLoading(true);
    setLoadingStatus('Loading public/chat.txt...');
    setParseProgress(0);

    try {
      const response = await fetch('/chat.txt');
      const parsedMessages = await loadChatFromResponse(response);
      applyParsedMessages(parsedMessages);
      clearMediaObjectUrlCache();
      setLoadingStatus(`Loaded ${parsedMessages.length.toLocaleString()} messages`);
    } catch (error) {
      console.error('Error loading chat:', error);
      setLoadingStatus('Failed to load chat.txt from public folder');
    } finally {
      setIsLoading(false);
    }
  }, [applyParsedMessages, clearMediaObjectUrlCache, loadChatFromResponse]);

  const resolveMediaUrl = useCallback(async (fileName) => {
    if (mediaUrlCacheRef.current.has(fileName)) {
      return mediaUrlCacheRef.current.get(fileName);
    }

    const fallbackUrl = `/media/${encodeURIComponent(fileName)}`;
    return fallbackUrl;
  }, []);

  useEffect(() => {
    loadChatFromPublicFolder();

    return () => {
      clearMediaObjectUrlCache();
    };
  }, [clearMediaObjectUrlCache, loadChatFromPublicFolder]);

  const rowRenderer = useCallback(
    ({ index, key, style }) => {
      const msg = messages[index];
      const isSent = msg.sender === currentUser;
      const isHighlighted = index === selectedMessageIndex;
      const hasAttachment = msg.content.includes('(file attached)');

      return (
        <div
          key={key}
          style={{ ...style, padding: 0 }}
          className={`${isHighlighted ? 'highlighted-message' : ''}`}
        >
          <div className={`message-wrapper ${isSent ? 'sent-wrapper' : 'received-wrapper'}`}>
            <div className={`message ${isSent ? 'sent' : 'received'}`}>
              {msg.sender !== currentUser && <div className="sender">{msg.sender}</div>}
              {hasAttachment ? (
                <Media content={msg.content} resolveMediaUrl={resolveMediaUrl} />
              ) : (
                <p>{msg.content}</p>
              )}
              <div className="timestamp">{msg.timestamp}</div>
            </div>
          </div>
        </div>
      );
    },
    [currentUser, messages, resolveMediaUrl, selectedMessageIndex]
  );

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim() && uniqueSenders.includes(userInput.trim())) {
      setCurrentUser(userInput.trim());
    } else {
      alert('Please enter a valid name from the list.');
    }
  };

  const performSearch = useCallback(async () => {
    const source = messagesRef.current;
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const hasTextFilter = normalizedTerm.length > 0;
    const hasDateFilter = Boolean(dateSearch);

    const results = [];
    for (let index = 0; index < source.length; index += 1) {
      const message = source[index];
      const contentMatch = hasTextFilter ? message.contentLower.includes(normalizedTerm) : true;
      const dateMatch = hasDateFilter ? message.date === dateSearch : true;

      if (contentMatch && dateMatch) {
        results.push(index);
      }

      if (index % 5000 === 0) {
        await yieldToMain();
      }
    }

    setSearchResults(results);
    return results;
  }, [dateSearch, searchTerm]);

  const handleSearch = useCallback(async () => {
    if (isSearching || isLoading) return;

    setIsSearching(true);
    const results = await performSearch();
    if (results.length > 0) {
      setSelectedMessageIndex(results[0]);
      if (listRef.current) {
        listRef.current.scrollToRow(results[0]);
      }
    } else {
      alert('No messages found matching your search criteria.');
    }
    setIsSearching(false);
  }, [isLoading, isSearching, performSearch]);

  const jumpToNext = () => {
    if (searchResults.length === 0) return;
    const currentIndex = searchResults.indexOf(selectedMessageIndex);
    const nextIndex = (currentIndex + 1) % searchResults.length;
    setSelectedMessageIndex(searchResults[nextIndex]);
    if (listRef.current) {
      listRef.current.scrollToRow(searchResults[nextIndex]);
    }
  };

  const jumpToPrevious = () => {
    if (searchResults.length === 0) return;
    const currentIndex = searchResults.indexOf(selectedMessageIndex);
    const prevIndex = (currentIndex - 1 + searchResults.length) % searchResults.length;
    setSelectedMessageIndex(searchResults[prevIndex]);
    if (listRef.current) {
      listRef.current.scrollToRow(searchResults[prevIndex]);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDateSearch('');
    setDateInputValue('');
    setSearchResults([]);
    setSelectedMessageIndex(null);
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    setDateInputValue(value);
    setDateSearch(normalizeDateInputToSearch(value));
  };

  const handleDateBlur = () => {
    const normalizedDate = normalizeDateInputToSearch(dateInputValue);
    if (dateInputValue.trim() && !normalizedDate) {
      setDateSearch('');
      return;
    }

    if (normalizedDate) {
      setDateSearch(normalizedDate);
      setDateInputValue(normalizedDate);
    }
  };

  if (!currentUser) {
    return (
      <div className="app">
        <div className="chat-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <form onSubmit={handleUserSubmit} style={{ textAlign: 'center' }}>
            {isLoading && (
              <p className="loading-info">
                {loadingStatus} ({parseProgress}%)
              </p>
            )}
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
          type="text"
          value={dateInputValue}
          onChange={handleDateChange}
          onBlur={handleDateBlur}
          className="date-input"
          placeholder="YYYY-MM-DD or DD/MM/YY"
        />
        <button onClick={handleSearch} className="search-button" disabled={isSearching || isLoading}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
        {isLoading && <span className="loading-info">{loadingStatus} ({parseProgress}%)</span>}
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
              rowHeight={getRowHeight}
              rowRenderer={rowRenderer}
              overscanRowCount={30}
              scrollingResetTimeInterval={150}
              scrollToAlignment="start"
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

function Media({ content, resolveMediaUrl }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);

  const fileNameMatch = content.match(MEDIA_PREVIEW_REGEX);
  const hasMediaFile = Boolean(fileNameMatch);

  let fileName = '';
  let extension = 'download';
  if (hasMediaFile) {
    const normalizedFileName = fileNameMatch[0].replace(/\s/g, '');
    fileName = normalizedFileName;
    extension = normalizedFileName.includes('.') ? normalizedFileName.split('.').pop().toLowerCase() : 'download';

    if (normalizedFileName.endsWith('_')) {
      const baseName = normalizedFileName.slice(0, -1);
      extension = baseName.startsWith('AUD-') || baseName.startsWith('PTT-') ? 'audio' : 'download';
    }
  }

  useEffect(() => {
    if (!hasMediaFile || !fileName) {
      setIsLoaded(false);
      return;
    }

    setIsLoaded(loadedMediaKeys.has(fileName));
  }, [fileName, hasMediaFile]);

  useEffect(() => {
    let isMounted = true;
    if (!hasMediaFile || !fileName) return undefined;

    setIsResolvingUrl(true);
    resolveMediaUrl(fileName)
      .then((resolvedUrl) => {
        if (!isMounted) return;
        setMediaUrl(resolvedUrl);
        setIsResolvingUrl(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setMediaUrl(`/media/${encodeURIComponent(fileName)}`);
        setIsResolvingUrl(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fileName, hasMediaFile, resolveMediaUrl]);

  const handleLoad = () => {
    if (fileName) {
      loadedMediaKeys.add(fileName);
    }
    setIsLoaded(true);
  };

  const mediaHeights = {
    'jpg': 300,
    'jpeg': 300,
    'png': 300,
    'webp': 300,
    'mp4': 250,
    'opus': 60,
    'mp3': 60,
    'm4a': 60,
    'aac': 60,
    'ogg': 60,
    'wav': 60,
    'audio': 60,
    'zip': 50,
    'pdf': 50,
    'download': 50,
  };

  const fixedHeight = mediaHeights[extension] || 50;
  const loadingStyle = {
    display: isLoaded || isResolvingUrl ? 'none' : 'flex',
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

  if (!hasMediaFile) {
    return <p>{content}</p>;
  }

  if (isResolvingUrl || !mediaUrl) {
    return (
      <div style={{ ...loadingStyle, display: 'flex' }}>
        Resolving file...
      </div>
    );
  }

  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return (
        <div>
          {!isLoaded && <div style={loadingStyle}>Loading image...</div>}
          <div style={isLoaded ? mediaContainerStyle : null}>
            <img
              src={mediaUrl}
              alt="img"
              onLoad={handleLoad}
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                objectFit: 'contain',
                display: isLoaded ? 'block' : 'none',
                cursor: 'pointer',
              }}
              onClick={() => window.open(mediaUrl, '_blank')}
            />
          </div>
        </div>
      );
    case 'mp4':
      return (
        <div>
          {!isLoaded && <div style={loadingStyle}>Loading video...</div>}
          <div style={isLoaded ? mediaContainerStyle : null}>
            <video
              src={mediaUrl}
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
    case 'm4a':
    case 'aac':
    case 'ogg':
    case 'wav':
    case 'audio':
      return (
        <div style={{ width: '100%' }}>
          {!isLoaded && <div style={loadingStyle}>Loading audio...</div>}
          <div style={isLoaded ? mediaContainerStyle : null}>
            <audio
              src={mediaUrl}
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
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', marginBottom: '5px', height: `${fixedHeight}px` }}>
          <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
            <path fill="#555" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
          <a
            href={mediaUrl}
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
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', marginBottom: '5px', height: `${fixedHeight}px` }}>
          <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
            <path fill="#555" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
          <a
            href={mediaUrl}
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