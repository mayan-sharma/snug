// Sound effects, synthesised with the Web Audio API: no audio files to
// download or cache, so they work offline and cost nothing on first load.
// Browsers only allow audio after a user gesture, and every sound here
// follows a touch, so the context is created lazily on the first one.

let ctx = null
let master = null
let noiseBuffer = null

function audio() {
    if (typeof window === "undefined") return null
    if (!ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return null
        ctx = new Ctx()
        master = ctx.createGain()
        master.gain.value = 0.55
        // A gentle limiter so fast taps stacking up never clip.
        const limiter = ctx.createDynamicsCompressor()
        limiter.threshold.value = -10
        limiter.ratio.value = 8
        master.connect(limiter).connect(ctx.destination)
    }
    if (ctx.state === "suspended") ctx.resume()
    return ctx
}

function noise() {
    if (noiseBuffer) return noiseBuffer
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return noiseBuffer
}

// One enveloped oscillator.
function tone({ type = "triangle", from, to = from, at = 0, attack = 0.004, decay = 0.2, gain = 0.4 }) {
    const t = ctx.currentTime + at
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, t)
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + decay * 0.8)
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(gain, t + attack)
    env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
    osc.connect(env).connect(master)
    osc.start(t)
    osc.stop(t + attack + decay + 0.05)
}

// A burst of filtered noise: the air of a slide, the grit of a knock.
function hiss({ at = 0, duration = 0.12, from = 1800, to = 600, q = 0.8, gain = 0.15, type = "bandpass" }) {
    const t = ctx.currentTime + at
    const src = ctx.createBufferSource()
    src.buffer = noise()
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.Q.value = q
    filter.frequency.setValueAtTime(from, t)
    filter.frequency.exponentialRampToValueAtTime(to, t + duration)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(gain, t + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    src.connect(filter).connect(env).connect(master)
    src.start(t)
    src.stop(t + duration + 0.02)
}

// Major pentatonic from D4: any run of these notes sounds pleasant.
const SCALE = [0, 2, 4, 7, 9]
const note = (step) => 293.66 * 2 ** ((SCALE[step % 5] + 12 * Math.floor(step / 5)) / 12)

// Chiptune: everything is a square wave, like an 8-bit sound chip.
const beep = (step, at = 0, decay = 0.09, gain = 0.1, octave = 1) => tone({ type: "square", from: note(step) * octave, at, attack: 0.002, decay, gain })

const SOUNDS = {
    // Lifting a piece off the tray.
    pick() {
        tone({ type: "square", from: 440, to: 660, attack: 0.002, decay: 0.04, gain: 0.06 })
    },
    // A short low blip; bigger pieces land lower.
    place({ cells = 3 } = {}) {
        const f = 230 - Math.min(cells, 9) * 12
        tone({ type: "square", from: f, to: f * 0.5, attack: 0.002, decay: 0.07, gain: 0.13 })
        hiss({ duration: 0.03, from: 3000, to: 800, q: 0.8, gain: 0.08, type: "lowpass" })
    },
    // The piece went back to the tray.
    miss() {
        tone({ type: "square", from: 150, to: 110, attack: 0.002, decay: 0.08, gain: 0.07 })
    },
    // A fast arpeggio, one more note per line, starting higher as the streak runs.
    clear({ lines = 1, streak = 1 } = {}) {
        const start = Math.min(streak - 1, 7)
        for (let i = 0; i <= lines + 1; i++) beep(start + i * 2, i * 0.055, 0.08, 0.1)
        beep(start + (lines + 1) * 2, (lines + 2) * 0.055, 0.22, 0.09)
    },
    // The whole board emptied: a run up two octaves.
    slate() {
        for (let i = 0; i < 10; i++) beep(i + 5, 0.3 + i * 0.045, 0.07, 0.08)
    },
    // Nothing fits: the classic falling tune.
    over() {
        const fall = [9, 7, 5, 4, 2, 0]
        fall.forEach((s, i) => beep(s, i * 0.13, 0.14, 0.1, 0.5))
        tone({ type: "square", from: note(0) / 2, to: note(0) / 4, at: 0.8, attack: 0.002, decay: 0.5, gain: 0.1 })
    },
    // A new best score: a fanfare.
    best() {
        const run = [5, 7, 9, 10, 9, 10, 12]
        const at = [0, 0.09, 0.18, 0.27, 0.42, 0.51, 0.6]
        run.forEach((s, i) => beep(s, at[i], i === run.length - 1 ? 0.5 : 0.1, 0.1))
        run.forEach((s, i) => beep(s, at[i], i === run.length - 1 ? 0.5 : 0.1, 0.05, 0.5))
    },
    // A light click for buttons and toggles.
    tick() {
        tone({ type: "square", from: 880, attack: 0.002, decay: 0.03, gain: 0.05 })
    },
}

export function play(name, options) {
    try {
        if (!audio()) return
        SOUNDS[name]?.(options)
    } catch {
        // Audio is a nice-to-have; never let it break a tap.
    }
}
