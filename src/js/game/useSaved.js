import { useEffect, useState } from "react"
import { load, STORAGE_EVENT } from "./storage"

// Saved data is read after hydration (the server has none), and re-read
// whenever this tab or another one writes.
export function useSaved() {
    const [data, setData] = useState(null)
    useEffect(() => {
        const read = () => setData(load())
        read()
        window.addEventListener(STORAGE_EVENT, read)
        window.addEventListener("storage", read)
        return () => {
            window.removeEventListener(STORAGE_EVENT, read)
            window.removeEventListener("storage", read)
        }
    }, [])
    return data
}
