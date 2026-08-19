import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import { decryptSecret } from "../_shared/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Sliding-window cap: at most this many Gemini calls per webinar per window.
const RATE_LIMIT_MAX_INVOCATIONS = 5
const RATE_LIMIT_WINDOW_MS = 10_000
const GEMINI_FETCH_TIMEOUT_MS = 10_000

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { webinar_id, user_message, user_name } = await req.json()

    if (!webinar_id || !user_message) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Also create a service role client for bypassing RLS to fetch admin data and insert AI message
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if the user is authenticated and is attending the webinar (optional, depends on RLS)
    // For now, let's fetch the webinar settings to get the prompt
    const { data: webinar, error: webinarError } = await supabaseAdmin
      .from('webinars')
      .select('org_id, ai_agent_enabled, ai_agent_prompt')
      .eq('id', webinar_id)
      .single()

    if (webinarError || !webinar) {
      throw new Error('Webinar not found or error fetching details')
    }

    if (!webinar.ai_agent_enabled) {
      return new Response(JSON.stringify({ error: 'AI Agent is disabled for this webinar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }
    
    // Fetch organization settings
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('settings')
      .eq('id', webinar.org_id)
      .single()
      
    if (orgError) {
      throw new Error('Error fetching organization details')
    }

    // Construct the payload for Gemini
    const encryptedKey = org?.settings?.gemini_api_key_encrypted
    const legacyPlaintextKey = org?.settings?.gemini_api_key // pre-encryption orgs, until re-saved
    const geminiApiKey = encryptedKey
      ? await decryptSecret(encryptedKey)
      : legacyPlaintextKey || Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'A chave da API do Gemini não está configurada para esta organização.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Server-side rate limit — protects the operator from unbounded Gemini
    // cost when many participants chat at once.
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    const { count: recentInvocations } = await supabaseAdmin
      .from('gemini_chat_invocations')
      .select('id', { count: 'exact', head: true })
      .eq('webinar_id', webinar_id)
      .gte('invoked_at', windowStart)

    if ((recentInvocations || 0) >= RATE_LIMIT_MAX_INVOCATIONS) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'rate_limited' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    await supabaseAdmin.from('gemini_chat_invocations').insert({ webinar_id })

    const customPrompt = webinar.ai_agent_prompt || 'You are a friendly, knowledgeable host assistant for this webinar.'

    // The agent now sees every chat message, not just ones that @-mention it, so it must
    // decide for itself whether a reply adds value (avoids spamming the chat on every line).
    const NO_REPLY_TOKEN = 'NO_REPLY'
    const systemPrompt = `${customPrompt}

You are monitoring the live chat of a webinar. You will be shown the most recent messages and the newest one to consider. Only reply when your message would genuinely help the audience (answering a question, correcting misinformation, or reacting to a direct mention of you/AI). Do NOT reply to small talk, greetings, or messages not directed at you. If a reply is not warranted, respond with exactly the token ${NO_REPLY_TOKEN} and nothing else. When you do reply, keep it short (1-3 sentences) and conversational, matching the chat's language.`

    // Recent context, fetched server-side (do not trust client-supplied history).
    const { data: recentMessages } = await supabaseAdmin
      .from('chat_messages')
      .select('user_name, message, is_ai')
      .eq('webinar_id', webinar_id)
      .order('sent_at', { ascending: false })
      .limit(10)

    const historyContents = (recentMessages || [])
      .reverse()
      .map((m) => ({
        role: m.is_ai ? 'model' : 'user',
        parts: [{ text: m.is_ai ? m.message : `${m.user_name}: ${m.message}` }],
      }))

    const contents = [
      ...historyContents,
      {
        role: 'user',
        parts: [{ text: `${user_name}: ${user_message}` }],
      },
    ]

    // Call Gemini API — "latest" alias always resolves to the current stable Flash model
    // (Gemini 3 generation as of writing) without pinning a version string that may be retired.
    const geminiModel = 'gemini-flash-latest'
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), GEMINI_FETCH_TIMEOUT_MS)
    let geminiResponse: Response
    try {
      geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: contents,
          generationConfig: {
            temperature: 0.7,
          }
        }),
        signal: timeoutController.signal,
      })
    } catch (fetchErr) {
      if ((fetchErr as Error).name === 'AbortError') {
        throw new Error('Gemini API timed out')
      }
      throw fetchErr
    } finally {
      clearTimeout(timeoutId)
    }

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      console.error('Gemini API Error:', errText)
      throw new Error('Failed to fetch response from Gemini')
    }

    const geminiData = await geminiResponse.json()
    const aiTextReply = (geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()

    if (!aiTextReply || aiTextReply === NO_REPLY_TOKEN) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Insert the AI message into chat_messages
    const { data: insertedMessage, error: insertError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        webinar_id,
        user_name: 'Gablive AI',
        message: aiTextReply,
        is_ai: true
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return new Response(JSON.stringify({ success: true, message: insertedMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
