import express from "express"
import path from "path"
import expressStaticGzip from "express-static-gzip"
import { newGame, SHAPES } from "../src/js/game/engine"

const rows = (shape) =>
    Array.from({ length: shape.h }, (_, r) =>
        Array.from({ length: shape.w }, (_, c) => (shape.cells.some(([sr, sc]) => sr === r && sc === c) ? "#" : ".")).join("")
    )

// Server middlewares are added here. Catalyst mounts them before its own
// page handler, so these routes answer before any React render.
export function addMiddlewares(app) {
    if (process.env.NODE_ENV === "production") {
        app.use(
            `${process.env.PUBLIC_STATIC_ASSET_PATH}/client`,
            expressStaticGzip(path.join(__dirname, `../${process.env.BUILD_OUTPUT_PATH}/client`), {
                enableBrotli: true,
                orderPreference: ["br", "gz"],
                serveStatic: { maxAge: "1y", etag: true },
            })
        )
    }
    app.use("/favicon.ico", express.static(path.join(__dirname, "../public/favicon.ico")))
    app.use("/icon.png", express.static(path.join(__dirname, "../public/icon.png")))
    app.use("/apple-touch-icon.png", express.static(path.join(__dirname, "../public/apple-touch-icon.png")))

    app.get("/api/health", (req, res) => res.json({ ok: true }))

    // The same engine the browser runs: the opening tray for any seed.
    app.get("/api/deal/:seed", (req, res) => {
        const seed = Number(req.params.seed)
        if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
            res.status(400).json({ error: "bad_seed", message: "Seed must be a whole number from 0 to 4294967295." })
            return
        }
        res.set("Cache-Control", "public, max-age=31536000, immutable")
        res.json({ seed, tray: newGame(seed).tray.map((id) => ({ family: SHAPES[id].family, shape: rows(SHAPES[id]) })) })
    })
}
