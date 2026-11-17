import React from "react"
import "./styles"
import { hydrateRoot } from "react-dom/client"
import { hydrationReady } from "catalyst-core"
import { RouterProvider } from "react-router/dom"
import clientRouter from "catalyst-core/router/ClientRouter"
import WebBridge from "catalyst-core/WebBridge"

window.addEventListener("load", () => {
    hydrationReady().then(() => {
        // The native hooks (haptics, notifications, safe area, network) talk
        // to the shell through this bridge; in a browser they fall back.
        WebBridge.init()

        const { __ROUTER_INITIAL_DATA__: routerInitialData } = window
        const router = clientRouter({ routerInitialState: routerInitialData })

        hydrateRoot(
            document.getElementById("app"),
            <React.StrictMode>
                <RouterProvider router={router} />
            </React.StrictMode>
        )
    })
})
