/**
 * ollama_journal.js
 * Standalone Kai companion page — called by loadPage('ollama_journal')
 * renderKaiCompanion() lives in ollama.js — do not redefine it here
 */

async function renderKaiPage() {
  const content = document.getElementById('main-content')
  if (!content) return

  content.innerHTML = `
    <div class="kai-page-container" style="padding:32px 0;">
      <h2 style="color:#6ee7b7;margin-bottom:8px;">🤖 Kai Companion</h2>
      <p style="color:#888;font-size:0.9rem;margin-bottom:24px;">
        Say hello to Kai — your personal self-improvement companion.
        Kai reads your journal entries and responds with empathy and encouragement.
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

  await renderKaiCompanion('Hello Kai! I just opened your page.', container)
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
