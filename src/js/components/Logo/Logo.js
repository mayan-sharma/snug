import React from "react"

const Tile = ({ x, y, fill }) => (
    <>
        <rect x={x} y={y} width="13" height="13" fill={fill} />
        <path d={`M${x} ${y}h13v2h-11v11h-2z`} fill="rgba(255,255,255,0.45)" />
        <path d={`M${x + 13} ${y + 13}h-13v-2h11v-11h2z`} fill="rgba(0,0,0,0.34)" />
    </>
)

// A corner piece with one block dropped into its gap: the whole game in one mark.
export default function Logo({ size = 28 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges">
            <Tile x={2} y={2} fill="var(--c1)" />
            <Tile x={2} y={17} fill="var(--c1)" />
            <Tile x={17} y={17} fill="var(--c1)" />
            <Tile x={17} y={2} fill="var(--c4)" />
        </svg>
    )
}
