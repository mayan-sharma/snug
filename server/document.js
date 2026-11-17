import React from "react"
import { Head, Body } from "catalyst-core"

function Document(props) {
    return (
        <html lang="en">
            <Head {...props}>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
            </Head>
            <Body {...props} />
        </html>
    )
}
export default Document
