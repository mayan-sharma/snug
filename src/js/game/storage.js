// Everything lives in localStorage: the game in progress, past scores and
// settings. No accounts and no server state, so it all works offline.
import { isValidState } from "./engine"

const KEY = "snug:v1"
const EVENT = "snug:storage"
const KEEP = 50
const EMPTY = { game: null, best: 0, history: [], settings: { haptics: true, sound: true } }

const hasStorage = () => typeof window !== "undefined" && !!window.localStorage

export function load() {
    if (!hasStorage()) return EMPTY
    try {
        const raw = JSON.parse(window.localStorage.getItem(KEY))
        if (!raw) return EMPTY
        return {
            ...EMPTY,
            ...raw,
            game: isValidState(raw.game) ? raw.game : null,
            history: Array.isArray(raw.history) ? raw.history : [],
            settings: { ...EMPTY.settings, ...raw.settings },
        }
    } catch {
        return EMPTY
    }
}

function save(data) {
    if (!hasStorage()) return
    try {
        window.localStorage.setItem(KEY, JSON.stringify(data))
        window.dispatchEvent(new Event(EVENT))
    } catch {
        // Private mode or a full quota: the game still plays, it just forgets.
    }
}

export function saveGame(game) {
    save({ ...load(), game })
}

// Record a finished game. Returns the best score from before it.
export function finishGame(game) {
    const data = load()
    const entry = { score: game.score, lines: game.lines, moves: game.moves, streak: game.bestStreak, at: Date.now() }
    save({ ...data, game: null, best: Math.max(data.best, game.score), history: [...data.history, entry].slice(-KEEP) })
    return data.best
}

export function saveSettings(settings) {
    const data = load()
    save({ ...data, settings: { ...data.settings, ...settings } })
}

export function stats(data = load()) {
    const scores = data.history.map((g) => g.score)
    return {
        played: scores.length,
        best: data.best,
        average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        lines: data.history.reduce((sum, g) => sum + g.lines, 0),
        streak: data.history.reduce((max, g) => Math.max(max, g.streak || 0), 0),
        longest: data.history.reduce((max, g) => Math.max(max, g.moves), 0),
        recent: data.history.slice(-8).reverse(),
    }
}

export const STORAGE_EVENT = EVENT
