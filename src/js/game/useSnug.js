import { useCallback, useEffect, useRef, useState } from "react"
import { useHapticFeedback } from "catalyst-core/hooks"
import { newGame, place, SHAPES } from "./engine"
import { play } from "./sound"
import { finishGame, load, saveGame } from "./storage"

const randomSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0

/**
 * One game of Snug. `seed` comes from the route's fetcher, so the server
 * renders a real opening tray; a game saved on this device replaces it
 * right after hydration.
 */
export function useSnug(seed) {
    const [state, setState] = useState(() => newGame(seed))
    const [fx, setFx] = useState(null)
    const [result, setResult] = useState(null)
    const stateRef = useRef(state)
    const fxKey = useRef(0)
    const haptics = useHapticFeedback()
    const hapticsRef = useRef(haptics)
    hapticsRef.current = haptics

    const commit = (next) => {
        stateRef.current = next
        setState(next)
    }

    useEffect(() => {
        const saved = load().game
        if (saved && !saved.over) commit(saved)
    }, [])

    // One call per game event: a haptic and a sound, each behind its own
    // setting. Android has light, medium and heavy, so only those are used.
    const buzz = useCallback((type, sound, options) => {
        const { settings } = load()
        if (settings.sound && sound) play(sound, options)
        if (!settings.haptics || !type) return
        try {
            hapticsRef.current.execute?.(type)
        } catch {
            // No haptics on this device; the game does not need them.
        }
    }, [])

    const drop = useCallback(
        (slot, row, col) => {
            const out = place(stateRef.current, slot, row, col)
            if (!out) return null
            const { event } = out
            commit(out.state)
            setFx({ key: ++fxKey.current, ...event })

            if (event.lines > 0) {
                buzz(event.lines > 1 || event.streak > 2 ? "heavy" : "medium", "clear", { lines: event.lines, streak: event.streak })
                if (event.cleanSlate) play("slate")
            } else {
                buzz("light", "place", { cells: SHAPES[event.shape].cells.length })
            }

            if (out.state.over) {
                const previousBest = finishGame(out.state)
                const isBest = out.state.score > previousBest && previousBest > 0
                setResult({ score: out.state.score, lines: out.state.lines, moves: out.state.moves, streak: out.state.bestStreak, isBest })
                setTimeout(() => buzz("heavy", isBest ? "best" : "over"), 650)
            } else {
                saveGame(out.state)
            }
            return event
        },
        [buzz]
    )

    const restart = useCallback(() => {
        const fresh = newGame(randomSeed())
        commit(fresh)
        setFx(null)
        setResult(null)
        saveGame(fresh)
        buzz("light", "tick")
        return fresh
    }, [buzz])

    const get = useCallback(() => stateRef.current, [])

    return { state, fx, result, drop, restart, get, buzz }
}
