// Server lifecycle hooks, in the order Catalyst calls them.
// Docs: https://catalyst.1mg.com/content/API%20Reference/ssr-lifecycle
import { SHAPES } from "../src/js/game/engine"

// Runs once before the server starts. Catalyst waits for it.
export const preServerInit = () => {
    console.log(`[snug] ready with ${SHAPES.length} piece shapes`)
}

// Request hooks are not awaited, so they stay synchronous.

export const onFetcherError = ({ req, error }) => {
    console.error(`[snug] fetcher failed for ${req.originalUrl}:`, error?.message || error)
}

export const onRenderError = ({ req, error }) => {
    console.error(`[snug] render failed for ${req.originalUrl}:`, error?.message || error)
}

export const onRequestError = ({ req, error }) => {
    console.error(`[snug] request failed for ${req.originalUrl}:`, error?.message || error)
}
