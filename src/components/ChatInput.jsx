import { useState, useRef } from 'react'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const ref = useRef(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    ref.current.style.height = 'auto'
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

  return (
    <div className="chat-input-area">
      <textarea
        ref={ref}
        className="chat-input"
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Nhập tin nhắn..."
        rows={1}
        disabled={disabled}
      />
      <button className="send-btn" onClick={handleSend} disabled={disabled || !text.trim()}>
        ➤
      </button>
    </div>
  )
}
