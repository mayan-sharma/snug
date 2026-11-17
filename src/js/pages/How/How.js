import React, { useEffect, useMemo, useState } from "react"
import { useCurrentRouteData } from "catalyst-core"
import { useDeviceInfo, useHapticFeedback, useNetworkStatus, useSafeArea } from "catalyst-core/hooks"
import { inspect } from "catalyst-core/webmcp"
import Blocks from "../../components/Blocks/Blocks"
import { SHAPES } from "../../game/engine"
import css from "./How.scss"

// One of each family, for the "pieces" strip.
const SAMPLES = [...new Map(SHAPES.map((s) => [s.family, s.id])).values()]

const Row = ({ name, hook, value, on }) => (
    <li className={css.row}>
        <span className={css.feature}>
            <strong>{name}</strong>
            <code>{hook}</code>
        </span>
        <span className={css.state} data-on={on ? "" : undefined}>
            {value}
        </span>
    </li>
)

function UnderTheHood({ renderedOn }) {
    const device = useDeviceInfo()
    const network = useNetworkStatus()
    const insets = useSafeArea()
    const haptics = useHapticFeedback()
    const [client, setClient] = useState(null)

    useEffect(() => {
        const read = () =>
            setClient({
                sw: "serviceWorker" in navigator && !!navigator.serviceWorker.controller,
                tools: inspect().tools.length,
                nativeMcp: inspect().isNative,
            })
        read()
        document.addEventListener("webmcp:register", read)
        document.addEventListener("webmcp:unregister", read)
        return () => {
            document.removeEventListener("webmcp:register", read)
            document.removeEventListener("webmcp:unregister", read)
        }
    }, [])

    // Everything below depends on the browser or the shell, so it renders
    // only after hydration; the server sends neutral placeholders.
    const ready = client !== null
    const platform = device.data?.platform
    const shell = device.isNative ? `Native ${platform || "app"}` : "Web browser"
    // On the web the "model" is the user agent string; only show real devices.
    const model = device.isNative && device.data?.model ? ` · ${device.data.model}` : ""

    return (
        <ul className={css.hood}>
            <Row name="Rendering" hook="serverFetcher · split()" value={renderedOn === "server" ? "Server-rendered" : "Client navigation"} on />
            <Row name="Shell" hook="useDeviceInfo" value={ready ? `${shell}${model}` : "…"} on={ready && device.isNative} />
            <Row name="Network" hook="useNetworkStatus" value={!ready ? "…" : network.online ? `Online${network.type ? ` · ${network.type}` : ""}` : "Offline"} on={ready && network.online} />
            <Row
                name="Safe area"
                hook="useSafeArea"
                value={`${insets.top || 0} / ${insets.right || 0} / ${insets.bottom || 0} / ${insets.left || 0}`}
                on={!!(insets.top || insets.bottom)}
            />
            <Row name="Haptics" hook="useHapticFeedback" value={!ready ? "…" : haptics.isNative ? "Native" : haptics.isSupported ? "Vibration API" : "Not on this device"}
                on={ready && (haptics.isNative || haptics.isSupported)}
            />
            <Row
                name="Offline"
                hook="offline: true"
                value={!ready ? "…" : device.isNative ? "Native route cache" : client.sw ? "Service worker active" : "Not active in this browser"}
                on={ready && (device.isNative || client.sw)}
            />
            <Row name="Agents" hook="WebMCP useTool" value={client ? `${client.tools} tools live${client.nativeMcp ? "" : " · shim"}` : "…"} on={!!client?.tools} />
        </ul>
    )
}

function How() {
    const { data } = useCurrentRouteData()
    const renderedOn = useMemo(() => data?.renderedOn, [data])
    return (
        <div className={css.page}>
            <h1 className={css.title}>How to play</h1>
            <ol className={css.rules}>
                <li>Drag any of the three pieces onto the 8×8 board. Pieces cannot be rotated.</li>
                <li>Fill a whole row or column and it clears. One piece can clear several lines at once.</li>
                <li>When all three pieces are placed, three new ones arrive.</li>
                <li>The game ends when none of the pieces left in the tray fits.</li>
            </ol>

            <h2 className={css.h2}>Scoring</h2>
            <ul className={css.scoring}>
                <li>
                    <span>Each block placed</span>
                    <b>1</b>
                </li>
                <li>
                    <span>1, 2, 3, 4 lines at once</span>
                    <b>10 · 30 · 60 · 100</b>
                </li>
                <li>
                    <span>Streak: clears back to back multiply line points</span>
                    <b>×2, ×3, …</b>
                </li>
                <li>
                    <span>Empty the whole board</span>
                    <b>+150</b>
                </li>
            </ul>
            <p className={css.lede}>A streak survives two pieces without a clear. The third one ends it.</p>

            <h2 className={css.h2}>The pieces</h2>
            <div className={css.pieces}>
                {SAMPLES.map((id) => (
                    <Blocks key={id} shape={id} />
                ))}
            </div>
            <p className={css.lede}>The awkward ones turn up more often as your score climbs.</p>

            <h2 className={css.h2}>Under the hood</h2>
            <p className={css.lede}>
                Snug is one React codebase built with Catalyst. The same pages ship as this website and as Android and iOS apps. Live status
                for this session:
            </p>
            <UnderTheHood renderedOn={renderedOn} />
        </div>
    )
}

How.serverFetcher = () => Promise.resolve({ renderedOn: "server" })
How.clientFetcher = () => Promise.resolve({ renderedOn: "client" })
How.setMetaData = () => [<title key="t">How to play · Snug</title>]

export default How
