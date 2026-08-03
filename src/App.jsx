import { useState, useCallback, useEffect } from 'react'
import ChatWindow from './components/ChatWindow'
import ChatInput from './components/ChatInput'
import { useSignalR } from './hooks/useSignalR'

// ==========================================
// CẤU HÌNH BAN ĐẦU & BIẾN HẰNG SỐ (CONSTANTS)
// ==========================================

// Base URL định tuyến đến API quản lý các cuộc trò chuyện ở Backend (ASP.NET Core / Node.js)
const API = 'http://localhost:5112/api/conversations'

// Danh sách các câu hỏi mẫu/gợi ý hiển thị ở giao diện trống (khi chưa mở cuộc trò chuyện nào)
const SUGGESTIONS = [
  'Giải thích async/await',
  'Viết unit test cho Java',
  'Tối ưu SQL query',
  'Review code của tôi',
]

/**
 * Component chính quản lý toàn bộ trạng thái và giao diện của ứng dụng ChatBot AI
 */
export default function App() {
  // ==========================================
  // KHAI BÁO CÁC STATE (TRẠNG THÁI ỨNG DỤNG)
  // ==========================================

  // Lưu danh sách tất cả cuộc trò chuyện hiển thị trên thanh Sidebar bên trái
  const [conversations, setConversations] = useState([])

  // Lưu ID của cuộc trò chuyện hiện đang được chọn/mở
  const [activeId, setActiveId] = useState(null)

  // Lưu danh sách các tin nhắn (User & AI) của cuộc trò chuyện đang active
  const [messages, setMessages] = useState([])

  // Trạng thái cho biết AI có đang phản hồi/đang gõ hay không (dùng để hiện hiệu ứng loading/disable input)
  const [isTyping, setIsTyping] = useState(false)

  // Lưu mô hình AI (LLM Provider) hiện đang được chọn (mặc định: Gemini)
  const [provider, setProvider] = useState('Gemini')

  // Danh sách các mô hình AI khả dụng được lấy từ server backend
  const [providers, setProviders] = useState(['Gemini'])

  // ==========================================
  // SIDE EFFECTS (EFFECTS)
  // ==========================================

  /**
   * Effect 1: Gọi API lấy danh sách các LLM Providers khả dụng từ backend khi component mount lần đầu
   */
  useEffect(() => {
    fetch('http://localhost:5112/api/conversations/providers')
      .then((r) => r.json())
      .then((data) => {
        setProviders(data.providers) // Cập nhật danh sách các Provider (Gemini, Groq, OpenAI...)
        setProvider(data.active) // Thiết lập Provider mặc định do server chỉ định
      })
      .catch((err) => console.error('Lỗi khi tải danh sách provider:', err))
  }, [])

  /**
   * Effect 2: Gọi API tải lịch sử danh sách các cuộc trò chuyện để hiển thị lên Sidebar
   */
  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then(setConversations) // Gán dữ liệu nhận được vào state conversations
      .catch((err) => console.error('Lỗi khi tải danh sách hội thoại:', err))
  }, [])

  // ==========================================
  // CÁC HÀM XỬ LÝ SỰ KIỆN (EVENT HANDLERS)
  // ==========================================

  /**
   * Xử lý khi người dùng click chọn một cuộc trò chuyện trên Sidebar
   * @param {string|number} id - ID của cuộc trò chuyện được chọn
   */
  const selectConversation = async (id) => {
    setActiveId(id) // Đánh dấu ID đang active
    setMessages([]) // Xóa tạm danh sách tin nhắn cũ trong view để chờ nạp dữ liệu mới

    try {
      // Gọi API lấy toàn bộ tin nhắn thuộc về cuộc trò chuyện này
      const res = await fetch(`${API}/${id}/messages`)
      const data = await res.json()

      // Chuẩn hóa lại định dạng dữ liệu tin nhắn trước khi lưu vào State
      setMessages(
        data.map((m) => ({
          id: m.id,
          role: m.role === 'user' ? 'user' : 'bot', // Chuyển đổi role về đúng dạng 'user' hoặc 'bot'
          text: m.text,
        }))
      )
    } catch (e) {
      console.error('Lỗi khi tải nội dung tin nhắn:', e)
    }
  }

  /**
   * Xử lý khi người dùng nhấn nút "Cuộc trò chuyện mới"
   */
  const newConversation = async () => {
    try {
      // Gửi yêu cầu POST tạo mới một conversation trống ở server backend
      const res = await fetch(API, { method: 'POST' })
      const conv = await res.json()

      // Thêm cuộc trò chuyện mới vừa tạo vào ĐẦU danh sách trên Sidebar
      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.id) // Đặt conversation mới tạo làm active
      setMessages([]) // Reset khung chat thành trống
    } catch (e) {
      console.error('Lỗi khi tạo cuộc trò chuyện mới:', e)
    }
  }

  /**
   * Xử lý xoá một cuộc trò chuyện
   * @param {string|number} id - ID cuộc trò chuyện cần xoá
   * @param {Event} e - Event click của nút xoá (dùng để chặn bubble event lên thẻ cha)
   */
  const deleteConversation = async (id, e) => {
    e.stopPropagation() // Ngăn chặn sự kiện click lan ra ngoài (không kích hoạt selectConversation)

    try {
      // Gọi API yêu cầu xoá cuộc trò chuyện theo ID
      await fetch(`${API}/${id}`, { method: 'DELETE' })

      // Lọc và xóa conversation ra khỏi State danh sách
      setConversations((prev) => prev.filter((c) => c.id !== id))

      // Nếu conversation bị xoá đang mở -> reset màn hình chat về trạng thái trống
      if (activeId === id) {
        setActiveId(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Lỗi khi xoá cuộc trò chuyện:', err)
    }
  }

  // ==========================================
  // TÍCH HỢP SIGNALR (REAL-TIME COMMUNICATION)
  // ==========================================

  /**
   * Callback được truyền vào Hook `useSignalR`
   * Sẽ tự động kích hoạt khi nhận được phản hồi (message stream/complete) từ Backend SignalR Hub
   */
  const onReceiveMessage = useCallback((role, text) => {
    setIsTyping(false) // Tắt trạng thái AI đang gõ

    // Thêm tin nhắn từ AI (hoặc tin báo lỗi) vào danh sách tin nhắn hiện tại
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: 'bot',
        text: role === 'error' ? '⚠️ ' + text : text, // Gắn icon cảnh báo nếu là lỗi
      },
    ])

    // Gọi lại API lấy danh sách conversation để cập nhật Tiêu đề (Title) & thứ tự cuộc trò chuyện mới nhất ở Sidebar
    fetch(API)
      .then((r) => r.json())
      .then(setConversations)
      .catch(console.error)
  }, [])

  // Sử dụng custom hook useSignalR để lấy hàm gửi tin nhắn realtime và trạng thái kết nối socket
  const { sendMessage, status } = useSignalR(onReceiveMessage)

  /**
   * Xử lý gửi tin nhắn từ phía User (Bao gồm văn bản thuần và tệp đính kèm)
   * @param {string} text - Nội dung câu hỏi/tin nhắn
   * @param {string|null} fileContent - Nội dung chi tiết của file đã được đọc
   * @param {string|null} fileName - Tên file đính kèm
   * @param {number|string|null} fileSize - Kích thước file
   * @param {string|null} fileType - Định dạng/Loại file
   */
  const handleSend = async (
    text,
    fileContent = null,
    fileName = null,
    fileSize = null,
    fileType = null
  ) => {
    // Nếu có truyền file, tạo object attachment để render UI dạng Thẻ/Card File đính kèm
    const attachments = fileName
      ? [{ name: fileName, size: fileSize, fileType }]
      : []

    // 1. Cập nhật UI ngay lập tức: Thêm bong bóng chat của User (chỉ hiển thị câu hỏi + Card file đính kèm)
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: 'user',
        text: text || '',
        attachments,
      },
    ])
    setIsTyping(true) // Bật trạng thái chờ AI phản hồi

    // 2. Chuẩn bị nội dung thực sự sẽ gửi tới LLM (nối thêm nội dung file nếu có)
    const actualText = fileContent
      ? `Nội dung file "${fileName}":\n\n${fileContent}\n\n${text}`
      : text

    // 3. Trường hợp chưa chọn/chưa có cuộc trò chuyện nào -> Tự động tạo mới cuộc trò chuyện rồi mới gửi
    if (!activeId) {
      const res = await fetch(API, { method: 'POST' })
      const conv = await res.json()

      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.id)

      // Gửi tin nhắn qua SignalR với conversationId vừa được tạo mới
      await sendMessage(conv.id, actualText, provider)
      return
    }

    // 4. Trường hợp đã có cuộc trò chuyện active -> Gửi trực tiếp qua SignalR
    await sendMessage(activeId, actualText, provider)
  }

  // Dictionary ánh xạ trạng thái kết nối SignalR sang dạng văn bản + Icon trực quan
  const statusLabel = {
    connected: '🟢 Đã kết nối',
    connecting: '🟡 Đang kết nối...',
    disconnected: '🔴 Mất kết nối',
    error: '🔴 Không thể kết nối',
  }

  // ==========================================
  // RENDER GIAO DIỆN (UI)
  // ==========================================
  return (
    <div className="app">
      {/* -------------------------------------------------------------
          1. SIDEBAR BÊN TRÁI: Logo, Nút tạo cuộc trò chuyện & Lịch sử
         ------------------------------------------------------------- */}
      <aside className="sidebar">
        {/* Logo ứng dụng */}
        <div className="sidebar-logo">
          <span className="logo-icon">✦</span>
          <span>ChatBot AI</span>
        </div>

        {/* Nút tạo cuộc trò chuyện mới */}
        <button className="sidebar-new-btn" onClick={newConversation}>
          ＋ &nbsp;Cuộc trò chuyện mới
        </button>

        {/* Nhãn tiêu đề mục Lịch sử */}
        {conversations.length > 0 && (
          <div className="sidebar-label">Lịch sử</div>
        )}

        {/* Danh sách các cuộc trò chuyện */}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`sidebar-item ${activeId === c.id ? 'active' : ''}`}
            onClick={() => selectConversation(c.id)}
          >
            <span className="sidebar-item-title">{c.title}</span>
            {/* Nút xóa nhanh cuộc trò chuyện */}
            <button
              className="sidebar-delete-btn"
              onClick={(e) => deleteConversation(c.id, e)}
              title="Xoá"
            >
              ✕
            </button>
          </div>
        ))}
      </aside>

      {/* -------------------------------------------------------------
          2. KHU VỰC CHÍNH (MAIN): Header, Khung Chat & Ô nhập liệu
         ------------------------------------------------------------- */}
      <div className="main">
        {/* Header chứa menu chọn AI Model và Trạng thái kết nối SignalR */}
        <header className="header">
          {/* Dropdown danh sách LLM Providers (Gemini, Groq, OpenAI...) */}
          <select
            className="provider-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Badge hiển thị trạng thái kết nối Realtime */}
          <span className="status">{statusLabel[status]}</span>
        </header>

        {/* Cửa sổ Chat - Hiển thị danh sách câu hỏi & câu trả lời */}
        <ChatWindow
          messages={messages}
          isTyping={isTyping}
          suggestions={!activeId ? SUGGESTIONS : []} // Nếu chưa chọn conversation thì hiện gợi ý
          onSuggestion={handleSend}
        />

        {/* Khu vực ô nhập tin nhắn và tải file đính kèm */}
        <div className="chat-input-wrapper">
          <ChatInput
            onSend={handleSend}
            disabled={status !== 'connected' || isTyping} // Disable khi mất mạng hoặc AI đang trả lời
          />
          <p className="input-hint">Enter để gửi · Shift+Enter xuống dòng</p>
        </div>
      </div>
    </div>
  )
}