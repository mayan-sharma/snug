import React from "react"
import { useCurrentRouteData } from "catalyst-core"
import Game from "../../components/Game/Game"
import { useSnug } from "../../game/useSnug"
import css from "./Play.scss"

// The fetcher only picks a seed. Because it runs on the server too, the
// first paint already shows a real board and a real opening tray.
const fetchSeed = () => Promise.resolve({ seed: Math.floor(Math.random() * 0xffffffff) >>> 0 })

function Round({ seed }) {
    const game = useSnug(seed)
    const fresh = game.state.moves === 0
    return (
        <>
            <Game game={game} />
            <p className={css.tip} aria-live="polite">
                {game.state.over
                    ? " "
                    : fresh
                      ? "Drag a piece onto the board. Fill a row or a column to clear it."
                      : "Clear lines back to back to build a streak."}
            </p>
        </>
    )
}

function Play() {
    const { data } = useCurrentRouteData()
    if (!data) return <div className={css.skeleton} aria-busy="true" />
    return <Round seed={data.seed} />
}

Play.serverFetcher = fetchSeed
Play.clientFetcher = fetchSeed

Play.setMetaData = () => {
    const title = "Snug · fit the blocks, clear the lines"
    const description = "An endless block-fitting game. Drag pieces onto the board, fill rows and columns to clear them, and keep going until nothing fits."
    return [
        <title key="t">{title}</title>,
        <meta key="d" name="description" content={description} />,
        <meta key="ogt" property="og:title" content={title} />,
        <meta key="ogd" property="og:description" content={description} />,
        <meta key="ogi" property="og:image" content="/icon.png" />,
        <meta key="tc" name="theme-color" content="#0a0a12" />,
    ]
}

export default Play
