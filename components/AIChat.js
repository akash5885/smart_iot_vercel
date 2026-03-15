import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Zap } from 'lucide-react'

const QUICK_QUESTIONS = {
  admin: [
    'How many devices are currently online?',
    'Show me a summary of all customer accounts',
    'What are the most common device types?',
    'Are there any devices with errors?',
  ],
  support: [
    'Which customers have offline devices?',
    'What are common troubleshooting steps?',
    'How do I help a customer reset their device?',
    'What does each device type do?',
  ],
  customer: [
    'How do I add a new device?',
    'Why is my device showing offline?',
    'How can I save energy with my smart devices?',
    'What does the thermostat target temperature mean?',
  ],
}

const ROLE_LABELS = {
  admin: { label: 'Admin AI', color: 'text-purple-400 bg-purple-500/10' },
  support: { label: 'Support AI', color: 'text-blue-400 bg-blue-500/10' },
  customer: { label: 'Personal AI', color: 'text-green-400 bg-green-500/10' },
}

export default function AIChat({ userRole }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const roleConfig = ROLE_LABELS[userRole] || ROLE_LABELS.customer
  const quickQuestions = QUICK_QUESTIONS[userRole] || QUICK_QUESTIONS.customer

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Welcome message
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Hello! I'm your ${roleConfig.label}. I can help you manage your IoT devices and answer questions about the platform. What would you like to know?`,
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }, [])

  const sendMessage = async (messageText = null) => {
    const text = messageText || input.trim()
    if (!text || loading) return

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      // Build conversation history (exclude welcome message, last 10 msgs)
      const conversationHistory = messages
        .filter((m) => m.role !== 'system')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const aiMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (err) {
      setError(err.message || 'Failed to get AI response. Please try again.')
      console.error('AI chat error:', err)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-[600px] card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/50">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
          <Bot size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">AI Assistant</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleConfig.color}`}>
            {roleConfig.label}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-500">Powered by Llama 3.3</span>
        </div>
      </div>

      {/* Quick Questions */}
      {messages.length <= 1 && (
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/30">
          <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors border border-gray-700 hover:border-gray-600 flex items-center gap-1"
              >
                <Zap size={10} className="text-yellow-400" />
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-blue-400 border border-gray-700'
              }`}
            >
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-gray-600 text-xs mt-1 px-1">{formatTime(msg.timestamp)}</span>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3 flex-row">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-800 text-blue-400 border border-gray-700">
              <Bot size={14} />
            </div>
            <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-blue-400" />
              <span className="text-gray-400 text-sm">Thinking...</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-400 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-900/30">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your IoT devices..."
            rows={1}
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none placeholder-gray-500 disabled:opacity-50"
            style={{ maxHeight: '80px', overflowY: 'auto' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary px-3 py-2.5 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 px-1">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  )
}
