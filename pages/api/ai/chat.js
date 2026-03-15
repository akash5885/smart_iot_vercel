import { withAuth } from '../../../lib/auth'
import { supabaseAdmin } from '../../../lib/supabase'
import { getAIResponse } from '../../../lib/groq'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id: userId, role } = req.user

  try {
    const { message, conversationHistory = [] } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' })
    }

    // Build device context based on role
    let deviceContext = null

    try {
      if (role === 'customer') {
        const { data: devices } = await supabaseAdmin
          .from('devices')
          .select('id, name, type, status, is_on, settings, location')
          .eq('customer_id', userId)
          .limit(10)

        if (devices && devices.length > 0) {
          deviceContext = {
            userDevices: devices,
            totalDevices: devices.length,
            onlineDevices: devices.filter((d) => d.status === 'online').length,
          }
        }
      } else if (role === 'admin') {
        const { data: devices } = await supabaseAdmin
          .from('devices')
          .select('id, name, type, status, is_on, location, users:customer_id(name, email)')
          .limit(20)

        const { count: totalUsers } = await supabaseAdmin
          .from('users')
          .select('id', { count: 'exact', head: true })

        if (devices) {
          deviceContext = {
            totalDevices: devices.length,
            onlineDevices: devices.filter((d) => d.status === 'online').length,
            offlineDevices: devices.filter((d) => d.status === 'offline').length,
            totalUsers,
            recentDevices: devices.slice(0, 5),
          }
        }
      } else if (role === 'support') {
        const { data: devices } = await supabaseAdmin
          .from('devices')
          .select('id, name, type, status, is_on, location, users:customer_id(name, email)')
          .limit(20)

        if (devices) {
          deviceContext = {
            totalDevices: devices.length,
            onlineDevices: devices.filter((d) => d.status === 'online').length,
            offlineDevices: devices.filter((d) => d.status === 'offline').length,
            recentDevices: devices.slice(0, 5),
          }
        }
      }
    } catch (contextErr) {
      console.error('Error fetching device context:', contextErr)
      // Continue without context
    }

    // Build conversation history for API (last 10 exchanges for token efficiency)
    const historyForAPI = conversationHistory.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Add current message
    historyForAPI.push({ role: 'user', content: message })

    const aiResponse = await getAIResponse(role, historyForAPI, deviceContext)

    // Log to database (best effort - don't fail if logging fails)
    try {
      await supabaseAdmin.from('ai_chat_logs').insert({
        user_id: userId,
        role,
        message: message.substring(0, 1000),
        response: aiResponse.substring(0, 2000),
      })
    } catch (logErr) {
      console.error('AI log error:', logErr)
    }

    return res.status(200).json({ response: aiResponse })
  } catch (err) {
    console.error('AI chat error:', err)

    if (err.message?.includes('AI service')) {
      return res.status(503).json({ error: err.message })
    }

    return res.status(500).json({ error: 'Failed to get AI response. Please try again.' })
  }
}

export default withAuth(handler)
