// Snug's rules as pure functions over a plain, serialisable state. The same
// code deals the first tray on the server, runs the game in the browser and
// answers the WebMCP tools.

export const SIZE = 8
export const CELLS = SIZE * SIZE
export const TRAY = 3

// Small deterministic PRNG, so a seed always deals the same pieces.
export function mulberry32(seed) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const nextSeed = (seed) => (Math.imul(seed, 1664525) + 1013904223) >>> 0

// Each family is drawn once; rotations and mirrors are derived. `weight` is
// how often the family is dealt, `hard` families grow more common as the
// score climbs and `easy` ones fade.
const FAMILIES = [
    { name: "dot", color: 6, weight: 5, easy: true, rows: ["x"] },
    { name: "bar2", color: 4, weight: 8, easy: true, rows: ["xx"] },
    { name: "bar3", color: 4, weight: 10, rows: ["xxx"] },
    { name: "bar4", color: 4, weight: 7, rows: ["xxxx"] },
    { name: "bar5", color: 4, weight: 3, hard: true, rows: ["xxxxx"] },
    { name: "square2", color: 2, weight: 10, rows: ["xx", "xx"] },
    { name: "square3", color: 2, weight: 3, hard: true, rows: ["xxx", "xxx", "xxx"] },
    { name: "slab", color: 2, weight: 4, rows: ["xxx", "xxx"] },
    { name: "corner", color: 1, weight: 10, rows: ["x.", "xx"] },
    { name: "ell", color: 5, weight: 8, mirror: true, rows: ["x.", "x.", "xx"] },
    { name: "tee", color: 3, weight: 7, rows: ["xxx", ".x."] },
    { name: "zig", color: 3, weight: 5, mirror: true, rows: ["xx.", ".xx"] },
    { name: "bigCorner", color: 1, weight: 3, hard: true, rows: ["x..", "x..", "xxx"] },
    { name: "step2", color: 6, weight: 2, hard: true, rows: ["x.", ".x"] },
    { name: "step3", color: 6, weight: 1, hard: true, rows: ["x..", ".x.", "..x"] },
]

const parse = (rows) => {
    const cells = []
    rows.forEach((row, r) => [...row].forEach((ch, c) => ch === "x" && cells.push([r, c])))
    return cells
}

