import React, { useCallback, useEffect, useState } from 'react'
import UpdatesView from './components/UpdatesView'
import ReviewView from './components/ReviewView'
import InstallView from './components/InstallView'
import SetupGuide from './components/SetupGuide'
import FaqGuide from './components/FaqGuide'
import DiagnosticsView from './components/DiagnosticsView'
import { listUpdates, StoreApp } from './services/StoreAppService'
import { AppConfig, FALLBACK_DATETIME_FORMAT, loadConfig, UNKNOWN_TIME_ZONE } from './services/ConfigService'
import { navigateTo, readRoute, Route } from './utils/routing'
import './app.css'

export interface Selection {
    app: StoreApp
    target: string
}

const FALLBACK_CONFIG: AppConfig = {
    hideDependencies: true,
    pollSeconds: 4,
    family: '',
    instance: '',
    dateTimeFormat: FALLBACK_DATETIME_FORMAT,
    timeZone: UNKNOWN_TIME_ZONE,
}

export default function App() {
    const [route, setRoute] = useState<Route>(readRoute)
    const [selection, setSelection] = useState<Record<string, Selection>>({})
    const [config, setConfig] = useState<AppConfig>(FALLBACK_CONFIG)

    useEffect(() => {
        const onPopState = () => setRoute(readRoute())
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [])

    useEffect(() => {
        void loadConfig().then(setConfig)
    }, [])

    const go = useCallback((next: Route) => {
        navigateTo(next)
        setRoute(next)
    }, [])

    /**
     * Re-select the applications that did not install and drop straight into
     * review, rather than making someone find them again in a list of 269.
     */
    const retry = useCallback(
        async (appIds: string[]) => {
            const apps = await listUpdates()
            const wanted = new Set(appIds)
            const next: Record<string, Selection> = {}
            apps.filter((app) => wanted.has(app.sysId)).forEach((app) => {
                next[app.sysId] = { app, target: app.latest }
            })
            if (Object.keys(next).length === 0) return
            setSelection(next)
            go({ view: 'review' })
        },
        [go]
    )

    if (route.view === 'setup') return <SetupGuide onBack={() => go({ view: 'updates' })} />
    if (route.view === 'faq') return <FaqGuide onBack={() => go({ view: 'updates' })} />
    if (route.view === 'diagnostics')
        return <DiagnosticsView config={config} onBack={() => go({ view: 'updates' })} />

    if (route.view === 'install' && route.batchId) {
        return (
            <InstallView
                batchId={route.batchId}
                pollSeconds={config.pollSeconds}
                onRetry={retry}
                onDone={() => {
                    setSelection({})
                    go({ view: 'updates' })
                }}
            />
        )
    }

    if (route.view === 'review' && Object.keys(selection).length > 0) {
        return (
            <ReviewView
                selection={selection}
                config={config}
                onBack={() => go({ view: 'updates' })}
                onRemove={(sysId) =>
                    setSelection((current) => {
                        const next = { ...current }
                        delete next[sysId]
                        return next
                    })
                }
                onSubmitted={(batchId) => go({ view: 'install', batchId })}
                onScheduled={() => {
                    setSelection({})
                    go({ view: 'updates' })
                }}
            />
        )
    }

    return (
        <UpdatesView
            config={config}
            selection={selection}
            onSelectionChange={setSelection}
            onReview={() => go({ view: 'review' })}
            onResume={(batchId) => go({ view: 'install', batchId })}
            onOpenGuide={(view) => go({ view })}
        />
    )
}
