import { useState, useRef } from 'react'

export default function ChatInput({ onSend, disabled }) {
  // Nội dung người dùng nhập
  const [text, setText] = useState('')

  // File đang được đính kèm
  const [attachedFile, setAttachedFile] = useState(null)

  // Tham chiếu đến textarea để tự tăng chiều cao
  const ref = useRef(null)

  // Tham chiếu đến input file ẩn
  const fileRef = useRef(null)

  // Hàm gửi tin nhắn
  const handleSend = async () => {
    const trimmed = text.trim()

    // Không có text và cũng không có file thì không gửi
    if (!trimmed && !attachedFile) return

    // Đang ở trạng thái disabled thì không cho gửi
    if (disabled) return

    // Nếu có file đính kèm
    if (attachedFile) {
      // Tạo FormData để upload file lên backend
      const formData = new FormData()
      formData.append('file', attachedFile)

      try {
        // Gửi file lên API
        const res = await fetch('http://localhost:5112/api/files/upload', {
          method: 'POST',
          body: formData
        })

        // Nếu upload thất bại
        if (!res.ok) {
          const err = await res.json()
          console.error('Upload lỗi:', err.error)
          alert(err.error)
          return
        }

        // Nhận dữ liệu file đã được backend xử lý
        const data = await res.json()

        // Gửi text + nội dung file cho component cha
        onSend(
          trimmed,
          data.content,
          data.fileName,
          attachedFile.size,
          data.fileType
        )
      } catch (err) {
        console.error('Upload lỗi:', err)
        return
      }
    } else {
      // Không có file -> chỉ gửi text
      onSend(trimmed)
    }

    // Reset nội dung sau khi gửi thành công
    setText('')
    setAttachedFile(null)

    // Đưa chiều cao textarea về mặc định
    if (ref.current) ref.current.style.height = 'auto'
  }

  // Nhấn Enter để gửi, Shift + Enter để xuống dòng
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Tự động tăng chiều cao textarea theo nội dung
  const handleInput = (e) => {
    setText(e.target.value)

    // Reset chiều cao trước khi tính lại
    e.target.style.height = 'auto'

    // Giới hạn chiều cao tối đa 140px
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  // Xử lý khi người dùng chọn file
  const handleFileChange = (e) => {
    const file = e.target.files[0]

    // Chỉ lưu file vào state, chưa upload ngay
    if (file) setAttachedFile(file)

    // Reset input để có thể chọn lại cùng một file
    e.target.value = ''
  }

  return (
    <div className="chat-input-wrapper-inner">
      {/* Hiển thị tên file đã chọn */}
      {attachedFile && (
        <div className="file-chip">
          <span>📄 {attachedFile.name}</span>

          {/* Nút bỏ file */}
          <button
            onClick={() => setAttachedFile(null)}
            title="Bỏ file"
          >
            ✕
          </button>
        </div>
      )}

      <div className="chat-input-area">
        {/* Nút mở hộp chọn file */}
        <button
          className="upload-btn"
          onClick={() => fileRef.current.click()}
          disabled={disabled}
          title="Đính kèm file TXT/PDF/DOCX"
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

        {/* Ô nhập tin nhắn */}
        <textarea
          ref={ref}
          className="chat-input"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            attachedFile
              ? 'Hỏi gì đó về file...'
              : 'Nhập tin nhắn...'
          }
          rows={1}
          disabled={disabled}
        />

        {/* Nút gửi */}
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