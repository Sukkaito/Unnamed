import { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  type: 'player' | 'system';
  content: string;
}

interface ChatProps {
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export function Chat({ chatMessages, onSendMessage }: ChatProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = () => {
    const message = inputValue.trim();
    if (message) {
      onSendMessage(message);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div id="chat" style={{
      position: 'absolute',
      bottom: '10px',
      left: '10px',
      width: '300px',
      background: 'rgba(0, 0, 0, 0.7)',
      borderRadius: '5px',
      border: '1px solid #0f3460'
    }}>
      <div id="chatMessages" style={{
        height: '150px',
        overflowY: 'auto',
        padding: '10px'
      }}>
        {chatMessages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.type}`}
            style={{
              margin: '5px 0',
              fontSize: '12px',
              color: msg.type === 'system' ? '#4ECDC4' : '#FFEAA7',
              fontStyle: msg.type === 'system' ? 'italic' : 'normal'
            }}
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div id="chatInputContainer" style={{
        display: 'flex',
        padding: '10px',
        borderTop: '1px solid #0f3460'
      }}>
        <input
          type="text"
          id="chatInput"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            flex: 1,
            padding: '5px',
            background: '#1a1a2e',
            border: '1px solid #0f3460',
            color: 'white',
            borderRadius: '3px'
          }}
        />
        <button
          id="sendButton"
          onClick={handleSend}
          style={{
            marginLeft: '5px',
            padding: '5px 10px',
            background: '#0f3460',
            border: 'none',
            color: 'white',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

