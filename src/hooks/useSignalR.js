import { useEffect, useRef, useState, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'

const HUB_URL = 'http://localhost:5112/chathub'

export function useSignalR(onReceiveMessage) {
  const connectionRef = useRef(null)
  const [status, setStatus] = useState('disconnected')

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connection.on('ReceiveMessage', onReceiveMessage)
    connection.onreconnecting(() => setStatus('connecting'))
    connection.onreconnected(() => setStatus('connected'))
    connection.onclose(() => setStatus('disconnected'))

    setStatus('connecting')
    connection.start()
      .then(() => setStatus('connected'))
      .catch(() => setStatus('error'))

    connectionRef.current = connection
    return () => { connection.stop() }
  }, [])

  // sendMessage giờ nhận thêm conversationId
  const sendMessage = useCallback(async (conversationId, message, provider) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke('SendMessage', conversationId, message, provider)
    }
  }, [])

  return { sendMessage, status }
}
