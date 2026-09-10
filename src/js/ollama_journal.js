/**
 * ollama_journal.js
 * Kai companion page — persistent chat with local Ollama.
 * renderKaiCompanion() lives in ollama.js and is still used by the journal page.
 */

const KAI_SYSTEM_PROMPT = `You are Kai, a warm and supportive self-improvement companion inside the Kaizen app.
Your job is to:
- Acknowledge what the user shares with empathy
- Celebrate any wins or efforts, no matter how small
- Gently encourage them if they're struggling
- Keep replies short (2-4 sentences unless asked for more)
- Never be preachy or lecture them
- Speak like a caring friend, not a therapist`

async function renderKaiPage() {
  const content = document.getElementById('main-content')
  if (!content) return

  content.innerHTML = `
    <div class="kai-page-container" style="padding:32px 0;">
      <h2 style="color:#6ee7b7;margin-bottom:8px;">🤖 Kai Companion</h2>
      <p style="color:#888;font-size:0.9rem;margin-bottom:24px;">
        Chat with Kai — your personal self-improvement companion. Kai remembers the conversation.
      </p>
      <div id="kai-page"></div>
    </div>
  `

  const container = document.getElementById('kai-page')
  if (!container) return

  // If Ollama isn't installed, there's nothing we can do from the app.
  let installed = false
  try {
    installed = await window.api.checkOllamaInstalled()
  } catch (err) {
    console.error('Ollama install check failed:', err)
  }

  if (!installed) {
    container.innerHTML = `
      <div class="kai-card" style="background:#1a1a1a;border:1px solid #444;border-radius:10px;padding:24px;text-align:center;color:#ccc;">
        <div style="font-size:2rem;margin-bottom:12px;">🤖</div>
        <strong style="color:#6ee7b7;">Ollama is not installed</strong>
        <p style="color:#888;margin:8px 0 16px;">
          Kai runs on Ollama, a free local AI runtime.<br>
          Install it from <code style="color:#6ee7b7;">ollama.com</code>, then restart Kaizen.
        </p>
      </div>
    `
    return
  }

  // Installed — check whether the model has been pulled yet.
  let models = []
  try {
    models = await getAvailableModels()
  } catch (err) {
    console.error('Model list failed:', err)
  }

  const modelReady = models.some(m => m === 'llama3.2:latest' || m.startsWith('llama3.2'))
  if (!modelReady) {
    container.innerHTML = `
      <div class="kai-card" style="background:#1a1a1a;border:1px solid #6ee7b7;border-radius:10px;padding:24px;text-align:center;color:#ccc;">
        <div style="font-size:2rem;margin-bottom:12px;">📦</div>
        <strong style="color:#6ee7b7;">Kai's model isn't downloaded yet</strong>
        <p style="color:#888;margin:8px 0 16px;">
          The llama3.2 model (~1.5GB) must be downloaded once.<br>
          Kaizen stays fully usable while it downloads.
        </p>
        <button type="button" onclick="downloadKaiModel(this)" class="btn btn-primary">
          ⬇️ Download Kai model
        </button>
      </div>
    `
    return
  }

  await renderKaiChat(container)
}

/**
 * Render the chat thread + input controls into the container.
 */
async function renderKaiChat(container) {
  const history = await window.api.getKaiChatHistory(100)

  container.innerHTML = `
    <div class="kai-chat-thread" id="kai-chat-thread" style="
      background:#0f0f0f;border:1px solid #333;border-radius:10px;
      padding:16px;height:380px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;">
    </div>
    <div class="kai-chat-input-row" style="display:flex;gap:8px;margin-top:12px;">
      <input id="kai-chat-input" placeholder="Message Kai..."
        onkeydown="if(event.key==='Enter')sendKaiMessage()"
        style="flex:1;background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:10px 12px;color:#fff;">
      <button id="kai-send-btn" class="btn btn-primary" onclick="sendKaiMessage()">Send</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button class="btn btn-secondary" onclick="generateKaiWeeklyInsight()">✨ Weekly Insight</button>
      <button class="btn btn-secondary" onclick="clearKaiChat()">🗑️ Clear chat</button>
    </div>
  `

  const thread = document.getElementById('kai-chat-thread')
  if (history.length === 0) {
    thread.innerHTML = '<p class="empty-msg">Say hello to Kai! 👋</p>'
  } else {
    thread.innerHTML = history.map(msg => kaiMessageHtml(msg[1], msg[2])).join('')
  }
  thread.scrollTop = thread.scrollHeight
}

