/**
 * Kaizen navigation sounds — synthesized with the Web Audio API.
 * No audio files required; works fully offline.
 */

let audioCtx = null

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function tone(freq, start, dur, type = 'sine', vol = 0.15, freqEnd = null) {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + start + dur)
    }
    gain.gain.setValueAtTime(vol, ctx.currentTime + start)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(ctx.currentTime + start)
    osc.stop(ctx.currentTime + start + dur)
  } catch (err) {
    console.error('Tone error:', err)
  }
}

function noiseBurst(start, dur, vol = 0.12, filterFreq = 2000) {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, ctx.currentTime + start)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
    src.connect(filter).connect(gain).connect(ctx.destination)
    src.start(ctx.currentTime + start)
  } catch (err) {
    console.error('Noise error:', err)
  }
}

/**
 * Play the navigation sound for a page. Profile has no sound.
 */
function playNavSound(page) {
  if (!page) return
  if (window.kaizenSettings && window.kaizenSettings.soundEnabled === false) return
  if (page === 'profile') return

  switch (page) {
    case 'notifications': // bell ring
      tone(880, 0, 0.5, 'sine', 0.12)
      tone(1320, 0.02, 0.45, 'sine', 0.06)
      break
    case 'dashboard': // digital blips
      tone(660, 0, 0.09, 'square', 0.06)
      tone(990, 0.09, 0.09, 'square', 0.06)
      break
    case 'goals': // arrow sweep
      tone(300, 0, 0.15, 'sine', 0.08, 900)
      break
    case 'checkmarked': // pencil scratch
      noiseBurst(0, 0.1, 0.1, 1800)
      break
    case 'completed_goals': // trophy arpeggio
      tone(523.25, 0, 0.12, 'triangle', 0.1)
      tone(659.25, 0.1, 0.12, 'triangle', 0.1)
      tone(783.99, 0.2, 0.2, 'triangle', 0.1)
      break
    case 'failed_goals': // low failure buzz
      tone(220, 0, 0.25, 'sawtooth', 0.07, 150)
      break
    case 'journal': // book whoosh
      noiseBurst(0, 0.25, 0.08, 800)
      break
    case 'ollama_journal': // robot dual tone
      tone(392, 0, 0.1, 'square', 0.07)
      tone(494, 0.1, 0.12, 'square', 0.07)
      break
    case 'badges': // reuse trophy arpeggio
      tone(523.25, 0, 0.12, 'triangle', 0.1)
      tone(659.25, 0.1, 0.12, 'triangle', 0.1)
      tone(783.99, 0.2, 0.2, 'triangle', 0.1)
      break
    default:
      break
  }
}
