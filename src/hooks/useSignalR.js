import { useEffect, useRef, useState, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'

// Địa chỉ SignalR Hub ở backend
const HUB_URL = 'http://localhost:5112/chathub'

/**
 * Custom hook quản lý kết nối SignalR
 * @param {Function} onReceiveMessage - Hàm được gọi khi nhận tin nhắn từ server
 */
export function useSignalR(onReceiveMessage) {
  // Lưu instance của HubConnection để không bị tạo lại khi re-render
  const connectionRef = useRef(null)

  // Trạng thái kết nối: disconnected | connecting | connected | error
  const [status, setStatus] = useState('disconnected')

  useEffect(() => {
    // Tạo kết nối SignalR
    const connection = new signalR.HubConnectionBuilder()
      // URL của hub backend
      .withUrl(HUB_URL)
      // Tự động reconnect khi mất mạng / server restart
      .withAutomaticReconnect()
      // Chỉ log cảnh báo và lỗi
      .configureLogging(signalR.LogLevel.Warning)
      // Build connection
      .build()

    // Lắng nghe sự kiện ReceiveMessage từ server
    // Khi server gửi message sẽ gọi callback truyền từ component
    connection.on('ReceiveMessage', onReceiveMessage)

    // Đang reconnect
    connection.onreconnecting(() => setStatus('connecting'))

    // Reconnect thành công
    connection.onreconnected(() => setStatus('connected'))

    // Kết nối bị đóng hoàn toàn
    connection.onclose(() => setStatus('disconnected'))

    // Bắt đầu kết nối
    setStatus('connecting')
    connection
      .start()
      .then(() => setStatus('connected')) // kết nối thành công
      .catch(() => setStatus('error')) // kết nối thất bại

    // Lưu connection vào ref để dùng ở hàm sendMessage
    connectionRef.current = connection

    // Cleanup khi component unmount
    return () => {
      connection.stop()
    }
  }, [])

  /**
   * Gửi tin nhắn lên SignalR Hub
   * @param {number|string} conversationId - ID cuộc hội thoại
   * @param {string} message - Nội dung tin nhắn
   * @param {string} provider - LLM provider (gemini, groq, openai...)
   */
  const sendMessage = useCallback(
    async (conversationId, message, provider) => {
      // Chỉ gửi khi kết nối đang ở trạng thái Connected
      if (
        connectionRef.current?.state === signalR.HubConnectionState.Connected
      ) {
        // Gọi method SendMessage trong ChatHub
        await connectionRef.current.invoke(
          'SendMessage',
          conversationId,
          message,
          provider
        )
      }
    },
    []
  )

  // Trả về hàm gửi tin nhắn và trạng thái kết nối
  return { sendMessage, status }
}