import { useState, useRef } from 'react'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const [attachedFile, setAttachedFile] = useState(null) // file đang đính kèm
  const ref = useRef(null)
  const fileRef = useRef(null)

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed && !attachedFile) return
    if (disabled) return

    if (attachedFile) {
      // Có file → upload lên backend đọc nội dung rồi gửi cho AI
      const formData = new FormData()
      formData.append('file', attachedFile)
      try {
        const res = await fetch('http://localhost:5112/api/files/upload', {
          method: 'POST',
          body: formData
        })

        if (!res.ok) {
          const err = await res.json()
          console.error('Upload lỗi:', err.error)
          alert(err.error) // hoặc hiện toast thay vì alert
          return
        }

        const data = await res.json()
        onSend(trimmed, data.content, data.fileName, attachedFile.size, data.fileType)
      } catch (err) {
        console.error('Upload lỗi:', err)
        return
      }
    } else {
      // Không có file → gửi text thuần
      onSend(trimmed)
    }

    setText('')
    setAttachedFile(null)
    if (ref.current) ref.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) setAttachedFile(file) // chỉ lưu file, chưa upload
    e.target.value = ''
  }

  return (
    <div className="chat-input-wrapper-inner">
      {/* Chip hiện tên file khi đã chọn */}
      {attachedFile && (
        <div className="file-chip">
          <span>📄 {attachedFile.name}</span>
          <button onClick={() => setAttachedFile(null)} title="Bỏ file">✕</button>
        </div>
      )}

      <div className="chat-input-area">
        {/* Nút đính kèm file */}
        <button
          className="upload-btn"
          onClick={() => fileRef.current.click()}
          disabled={disabled}
          title="Đính kèm file TXT"
        >
          📎
        </button>

        {/* Input file ẩn */}
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.pdf,.docx"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <textarea
          ref={ref}
          className="chat-input"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={attachedFile ? 'Hỏi gì đó về file...' : 'Nhập tin nhắn...'}
          rows={1}
          disabled={disabled}
        />

        <button
          className="send-btn"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !attachedFile)}
        >
          ➤
        </button>
      </div>
    </div>
  )
}