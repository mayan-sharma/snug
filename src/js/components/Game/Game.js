import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useTool } from "catalyst-core/webmcp"
import Blocks from "../Blocks/Blocks"
import blockCss from "../Blocks/Blocks.scss"
import Icon from "../Icon/Icon"
import { canPlace, fitsAnywhere, formatScore, linesAfter, placements, SHAPES, SIZE } from "../../game/engine"
import { play } from "../../game/sound"
import { saveSettings } from "../../game/storage"
import { useSaved } from "../../game/useSaved"
import css from "./Game.scss"

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

const LINE_WORDS = ["", "", "Double", "Triple", "Mega"]

// Arcade style: six digits, zero-padded.
const pad = (n) => String(n).padStart(6, "0")

const shapeRows = (shape) =>
    Array.from({ length: shape.h }, (_, r) =>
        Array.from({ length: shape.w }, (_, c) => (shape.cells.some(([sr, sc]) => sr === r && sc === c) ? "#" : ".")).join("")
    )

function ShareButton({ result }) {
    const [copied, setCopied] = useState(false)
    const share = async () => {
        const text = `Snug · ${formatScore(result.score)} points\n${result.lines} lines · best streak ×${result.streak}\n${window.location.origin}`
        try {
            if (navigator.share) {
                await navigator.share({ text })
                return
            }
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
        } catch {
            // Share sheet dismissed or clipboard blocked: nothing to do.
        }
    }
    return (
        <button type="button" className={css.secondary} onClick={share}>
            <Icon name={copied ? "check" : "share"} size={16} /> {copied ? "Copied" : "Share"}
        </button>
    )
}

/**
 * The whole play screen: score, board, tray, drag and drop, the game-over
 * card and the WebMCP tools. `game` comes from useSnug.
 */