function kaiMessageHtml(role, text) {
  const isUser = role === 'user'
  return `
    <div class="kai-msg" style="display:flex;gap:8px;${isUser ? 'flex-direction:row-reverse;' : ''}">
      <span class="kai-msg-avatar" style="font-size:1.3rem;line-height:1;">${isUser ? '🧑' : '🤖'}</span>
      <div class="kai-msg-bubble" style="
        max-width:75%;padding:8px 12px;border-radius:10px;font-size:0.9rem;line-height:1.45;white-space:pre-wrap;
        ${isUser
          ? 'background:#6ee7b7;color:#000;border-top-right-radius:2px;'
          : 'background:#1a1a1a;border:1px solid #333;color:#ccc;border-top-left-radius:2px;'}">
        ${escapeHtml(text)}
      </div>
    </div>
  `
}

function appendKaiMessage(role, text) {
  const thread = document.getElementById('kai-chat-thread')
  if (!thread) return
  if (thread.querySelector('.empty-msg')) thread.innerHTML = ''
  thread.insertAdjacentHTML('beforeend', kaiMessageHtml(role, text))
  thread.scrollTop = thread.scrollHeight
}

async function streamAssistantReply(messages) {
  const thread = document.getElementById('kai-chat-thread')
  if (!thread) return

  const typing = document.createElement('div')
  typing.className = 'kai-msg'
  typing.innerHTML = '<span class="kai-msg-avatar" style="font-size:1.3rem;">🤖</span><div class="kai-msg-bubble" style="max-width:75%;padding:8px 12px;border-radius:10px;background:#1a1a1a;border:1px solid #333;color:#ccc;">▋</div>'
  thread.appendChild(typing)
  thread.scrollTop = thread.scrollHeight

  let full = ''
  try {
    const running = await isOllamaRunning()
    if (!running) {
      typing.remove()
      appendKaiMessage('assistant', 'Kai is offline. Start Ollama (ollama serve) to chat.')
      return
    }

    await streamKaiChat(messages, (chunk, fullText) => {
      full = fullText
      const bubble = typing.querySelector('.kai-msg-bubble')
      if (bubble) bubble.textContent = fullText
      thread.scrollTop = thread.scrollHeight
    })
    typing.remove()

    const finalText = full || "Hmm, I couldn't respond right now. Try again later."
    appendKaiMessage('assistant', finalText)
    await window.api.addKaiChatMessage('assistant', finalText)
  } catch (err) {
    console.error('Kai stream error:', err)
    typing.remove()
    appendKaiMessage('assistant', "Hmm, I couldn't respond right now. Try again later.")
  }
}

async function sendKaiMessage() {
  const input = document.getElementById('kai-chat-input')
  const text = (input?.value || '').trim()
  if (!text) return
  input.value = ''

  appendKaiMessage('user', text)
  await window.api.addKaiChatMessage('user', text)

  const history = await window.api.getKaiChatHistory(100)
  const messages = [
    { role: 'system', content: KAI_SYSTEM_PROMPT },
    ...history.slice(-20).map(h => ({ role: h[1], content: h[2] }))
  ]

  await streamAssistantReply(messages)
}

async function generateKaiWeeklyInsight() {
  appendKaiMessage('user', '✨ Generate my weekly insight')
  await window.api.addKaiChatMessage('user', '✨ Generate my weekly insight')

  const start = new Date()
  start.setDate(start.getDate() - 6)
  const startStr = getLocalDateString(start)
  const endStr = getLocalDateString()

  const [journalRows, summary] = await Promise.all([
    window.api.getJournalEntriesBetween(startStr, endStr),
    window.api.getWeeklySummary()
  ])

  const journalText = journalRows.length > 0
    ? journalRows.map(r => `[${r[2]}] (${r[4] || 'no mood'}) ${r[1]}`).join('\n')
    : '(no journal entries this week)'

  const prompt = `Here is my journal from the last 7 days:\n${journalText}\n\nWeekly stats: ${summary.checkins} check-ins, ${summary.journalEntries} journal entries, ${summary.completionPct}% goal completion.\n\nGive me a warm, specific weekly insight in 4-6 sentences: celebrate wins, notice patterns, and suggest one small next step.`

  await streamAssistantReply([
    { role: 'system', content: KAI_SYSTEM_PROMPT },
    { role: 'user', content: prompt }
  ])
}

async function clearKaiChat() {
  if (!confirm('Clear the entire Kai conversation?')) return
  await window.api.clearKaiChatHistory()
  const container = document.getElementById('kai-page')
  if (container) await renderKaiChat(container)
}

/**
 * Download the Kai model via the main process (validated + shell-safe).
 */
async function downloadKaiModel(btn) {
  if (!btn) return
  btn.disabled = true
  btn.textContent = '⬇️ Downloading… (~1.5GB, keep Kaizen open)'

  try {
    await window.api.pullOllamaModel('llama3.2:latest')
    btn.textContent = '✅ Done!'
    renderKaiPage()
  } catch (err) {
    console.error('Kai model download failed:', err)
    btn.disabled = false
    btn.textContent = '⬇️ Retry download'
    alert('Download failed: ' + (err.message || 'unknown error'))
  }
}
