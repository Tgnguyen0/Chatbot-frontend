import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatWindow({ messages, isTyping, suggestions, onSuggestion }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="chat-window">
      {messages.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✦</div>
          <p className="empty-title">Xin chào!</p>
          <p className="empty-sub">Mình có thể giúp gì cho bạn hôm nay?</p>
          <div className="empty-suggestions">
            {suggestions?.map(s => (
              <button key={s} className="suggestion-chip" onClick={() => onSuggestion(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className={`bubble-row ${msg.role}`}>
          {msg.role === 'bot' && (
            <div className="avatar">✦</div>
          )}
          <div className="bubble-group">
            <div className={`bubble ${msg.role}`}>
              {msg.role === 'bot' ? (
                <div className="markdown-body">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : msg.text}
            </div>
            <span className={`timestamp ${msg.role}`}>{formatTime(msg.id)}</span>
          </div>
        </div>
      ))}

      {isTyping && (
        <div className="bubble-row bot">
          <div className="avatar">✦</div>
          <div className="bubble bot typing">
            <span /><span /><span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
