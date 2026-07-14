import { useState, useCallback, useEffect } from 'react'
import ChatWindow from './components/ChatWindow'
import ChatInput from './components/ChatInput'
import { useSignalR } from './hooks/useSignalR'

const API = 'http://localhost:5112/api/conversations'

const SUGGESTIONS = [
  'Giải thích async/await',
  'Viết unit test cho Java',
  'Tối ưu SQL query',
  'Review code của tôi',
]

export default function App() {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)

  const [provider, setProvider] = useState('Gemini')
  const [providers, setProviders] = useState(['Gemini'])

  // Load danh sách providers khi mở app
  useEffect(() => {
    fetch('http://localhost:5112/api/conversations/providers')
      .then(r => r.json())
      .then(data => {
        setProviders(data.providers)
        setProvider(data.active)
      })
  }, [])

  // Load danh sách conversations khi mở app
  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(setConversations)
      .catch(console.error)
  }, [])

  // Load lịch sử khi chọn conversation
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

  // Tạo conversation mới
  const newConversation = async () => {
    const res = await fetch(API, { method: 'POST' })
    const conv = await res.json()
    setConversations(prev => [conv, ...prev])
    setActiveId(conv.id)
    setMessages([])
  }

  // Xoá conversation
  const deleteConversation = async (id, e) => {
    e.stopPropagation()
    await fetch(`${API}/${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) { setActiveId(null); setMessages([]) }
  }

  const onReceiveMessage = useCallback((role, text) => {
    setIsTyping(false)
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'bot',
      text: role === 'error' ? '⚠️ ' + text : text
    }])
    // Refresh sidebar để cập nhật title + thứ tự
    fetch(API).then(r => r.json()).then(setConversations)
  }, [])

  const { sendMessage, status } = useSignalR(onReceiveMessage)

  const handleSend = async (text) => {
    if (!activeId) {
      const res = await fetch(API, { method: 'POST' })
      const conv = await res.json()
      setConversations(prev => [conv, ...prev])
      setActiveId(conv.id)
      setMessages([{ id: Date.now(), role: 'user', text }])
      setIsTyping(true)
      await sendMessage(conv.id, text, provider)  // ← thêm provider
      return
    }
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text }])
    setIsTyping(true)
    await sendMessage(activeId, text, provider)   // ← thêm provider
  }

  const statusLabel = {
    connected:    '🟢 Đã kết nối',
    connecting:   '🟡 Đang kết nối...',
    disconnected: '🔴 Mất kết nối',
    error:        '🔴 Không thể kết nối',
  }

  return (
    <div className="app">
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

      <div className="main">
        <header className="header">
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

        <ChatWindow
          messages={messages}
          isTyping={isTyping}
          suggestions={!activeId ? SUGGESTIONS : []}
          onSuggestion={handleSend}
        />

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
