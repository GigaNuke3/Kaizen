// Standalone page renderer — called by loadPage('ollama_journal')
async function renderKaiPage() {
  const content = document.getElementById('main-content')
  content.innerHTML = `<div class="kai-page-container" id="kai-page"></div>`
  await renderKaiCompanion('Hello Kai!', document.getElementById('kai-page'))
}

// Companion renderer — called with journal content and a container element
async function renderKaiCompanion(journalContent, containerEl) {
  const running = await isOllamaRunning()

  const kaiSection = document.createElement('div')
  kaiSection.className = 'kai-companion'

  if (!running) {
    kaiSection.innerHTML = `
      <div class="kai-offline">
        <span class="kai-avatar">🤖</span>
        <div class="kai-message">
          <strong>Kai is offline</strong>
          <p>Start Ollama to get your companion's thoughts on your entry.</p>
          <code>ollama serve</code>
        </div>
      </div>
    `
    containerEl.appendChild(kaiSection)
    return
  }

  kaiSection.innerHTML = `
    <div class="kai-online">
      <span class="kai-avatar">🤖</span>
      <div class="kai-bubble">
        <span class="kai-name">Kai</span>
        <p class="kai-text"><span class="kai-cursor">▋</span></p>
      </div>
    </div>
  `
  containerEl.appendChild(kaiSection)

  const kaiTextEl = kaiSection.querySelector('.kai-text')

  try {
    await getJournalCompanionResponse(journalContent, (chunk, fullText) => {
      kaiTextEl.innerHTML = fullText + '<span class="kai-cursor">▋</span>'
    })
    kaiTextEl.querySelector('.kai-cursor')?.remove()
  } catch (err) {
    kaiTextEl.textContent = "Hmm, I couldn't read that. Try again later."
  }
}