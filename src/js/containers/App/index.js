import React, { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router"
import { useNativeTransition, useNetworkStatus, useSafeArea } from "catalyst-core/hooks"
import Logo from "../../components/Logo/Logo"
import Icon from "../../components/Icon/Icon"
import css from "./App.scss"

const TABS = [
    { to: "/", label: "Play", icon: "play", match: (p) => p === "/" },
    { to: "/stats", label: "Stats", icon: "stats" },
    { to: "/how", label: "How", icon: "how" },
]

const activeIndex = (pathname) => TABS.findIndex((t) => (t.match ? t.match(pathname) : pathname.startsWith(t.to)))

const App = () => {
    const { pathname } = useLocation()
    const insets = useSafeArea()
    const { online } = useNetworkStatus()
    // Cached pages are rendered online, so the badge waits for hydration.
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const { navigate } = useNativeTransition({ type: "slide", duration: 260 })
    const current = activeIndex(pathname)

    const go = (e, index) => {
        e.preventDefault()
        if (index === current) return
        navigate(TABS[index].to, { direction: index > current ? "left" : "right" })
    }

    // Native insets arrive as request headers, so even the server render
    // pads for the notch and the home indicator.
    const shellStyle = {
        "--inset-top": `${insets.top || 0}px`,
        "--inset-bottom": `${insets.bottom || 0}px`,
        "--inset-left": `${insets.left || 0}px`,
        "--inset-right": `${insets.right || 0}px`,
    }

    return (
        <div className={css.shell} style={shellStyle}>
            <header className={css.header}>
                <a href="/" className={css.brand} onClick={(e) => go(e, 0)} aria-label="Snug, play">
                    <Logo size={26} />
                    <span>Snug</span>
                </a>
                {mounted && !online && (
                    <span className={css.offline} role="status">
                        <span className={css.dot} /> Offline
                    </span>
                )}
            </header>

            <main className={css.main}>
                <Outlet />
            </main>

            <nav className={css.tabs} aria-label="Main">
                {TABS.map((tab, i) => (
                    <a
                        key={tab.to}
                        href={tab.to}
                        className={i === current ? `${css.tab} ${css.active}` : css.tab}
                        aria-current={i === current ? "page" : undefined}
                        onClick={(e) => go(e, i)}
                    >
                        <Icon name={tab.icon} />
                        <span>{tab.label}</span>
                    </a>
                ))}
            </nav>
        </div>
    )
}

App.serverSideFunction = () => Promise.resolve()

export default App
