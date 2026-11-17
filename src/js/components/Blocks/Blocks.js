import React from "react"
import { SHAPES } from "../../game/engine"
import css from "./Blocks.scss"

// One piece drawn as a grid of blocks. The block size is the CSS variable
// --u, set by whoever renders it (the tray, the board or the dragged copy).
export default function Blocks({ shape: id, className }) {
    const shape = SHAPES[id]
    return (
        <span
            className={className ? `${css.blocks} ${className}` : css.blocks}
            style={{ "--w": shape.w, "--h": shape.h, "--c": `var(--c${shape.color})` }}
            aria-hidden="true"
        >
            {shape.cells.map(([r, c]) => (
                <i key={`${r}-${c}`} className={css.block} style={{ gridRow: r + 1, gridColumn: c + 1 }} />
            ))}
        </span>
    )
}
