declare global {
    interface Window {
        g_ck: string
    }
}

export class ApiError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

type Params = Record<string, string | number | boolean | undefined>

export function withParams(path: string, params: Params = {}): string {
    const search = new URLSearchParams()
    Object.keys(params).forEach((key) => {
        const value = params[key]
        if (value !== undefined && value !== '') search.set(key, String(value))
    })
    const query = search.toString()
    return query ? `${path}?${query}` : path
}

async function send<T>(url: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-UserToken': window.g_ck,
    }
    if (init.body) headers['Content-Type'] = 'application/json'

    const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as object) } })
    const text = await response.text()

    let body: unknown = null
    try {
        body = text ? JSON.parse(text) : null
    } catch {
        // Non-JSON responses only matter when the call failed; message() handles it.
    }

    if (!response.ok) throw new ApiError(message(body, text, response.status), response.status)
    return (body as { result?: T })?.result !== undefined ? ((body as { result: T }).result as T) : (body as T)
}

function message(body: unknown, text: string, status: number): string {
    const error = (body as { error?: { message?: string; detail?: string } })?.error
    if (error?.detail) return error.detail
    if (error?.message) return error.message
    if (text && text.length < 200) return text
    return `Request failed with HTTP ${status}`
}

export const api = {
    get: <T>(url: string) => send<T>(url),
    post: <T>(url: string, payload: unknown) => send<T>(url, { method: 'POST', body: JSON.stringify(payload) }),
    patch: <T>(url: string, payload: unknown) => send<T>(url, { method: 'PATCH', body: JSON.stringify(payload) }),
}

export function tableUrl(table: string, params: Params = {}): string {
    return withParams(`/api/now/table/${table}`, params)
}