const normalise = (cells) => {
    const minR = Math.min(...cells.map(([r]) => r))
    const minC = Math.min(...cells.map(([, c]) => c))
    return cells.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

const rotate = (cells) => normalise(cells.map(([r, c]) => [c, -r]))
const flip = (cells) => normalise(cells.map(([r, c]) => [r, -c]))

function variants(family) {
    const seen = new Map()
    const add = (cells) => {
        let cur = normalise(cells)
        for (let i = 0; i < 4; i++) {
            seen.set(JSON.stringify(cur), cur)
            cur = rotate(cur)
        }
    }
    add(parse(family.rows))
    if (family.mirror) add(flip(parse(family.rows)))
    return [...seen.values()]
}

export const SHAPES = []
FAMILIES.forEach((family) => {
    const list = variants(family)
    list.forEach((cells) => {
        SHAPES.push({
            id: SHAPES.length,
            family: family.name,
            color: family.color,
            cells,
            h: Math.max(...cells.map(([r]) => r)) + 1,
            w: Math.max(...cells.map(([, c]) => c)) + 1,
            weight: family.weight / list.length,
            hard: !!family.hard,
            easy: !!family.easy,
        })
    })
})

export const emptyGrid = () => new Array(CELLS).fill(0)

export function canPlace(grid, shape, row, col) {
    if (row < 0 || col < 0 || row + shape.h > SIZE || col + shape.w > SIZE) return false
    for (const [r, c] of shape.cells) if (grid[(row + r) * SIZE + col + c]) return false
    return true
}

export function fitsAnywhere(grid, shape) {
    for (let r = 0; r <= SIZE - shape.h; r++) for (let c = 0; c <= SIZE - shape.w; c++) if (canPlace(grid, shape, r, c)) return true
    return false
}

export function placements(grid, shape) {
    const out = []
    for (let r = 0; r <= SIZE - shape.h; r++) for (let c = 0; c <= SIZE - shape.w; c++) if (canPlace(grid, shape, r, c)) out.push([r, c])
    return out
}

// Rows and columns that would be full with `shape` placed at (row, col).
export function linesAfter(grid, shape, row, col) {
    const filled = new Set(shape.cells.map(([r, c]) => (row + r) * SIZE + col + c))
    const has = (i) => grid[i] !== 0 || filled.has(i)
    const rows = []
    const cols = []
    for (const r of new Set(shape.cells.map(([dr]) => row + dr))) {
        let full = true
        for (let c = 0; c < SIZE && full; c++) full = has(r * SIZE + c)
        if (full) rows.push(r)
    }
    for (const c of new Set(shape.cells.map(([, dc]) => col + dc))) {
        let full = true
        for (let r = 0; r < SIZE && full; r++) full = has(r * SIZE + c)
        if (full) cols.push(c)
    }
    return { rows, cols }
}

// Drop the shape in and clear full lines. Returns the new grid and what went.
export function settle(grid, shape, row, col) {
    const next = grid.slice()
    const placed = shape.cells.map(([r, c]) => (row + r) * SIZE + col + c)
    placed.forEach((i) => (next[i] = shape.color))
    const { rows, cols } = linesAfter(grid, shape, row, col)
    const cleared = new Map()
    rows.forEach((r) => {
        for (let c = 0; c < SIZE; c++) cleared.set(r * SIZE + c, next[r * SIZE + c])
    })
    cols.forEach((c) => {
        for (let r = 0; r < SIZE; r++) cleared.set(r * SIZE + c, next[r * SIZE + c])
    })
    cleared.forEach((_, i) => (next[i] = 0))
    return { grid: next, placed, rows, cols, cleared: [...cleared].map(([i, color]) => ({ i, color })) }
}

// Can all of these shapes be placed, in some order, clearing lines as they go?
export function solvable(grid, shapes) {
    if (shapes.length === 0) return true
    const tried = new Set()
    for (let k = 0; k < shapes.length; k++) {
        const shape = shapes[k]
        if (tried.has(shape.id)) continue
        tried.add(shape.id)
        const rest = shapes.filter((_, i) => i !== k)
        for (let r = 0; r <= SIZE - shape.h; r++) {
            for (let c = 0; c <= SIZE - shape.w; c++) {
                if (!canPlace(grid, shape, r, c)) continue
                if (rest.length === 0) return true
                if (solvable(settle(grid, shape, r, c).grid, rest)) return true
            }
        }
    }
    return false
}

function pick(rng, score, pool = SHAPES) {
    // Every 500 points nudges the mix towards the awkward pieces.
    const level = Math.min(8, Math.floor(score / 500))
    const weightOf = (s) => s.weight * (s.hard ? 1 + level * 0.3 : s.easy ? Math.max(0.4, 1 - level * 0.1) : 1)
    let roll = rng() * pool.reduce((sum, s) => sum + weightOf(s), 0)
    for (const s of pool) {
        roll -= weightOf(s)
        if (roll <= 0) return s
    }
    return pool[pool.length - 1]
}

// Deal three pieces. Early on the game looks for a tray that can be placed
// in full; the higher the score, the fewer tries it gets, so luck creeps in.
// A tray never arrives with nothing playable.
export function deal(grid, score, seed) {
    const rng = mulberry32(seed)
    const tries = Math.max(1, 6 - Math.floor(score / 700))
    let tray = null
    for (let i = 0; i < tries; i++) {
        tray = [pick(rng, score), pick(rng, score), pick(rng, score)]
        if (solvable(grid, tray)) return tray.map((s) => s.id)
    }
    if (!tray.some((s) => fitsAnywhere(grid, s))) {
        const fitting = SHAPES.filter((s) => fitsAnywhere(grid, s))
        tray[Math.floor(rng() * TRAY)] = pick(rng, score, fitting)
    }
    return tray.map((s) => s.id)
}

export function newGame(seed) {
    const grid = emptyGrid()
    return {
        grid,
        tray: deal(grid, 0, seed),
        seed: nextSeed(seed),
        score: 0,
        streak: 0,
        idle: 0,
        moves: 0,
        lines: 0,
        bestStreak: 0,
        over: false,
    }
}

const lineScore = (n) => n * 10 + (n - 1) * n * 5 // 10, 30, 60, 100, …

export const isStuck = (grid, tray) => !tray.some((id) => id !== null && fitsAnywhere(grid, SHAPES[id]))

/**
 * Place the piece in tray `slot` with its top-left at (row, col). Returns
 * null for an illegal move, otherwise the next state and what happened.
 */
export function place(state, slot, row, col) {
    const id = state.tray[slot]
    if (state.over || id === null || id === undefined) return null
    const shape = SHAPES[id]
    if (!canPlace(state.grid, shape, row, col)) return null

    const result = settle(state.grid, shape, row, col)
    const lineCount = result.rows.length + result.cols.length
    const cleanSlate = lineCount > 0 && result.grid.every((v) => v === 0)

    let { streak, idle } = state
    if (lineCount > 0) {
        streak += 1
        idle = 0
    } else if (++idle >= TRAY) {
        // A whole tray's worth of moves without a clear ends the streak.
        streak = 0
    }

    const gained = shape.cells.length + (lineCount ? lineScore(lineCount) * streak : 0) + (cleanSlate ? 150 : 0)
    const score = state.score + gained

    let tray = state.tray.map((v, i) => (i === slot ? null : v))
    let seed = state.seed
    let dealt = false
    if (tray.every((v) => v === null)) {
        tray = deal(result.grid, score, seed)
        seed = nextSeed(seed)
        dealt = true
    }

    const next = {
        grid: result.grid,
        tray,
        seed,
        score,
        streak,
        idle,
        moves: state.moves + 1,
        lines: state.lines + lineCount,
        bestStreak: Math.max(state.bestStreak, streak),
        over: isStuck(result.grid, tray),
    }

    return {
        state: next,
        event: {
            slot,
            shape: id,
            placed: result.placed,
            rows: result.rows,
            cols: result.cols,
            cleared: result.cleared,
            lines: lineCount,
            gained,
            streak,
            cleanSlate,
            dealt,
            over: next.over,
        },
    }
}

// A light sanity check for a state read back from storage.
export function isValidState(s) {
    return (
        !!s &&
        Array.isArray(s.grid) &&
        s.grid.length === CELLS &&
        Array.isArray(s.tray) &&
        s.tray.length === TRAY &&
        s.tray.every((id) => id === null || !!SHAPES[id]) &&
        Number.isFinite(s.score) &&
        Number.isFinite(s.seed)
    )
}

export const formatScore = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
