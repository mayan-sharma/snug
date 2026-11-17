import React from "react"
import { RouterDataProvider, MetaTag } from "catalyst-core"
import { WebMcpProvider } from "catalyst-core/webmcp"
import { installShim } from "catalyst-core/webmcp/shim"
import App from "@containers/App"
import routes from "./index.js"

// WebMCP: agents can read the board and play. The shim gives browsers
// without native document.modelContext the same API; it is a no-op on the
// server and prefers a native implementation when one exists.
installShim()

export const preparedRoutes = ({ routerInitialState }) => {
    const getPreparedRoutes = (routes) => {
        return routes.map((route, index) => {
            const Component = route.component
            const routeToRender = {
                ...route,
                element: <Component key={index} />,
            }
            if (route.children) {
                routeToRender.children = getPreparedRoutes(route.children)
            }
            return routeToRender
        })
    }

    return [
        {
            element: (
                <RouterDataProvider config={{}} initialState={routerInitialState}>
                    <WebMcpProvider routes={routes}>
                        <MetaTag />
                        <App />
                    </WebMcpProvider>
                </RouterDataProvider>
            ),
            children: getPreparedRoutes(routes),
        },
    ]
}

export const getRoutes = () => {
    return routes
}
