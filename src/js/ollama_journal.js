async function renderKaiCompanion(journalContent, containerEl) {
  // Check if Ollama is available
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

  // Kai is online - show typing state
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
      // Streaming typing effect
      kaiTextEl.innerHTML = fullText + '<span class="kai-cursor">▋</span>'
    })
    // Remove cursor when done
    kaiTextEl.querySelector('.kai-cursor')?.remove()
  } catch (err) {
    kaiTextEl.textContent = "Hmm, I couldn't read that. Try again later."
  }
}