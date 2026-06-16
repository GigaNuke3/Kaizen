/**
 * ollama_journal.js
 * Standalone Kai companion page — called by loadPage('ollama_journal')
 * renderKaiCompanion() lives in ollama.js — do not redefine it here
 */

async function renderKaiPage() {
  const content = document.getElementById('main-content')
  if (!content) return

  content.innerHTML = `
    <div style="padding:32px 0;">
      <h2 style="color:#6ee7b7;margin-bottom:8px;">🤖 Kai Companion</h2>
      <p style="color:#888;font-size:0.9rem;margin-bottom:24px;">
        Say hello to Kai — your personal self-improvement companion.
        Kai reads your journal entries and responds with empathy and encouragement.
      </p>
      <div id="kai-page"></div>
    </div>
  `

  await renderKaiCompanion('Hello Kai! I just opened your page.', document.getElementById('kai-page'))
}