export type ViewName = 'updates' | 'review' | 'install' | 'setup' | 'faq' | 'diagnostics'

export interface Route {
    view: ViewName
    batchId?: string
}

const TITLES: Record<ViewName, string> = {
    updates: 'Store Updates',
    review: 'Review updates',
    install: 'Installing updates',
    setup: 'Setup guide',
    faq: 'Store Update Manager FAQ',
    diagnostics: 'Store Update Manager diagnostics',
}

export function readRoute(): Route {
    const params = new URLSearchParams(window.location.search)
    const view = (params.get('view') || 'updates') as ViewName
    return { view, batchId: params.get('batch') || undefined }
}

/**
 * The batch plan id lives in the URL, so closing the page mid-install and
 * reopening the link rejoins the same run rather than losing it.
 */
export function navigateTo(route: Route): void {
    const params = new URLSearchParams()
    params.set('view', route.view)
    if (route.batchId) params.set('batch', route.batchId)

    const relativePath = `${window.location.pathname}?${params.toString()}`
    const title = TITLES[route.view] || TITLES.updates

    if (window.self !== window.top) {
        const custom = window.CustomEvent as unknown as {
            fireTop?: (name: string, detail: unknown) => void
        }
        custom?.fireTop?.('magellanNavigator.permalink.set', { relativePath, title })
    }

    window.history.pushState({ view: route.view, batchId: route.batchId }, '', relativePath)
    document.title = title
}
