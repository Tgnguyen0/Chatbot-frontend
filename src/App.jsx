import { useState, useCallback, useEffect } from 'react'
import ChatWindow from './components/ChatWindow'
import ChatInput from './components/ChatInput'
import { useSignalR } from './hooks/useSignalR'

// Base URL cho tất cả API calls
const API = 'http://localhost:5112/api/conversations'

// Gợi ý câu hỏi hiện ở empty state
const SUGGESTIONS = [
  'Giải thích async/await',
  'Viết unit test cho Java',
  'Tối ưu SQL query',
  'Review code của tôi',
]

export default function App() {
  const [conversations, setConversations] = useState([])  // danh sách sidebar
  const [activeId, setActiveId] = useState(null)          // conversation đang mở
  const [messages, setMessages] = useState([])            // tin nhắn trong conversation hiện tại
  const [isTyping, setIsTyping] = useState(false)         // bot đang trả lời

  const [provider, setProvider] = useState('Gemini')      // LLM đang chọn
  const [providers, setProviders] = useState(['Gemini'])  // danh sách LLM có sẵn

  // Load danh sách LLM provider từ backend khi mở lên
  useEffect(() => {
    fetch('http://localhost:5112/api/conversations/providers')
      .then(r => r.json())
      .then(data => {
        setProviders(data.providers)
        setProvider(data.active)
      })
  }, [])

  // Load danh sách conversations khi mở app (hiện lên sidebar)
  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(setConversations)
      .catch(console.error)
  }, [])

  // Click vào conversation trong sidebar → load lịch sử tin nhắn
  const selectConversation = async (id) => {
    setActiveId(id)
    setMessages([])
    try {
      const res = await fetch(`${API}/${id}/messages`)
      const data = await res.json()
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role === 'user' ? 'user' : 'bot',
        text: m.text,
      })))
    } catch (e) {
      console.error(e)
    }
  }

  // Tạo conversation mới → thêm vào đầu sidebar, clear messages
  const newConversation = async () => {
    const res = await fetch(API, { method: 'POST' })
    const conv = await res.json()
    setConversations(prev => [conv, ...prev])
    setActiveId(conv.id)
    setMessages([])
  }

  // Xoá conversation → xoá khỏi sidebar, clear nếu đang active
  const deleteConversation = async (id, e) => {
    e.stopPropagation() // tránh trigger selectConversation
    await fetch(`${API}/${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) { setActiveId(null); setMessages([]) }
  }

  // Callback nhận tin nhắn từ bot qua SignalR
  const onReceiveMessage = useCallback((role, text) => {
    setIsTyping(false)
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'bot',
      text: role === 'error' ? '⚠️ ' + text : text
    }])
    // Refresh sidebar để cập nhật title + thứ tự mới nhất
    fetch(API).then(r => r.json()).then(setConversations)
  }, [])

  const { sendMessage, status } = useSignalR(onReceiveMessage)

  // Gửi tin nhắn — hỗ trợ cả text thuần và kèm file
  // text: câu hỏi của user
  // fileContent: nội dung file đọc được (gửi ngầm cho AI)
  // fileName: tên file (hiện lên UI dạng card)
  // fileSize: dung lượng file (hiện trong card)
  const handleSend = async (text, fileContent = null, fileName = null, fileSize = null, fileType = null) => {
    const attachments = fileName ? [{ name: fileName, size: fileSize, fileType }] : []

    // Bubble user chỉ hiện câu hỏi + card file, không lộ nội dung file
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      text: text || '',
      attachments
    }])
    setIsTyping(true)

    // Nội dung thật gửi cho AI = nội dung file + câu hỏi
    const actualText = fileContent
      ? `Nội dung file "${fileName}":\n\n${fileContent}\n\n${text}`
      : text

    // Nếu chưa có conversation → tự tạo mới rồi gửi luôn
    if (!activeId) {
      const res = await fetch(API, { method: 'POST' })
      const conv = await res.json()
      setConversations(prev => [conv, ...prev])
      setActiveId(conv.id)
      await sendMessage(conv.id, actualText, provider)
      return
    }

    await sendMessage(activeId, actualText, provider)
  }

  const statusLabel = {
    connected:    '🟢 Đã kết nối',
    connecting:   '🟡 Đang kết nối...',
    disconnected: '🔴 Mất kết nối',
    error:        '🔴 Không thể kết nối',
  }

  return (
    <div className="app">
      {/* Sidebar trái — logo, nút tạo mới, danh sách conversation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">✦</span>
          <span>ChatBot AI</span>
        </div>

        <button className="sidebar-new-btn" onClick={newConversation}>
          ＋ &nbsp;Cuộc trò chuyện mới
        </button>

        {conversations.length > 0 && (
          <div className="sidebar-label">Lịch sử</div>
        )}

        {conversations.map(c => (
          <div
            key={c.id}
            className={`sidebar-item ${activeId === c.id ? 'active' : ''}`}
            onClick={() => selectConversation(c.id)}
          >
            <span className="sidebar-item-title">{c.title}</span>
            <button
              className="sidebar-delete-btn"
              onClick={(e) => deleteConversation(c.id, e)}
              title="Xoá"
            >✕</button>
          </div>
        ))}
      </aside>

      {/* Main area — header, cửa sổ chat, ô nhập */}
      <div className="main">
        <header className="header">
          {/* Dropdown chọn LLM provider */}
          <select
            className="provider-select"
            value={provider}
            onChange={e => setProvider(e.target.value)}
          >
            {providers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span className="status">{statusLabel[status]}</span>
        </header>

        {/* Cửa sổ hiển thị tin nhắn */}
        <ChatWindow
          messages={messages}
          isTyping={isTyping}
          suggestions={!activeId ? SUGGESTIONS : []}
          onSuggestion={handleSend}
        />

        {/* Ô nhập tin nhắn + upload file */}
        <div className="chat-input-wrapper">
          <ChatInput
            onSend={handleSend}
            disabled={status !== 'connected' || isTyping}
          />
          <p className="input-hint">Enter để gửi · Shift+Enter xuống dòng</p>
        </div>
      </div>
    </div>
  )
}