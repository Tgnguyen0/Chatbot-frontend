import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

// Hàm định dạng thời gian theo kiểu Việt Nam (HH:mm)
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ChatWindow({
  messages,
  isTyping,
  suggestions,
  onSuggestion
}) {
  // Dùng để cuộn xuống cuối khung chat
  const bottomRef = useRef(null)

  // Mỗi khi có tin nhắn mới hoặc bot đang gõ thì tự cuộn xuống dưới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="chat-window">
      {/* Màn hình chào khi chưa có tin nhắn */}
      {messages.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✦</div>

          <p className="empty-title">Xin chào!</p>

          <p className="empty-sub">
            Mình có thể giúp gì cho bạn hôm nay?
          </p>

          {/* Các câu gợi ý để người dùng bấm nhanh */}
          <div className="empty-suggestions">
            {suggestions?.map(s => (
              <button
                key={s}
                className="suggestion-chip"
                onClick={() => onSuggestion(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách tin nhắn */}
      {messages.map((msg) => (
        <div key={msg.id} className={`bubble-row ${msg.role}`}>

          {/* Avatar chỉ hiện ở phía bot */}
          {msg.role === 'bot' && (
            <div className="avatar">✦</div>
          )}

          <div className="bubble-group">

            {/* Hiển thị các file đính kèm nếu có */}
            {msg.attachments?.map((f, i) => (
              <div key={i} className="file-card">

                {/* Icon file */}
                <div className="file-card-icon">📄</div>

                <div className="file-card-info">

                  {/* Tên file */}
                  <span className="file-card-name">
                    {f.name}
                  </span>

                  {/* Kích thước và loại file */}
                  <span className="file-card-size">
                    {(f.size / 1024).toFixed(1)} KB · {f.fileType ?? 'TXT'}
                  </span>

                </div>
              </div>
            ))}

            {/* Bong bóng tin nhắn */}
            <div className={`bubble ${msg.role}`}>

              {/* Tin nhắn bot hỗ trợ Markdown */}
              {msg.role === 'bot' ? (
                <div className="markdown-body">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                // Tin nhắn người dùng hiển thị text thường
                msg.text
              )}

            </div>

            {/* Thời gian gửi tin nhắn */}
            <span className={`timestamp ${msg.role}`}>
              {formatTime(msg.id)}
            </span>

          </div>
        </div>
      ))}

      {/* Hiệu ứng bot đang nhập */}
      {isTyping && (
        <div className="bubble-row bot">
          <div className="avatar">✦</div>

          <div className="bubble bot typing">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      {/* Điểm neo để cuộn xuống cuối */}
      <div ref={bottomRef} />
    </div>
  )
}