export default function Game({ game }) {
    const { state, fx, result, drop, restart, get, buzz } = game
    const { grid, tray, score, streak, over } = state
    const saved = useSaved()
    const soundOn = saved ? saved.settings.sound : true
    const best = Math.max(saved?.best ?? 0, score)

    const gridRef = useRef(null)
    const floatRef = useRef(null)
    const dragRef = useRef(null)
    const [drag, setDrag] = useState(null)
    const [ghost, setGhost] = useState(null)
    const [confirming, setConfirming] = useState(false)
    const [showSheet, setShowSheet] = useState(false)

    // Let the board grey out before the card rises.
    useEffect(() => {
        if (!over) {
            setShowSheet(false)
            return undefined
        }
        const t = setTimeout(() => setShowSheet(true), 900)
        return () => clearTimeout(t)
    }, [over])

    useEffect(() => {
        if (!confirming) return undefined
        const t = setTimeout(() => setConfirming(false), 2600)
        return () => clearTimeout(t)
    }, [confirming])

    const fits = useMemo(() => tray.map((id) => id !== null && fitsAnywhere(grid, SHAPES[id])), [grid, tray])

    // ---- Drag and drop -------------------------------------------------
    // The dragged copy follows the pointer by writing its transform directly;
    // React state only changes when the target cell does.
    const moveTo = (x, y) => {
        const d = dragRef.current
        const shape = SHAPES[d.shape]
        const left = x - (shape.w * d.unit) / 2
        // On touch the piece floats above the finger so it stays visible.
        const top = d.touch ? y - shape.h * d.unit - d.unit * 1.15 : y - (shape.h * d.unit) / 2
        d.left = left
        d.top = top
        if (floatRef.current) floatRef.current.style.transform = `translate3d(${left}px, ${top}px, 0)`

        const rect = gridRef.current.getBoundingClientRect()
        const fr = (top - rect.top) / d.unit
        const fc = (left - rect.left) / d.unit
        const board = get().grid
        let target = null
        let nearest = 0.8
        for (const r of [Math.floor(fr), Math.ceil(fr)]) {
            for (const c of [Math.floor(fc), Math.ceil(fc)]) {
                const dist = Math.hypot(r - fr, c - fc)
                if (dist < nearest && canPlace(board, shape, r, c)) {
                    nearest = dist
                    target = { row: r, col: c }
                }
            }
        }
        const key = target ? `${target.row}:${target.col}` : ""
        if (key === d.key) return
        d.key = key
        d.target = target
        setGhost(target ? { ...target, shape: d.shape, ...linesAfter(board, shape, target.row, target.col) } : null)
    }

    const onPointerDown = (e, slot) => {
        if (e.button > 0 || dragRef.current) return
        const current = get()
        const shape = current.tray[slot]
        if (shape === null || current.over) return
        e.preventDefault()
        e.currentTarget.setPointerCapture?.(e.pointerId)
        const unit = gridRef.current.getBoundingClientRect().width / SIZE
        dragRef.current = { slot, shape, unit, touch: e.pointerType !== "mouse", pointerId: e.pointerId, key: "", target: null }
        setDrag({ slot, shape, unit })
        buzz(null, "pick")
        moveTo(e.clientX, e.clientY)
    }

    const onPointerMove = (e) => {
        const d = dragRef.current
        if (d && d.pointerId === e.pointerId) moveTo(e.clientX, e.clientY)
    }

    const endDrag = (e, cancelled) => {
        const d = dragRef.current
        if (!d || d.pointerId !== e.pointerId) return
        dragRef.current = null
        setDrag(null)
        setGhost(null)
        if (!cancelled && d.target) drop(d.slot, d.target.row, d.target.col)
        else buzz(null, "miss")
    }

    // The dragged copy mounts one render after pointerdown; place it then.
    useIsoLayoutEffect(() => {
        const d = dragRef.current
        if (drag && d && floatRef.current) floatRef.current.style.transform = `translate3d(${d.left}px, ${d.top}px, 0)`
    }, [drag])

    // ---- WebMCP: an agent plays by the same rules as a person ----------
    useTool(
        {
            name: "snug_read_board",
            description:
                "Read the Snug board. `rows` is the 8x8 grid from top to bottom ('#' filled, '.' empty). `tray` lists the pieces " +
                "still to place: each has a slot, its shape as rows of '#' and '.', and every legal [row, col] for its top-left " +
                "corner. A full row or column clears and scores. The game ends when no tray piece fits.",
            inputSchema: { type: "object", properties: {} },
            annotations: { readOnlyHint: true },
            execute: async () => {
                const s = get()
                return {
                    score: s.score,
                    streak: s.streak,
                    over: s.over,
                    rows: Array.from({ length: SIZE }, (_, r) =>
                        s.grid
                            .slice(r * SIZE, (r + 1) * SIZE)
                            .map((v) => (v ? "#" : "."))
                            .join("")
                    ),
                    tray: s.tray
                        .map((id, slot) => (id === null ? null : { slot, shape: shapeRows(SHAPES[id]), placements: placements(s.grid, SHAPES[id]) }))
                        .filter(Boolean),
                }
            },
        },
        []
    )

    useTool(
        {
            name: "snug_place_piece",
            description:
                "Place the piece in a tray slot with its top-left corner at row and col (0-based, row 0 is the top). " +
                "Use a placement listed by snug_read_board. Returns the points gained and any lines cleared.",
            inputSchema: {
                type: "object",
                properties: {
                    slot: { type: "integer", minimum: 0, maximum: 2 },
                    row: { type: "integer", minimum: 0, maximum: 7 },
                    col: { type: "integer", minimum: 0, maximum: 7 },
                },
                required: ["slot", "row", "col"],
            },
            execute: async ({ slot, row, col }) => {
                const event = drop(slot, row, col)
                if (!event) return { ok: false, note: "That piece does not fit there. Call snug_read_board for legal placements." }
                return { ok: true, gained: event.gained, linesCleared: event.lines, streak: event.streak, score: get().score, over: event.over }
            },
        },
        []
    )

    useTool(
        {
            name: "snug_new_game",
            description: "Start a new game of Snug. The current game is abandoned.",
            inputSchema: { type: "object", properties: {} },
            execute: async () => {
                restart()
                return { ok: true, score: 0 }
            },
        },
        []
    )

    // ---- Render --------------------------------------------------------
    const ghostCells = new Set()
    const glowCells = new Set()
    if (ghost) {
        SHAPES[ghost.shape].cells.forEach(([r, c]) => ghostCells.add((ghost.row + r) * SIZE + ghost.col + c))
        ghost.rows.forEach((r) => {
            for (let c = 0; c < SIZE; c++) glowCells.add(r * SIZE + c)
        })
        ghost.cols.forEach((c) => {
            for (let r = 0; r < SIZE; r++) glowCells.add(r * SIZE + c)
        })
    }
    const ghostColor = ghost ? `var(--c${SHAPES[ghost.shape].color})` : undefined
    const popped = fx ? new Set(fx.placed) : null

    // Where the last piece landed, for the points label and the clear ripple.
    const centre = useMemo(() => {
        if (!fx) return null
        const rows = fx.placed.map((i) => Math.floor(i / SIZE))
        const cols = fx.placed.map((i) => i % SIZE)
        return {
            row: rows.reduce((a, b) => a + b, 0) / rows.length,
            col: cols.reduce((a, b) => a + b, 0) / cols.length,
        }
    }, [fx])

    const onRestart = () => {
        if (score > 0 && !over && !confirming) {
            setConfirming(true)
            return
        }
        setConfirming(false)
        restart()
    }

    const toggleSound = () => {
        saveSettings({ sound: !soundOn })
        if (!soundOn) play("tick")
    }

    const word = fx && fx.lines > 0 ? (fx.cleanSlate ? "Clean slate" : LINE_WORDS[Math.min(fx.lines, 4)]) : ""

    return (
        <section className={css.game} aria-label="Snug">
            <div className={css.hud}>
                <div className={css.scoreBox}>
                    <span className={css.label}>Score</span>
                    <span className={css.score} key={score} aria-live="polite" aria-label={`${score} points`}>
                        {pad(score)}
                    </span>
                </div>
                <div className={css.side}>
                    <div className={css.bestBox}>
                        <span className={css.label}>Hi</span>
                        <span className={css.best}>{pad(saved ? best : 0)}</span>
                    </div>
                    <div className={css.tools}>
                        <button
                            type="button"
                            className={css.iconButton}
                            onClick={toggleSound}
                            aria-pressed={soundOn}
                            aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
                        >
                            <Icon name={soundOn ? "sound" : "mute"} />
                        </button>
                        <button
                            type="button"
                            className={confirming ? `${css.iconButton} ${css.confirm}` : css.iconButton}
                            onClick={onRestart}
                            aria-label={confirming ? "Tap again to restart" : "New game"}
                        >
                            {confirming ? <span>Restart?</span> : <Icon name="restart" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className={css.boardWrap}>
                {streak > 1 && !over && (
                    <span className={css.streak} key={streak}>
                        Streak ×{streak}
                    </span>
                )}
                <div className={css.board} data-over={over || undefined}>
                    <div className={css.grid} ref={gridRef}>
                        {grid.map((color, i) => {
                            const isGhost = ghostCells.has(i)
                            const isGlow = glowCells.has(i)
                            const pop = popped && color && popped.has(i)
                            return (
                                <div key={i} className={css.cell} data-glow={isGlow || undefined}>
                                    {(color || isGhost) && (
                                        <i
                                            key={pop ? `p${fx.key}` : "b"}
                                            className={`${blockCss.block} ${css.fill}${pop ? ` ${css.pop}` : ""}${isGhost ? ` ${css.ghost}` : ""}`}
                                            style={{
                                                "--c": isGhost || isGlow ? ghostColor : `var(--c${color})`,
                                                "--i": i % SIZE + Math.floor(i / SIZE),
                                            }}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {fx && fx.cleared.length > 0 && (
                        <div className={css.fxLayer} key={fx.key} aria-hidden="true">
                            {fx.cleared.map(({ i, color }) => {
                                const r = Math.floor(i / SIZE)
                                const c = i % SIZE
                                return (
                                    <i
                                        key={i}
                                        className={`${blockCss.block} ${css.vanish}`}
                                        style={{
                                            gridRow: r + 1,
                                            gridColumn: c + 1,
                                            "--c": `var(--c${color})`,
                                            "--d": `${Math.round(Math.hypot(r - centre.row, c - centre.col) * 28)}ms`,
                                        }}
                                    />
                                )
                            })}
                        </div>
                    )}

                    {fx && fx.lines > 0 && (
                        <div
                            className={css.gain}
                            key={`g${fx.key}`}
                            style={{ "--gx": `${((centre.col + 0.5) / SIZE) * 100}%`, "--gy": `${((centre.row + 0.5) / SIZE) * 100}%` }}
                            aria-hidden="true"
                        >
                            <strong>+{fx.gained}</strong>
                            {word && <span>{word}</span>}
                        </div>
                    )}

                    {over && showSheet && result && (
                        <div className={css.sheet} role="dialog" aria-labelledby="result-title">
                            <p className={css.sheetKicker} data-best={result.isBest ? "" : undefined}>
                                {result.isBest ? "New hi-score" : "Game over"}
                            </p>
                            <h2 id="result-title" className={css.sheetScore}>
                                {formatScore(result.score)}
                            </h2>
                            <p className={css.sheetMeta}>
                                {result.lines} line{result.lines === 1 ? "" : "s"} · {result.moves} pieces · best streak ×{result.streak}
                            </p>
                            <div className={css.sheetActions}>
                                <button type="button" className={css.primary} onClick={onRestart}>
                                    <Icon name="restart" size={16} /> Play again
                                </button>
                                <ShareButton result={result} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={css.tray} key={state.seed} data-over={over || undefined}>
                {tray.map((id, slot) => (
                    <button
                        key={slot}
                        type="button"
                        className={css.slot}
                        style={{ "--i": slot }}
                        disabled={id === null || over}
                        data-stuck={id !== null && !fits[slot] ? "" : undefined}
                        data-lifted={drag?.slot === slot ? "" : undefined}
                        aria-label={id === null ? "Empty slot" : `Piece ${slot + 1}: ${SHAPES[id].family}${fits[slot] ? "" : ", does not fit"}`}
                        onPointerDown={(e) => onPointerDown(e, slot)}
                        onPointerMove={onPointerMove}
                        onPointerUp={(e) => endDrag(e, false)}
                        onPointerCancel={(e) => endDrag(e, true)}
                    >
                        {id !== null && <Blocks shape={id} />}
                    </button>
                ))}
            </div>

            {drag && (
                <div className={css.float} ref={floatRef} style={{ "--u": `${drag.unit}px` }} data-snapped={ghost ? "" : undefined}>
                    <Blocks shape={drag.shape} />
                </div>
            )}
        </section>
    )
}
