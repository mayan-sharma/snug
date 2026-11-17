import React from "react"
import { formatScore } from "../../game/engine"
import { saveSettings, stats } from "../../game/storage"
import { useSaved } from "../../game/useSaved"
import css from "./Stats.scss"

function Toggle({ label, detail, checked, onChange, disabled }) {
    return (
        <label className={css.toggle} data-disabled={disabled || undefined}>
            <span>
                <strong>{label}</strong>
                <small>{detail}</small>
            </span>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
            <i aria-hidden="true" />
        </label>
    )
}

function Stats() {
    const saved = useSaved()
    const s = saved ? stats(saved) : null
    const max = s ? Math.max(1, s.best) : 1

    const tiles = [
        { label: "Games", value: s?.played ?? "–" },
        { label: "Best", value: s ? formatScore(s.best) : "–" },
        { label: "Average", value: s?.average != null ? formatScore(s.average) : "–" },
        { label: "Lines cleared", value: s ? formatScore(s.lines) : "–" },
        { label: "Best streak", value: s ? `×${s.streak}` : "–" },
        { label: "Longest game", value: s ? `${s.longest}` : "–" },
    ]

    return (
        <div className={css.page}>
            <h1 className={css.title}>Stats</h1>
            <p className={css.lede}>Kept on this device only. No account, nothing sent anywhere.</p>

            <div className={css.tiles}>
                {tiles.map((t) => (
                    <div key={t.label} className={css.tile}>
                        <span className={css.value}>{t.value}</span>
                        <span className={css.label}>{t.label}</span>
                    </div>
                ))}
            </div>

            <h2 className={css.h2}>Recent games</h2>
            {s && s.recent.length === 0 && <p className={css.lede}>Finish a game and it shows up here.</p>}
            <div className={css.bars}>
                {(s?.recent ?? []).map((g, i) => (
                    <div key={g.at} className={css.bar}>
                        <span className={css.barLabel}>{i === 0 ? "Last" : `−${i}`}</span>
                        <span className={css.track}>
                            <span className={css.fill} data-best={g.score === s.best ? "" : undefined} style={{ "--w": `${(g.score / max) * 100}%` }} />
                        </span>
                        <span className={css.count}>{formatScore(g.score)}</span>
                    </div>
                ))}
            </div>

            <h2 className={css.h2}>Settings</h2>
            <div className={css.settings}>
                <Toggle
                    label="Sound"
                    detail="A blip when a piece lands, a rising arpeggio when lines clear"
                    checked={saved?.settings.sound ?? true}
                    onChange={(sound) => saveSettings({ sound })}
                />
                <Toggle
                    label="Haptics"
                    detail="A tap when a piece lands, a stronger one when lines clear"
                    checked={saved?.settings.haptics ?? true}
                    onChange={(haptics) => saveSettings({ haptics })}
                />
            </div>
        </div>
    )
}

Stats.setMetaData = () => [<title key="t">Stats · Snug</title>]

export default Stats
