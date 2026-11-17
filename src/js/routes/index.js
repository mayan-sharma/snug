import { split } from "catalyst-core"

// Every page is a split() chunk: its CSS is inlined for the route that
// renders, and its fetchers and setMetaData are picked up after load().
const Play = split(() => import("../pages/Play/Play"))
const Stats = split(() => import("../pages/Stats/Stats"))
const How = split(() => import("../pages/How/How"))

// offline: true puts the route in the build's offline manifest. In a browser
// the service worker serves the last copy; in the native shell the route
// snapshot cache does.
const routes = [
    { path: "/", end: true, component: Play, offline: true },
    { path: "/stats", component: Stats, offline: true },
    { path: "/how", component: How, offline: true },
]

export default routes
