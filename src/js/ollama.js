/**
 * Ollama / Kai AI Companion
 * Handles all communication with the local Ollama instance
 * Kai reads journal entries and responds with empathy
 */

const OLLAMA_URL = 'http://localhost:11434'
const MODEL = 'llama3.2:latest'

/**
 * Check if Ollama is running on localhost
 */
async function isOllamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000)
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Stream a chat completion from Ollama.
 * @param {Array<{role:string, content:string}>} messages
 * @param {function} onChunk - Callback fired on each streamed chunk (chunk, fullText)
 * @returns {string} - The complete response text
 */
async function streamKaiChat(messages, onChunk = null) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true
    })
  })

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const lines = decoder.decode(value, { stream: true })
      .split('\n')
      .filter(Boolean)

    for (const line of lines) {
      try {
        const json = JSON.parse(line)
        const chunk = json.message?.content || ''
        if (chunk) {
          fullText += chunk
          if (onChunk) onChunk(chunk, fullText)
        }
        // Ollama signals end of stream
        if (json.done) return fullText
      } catch {
        // Skip malformed chunks
      }
    }
  }

  return fullText
}

/**
 * Send journal entry to Ollama and stream back Kai's response
 * @param {string} journalText - The journal content to respond to
 * @param {function} onChunk - Callback fired on each streamed chunk (chunk, fullText)
 * @returns {string} - The complete response text
 */
async function getJournalCompanionResponse(journalText, onChunk = null) {
  const systemPrompt = `You are ${companionName()}, a warm and supportive self-improvement companion inside the Kaizen app.
The user has just written a journal entry. Your job is to:
- Acknowledge what they shared with empathy
- Celebrate any wins or efforts, no matter how small
- Gently encourage them if they're struggling
- Keep it short: 2-3 sentences max
- Never be preachy or lecture them
- Speak like a caring friend, not a therapist`

  return streamKaiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: journalText }
  ], onChunk)
}

/**
 * Get list of locally available Ollama models
 * @returns {string[]} - Array of model name strings
 */
async function getAvailableModels() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`)
    const data = await res.json()
    return data.models?.map(m => m.name) || []
  } catch {
    return []
  }
}

/**
 * Render the Kai companion UI below a journal entry
 * Checks if Ollama is running, shows offline state if not,
 * otherwise streams Kai's response with a typing effect
 *
 * @param {string} journalContent - The journal text Kai will read
 * @param {HTMLElement} containerEl - The DOM element to append Kai's response into
 * @param {string} mood - The entry's mood; the companion sprite mirrors it
 */
async function renderKaiCompanion(journalContent, containerEl, mood = 'neutral') {
  if (!containerEl) return

  const running = await isOllamaRunning()

  const kaiSection = document.createElement('div')
  kaiSection.className = 'kai-companion'

  if (!running) {
    // Kai is offline — show helpful message
    kaiSection.innerHTML = `
      <div class="kai-offline">
        ${companionImg(mood)}
        <div class="kai-message">
          <strong>${companionName()} is offline</strong>
          <p>Start Ollama to get your companion's thoughts on your entry.</p>
          <code>ollama serve</code>
        </div>
      </div>
    `
    containerEl.appendChild(kaiSection)
    return
  }

  // Kai is online — show typing bubble
  kaiSection.innerHTML = `
    <div class="kai-online">
      ${companionImg(mood)}
      <div class="kai-bubble">
        <span class="kai-name">${companionName()}</span>
        <p class="kai-text"></p>
      </div>
    </div>
  `
  containerEl.appendChild(kaiSection)

  const kaiTextEl = kaiSection.querySelector('.kai-text')

  // Add blinking cursor while streaming
  const cursor = document.createElement('span')
  cursor.className = 'kai-cursor'
  cursor.textContent = '▋'
  kaiTextEl.appendChild(cursor)

  try {
    await getJournalCompanionResponse(journalContent, (chunk, fullText) => {
      // Safe DOM update — avoids XSS from innerHTML with raw text
      const textNode = document.createTextNode(fullText)
      kaiTextEl.innerHTML = ''
      kaiTextEl.appendChild(textNode)
      kaiTextEl.appendChild(cursor)
    })

    // Remove blinking cursor when streaming is complete
    cursor.remove()
  } catch (err) {
    console.error('Kai response error:', err)
    kaiTextEl.textContent = "Hmm, I couldn't respond right now. Try again later."
    cursor.remove()
  }
}