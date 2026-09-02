import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from '@servicenow/react-components/Alert'
import { Button } from '@servicenow/react-components/Button'
import { Loader } from '@servicenow/react-components/Loader'
import { Selection } from '../app'
import AppDetailPanel from './AppDetailPanel'
import FilterBar, { Filters } from './FilterBar'
import PageHeader from './PageHeader'
import SelectionBar from './SelectionBar'
import UpdatesTable from './UpdatesTable'
import { findRunningPlan, syncApps } from '../services/AppClientService'
import { AppConfig } from '../services/ConfigService'
import {
    getUpdateCheckJob,
    lastRefreshed,
    listUpdates,
    setUpdateCheckJobActive,
    StoreApp,
    UpdateCheckJob,
} from '../services/StoreAppService'

interface Props {
    config: AppConfig
    selection: Record<string, Selection>
    onSelectionChange: (next: Record<string, Selection>) => void
    onReview: () => void
    onResume: (batchId: string) => void
    onOpenGuide: (view: 'setup' | 'faq' | 'diagnostics') => void
}

export default function UpdatesView({
    config,
    selection,
    onSelectionChange,
    onReview,
    onResume,
    onOpenGuide,
}: Props) {
    const [apps, setApps] = useState<StoreApp[]>([])
    const [filters, setFilters] = useState<Filters>({
        levels: [],
        hideDependencies: config.hideDependencies,
        search: '',
    })
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [refreshed, setRefreshed] = useState<string | null>(null)
    const [job, setJob] = useState<UpdateCheckJob | null>(null)
    const [running, setRunning] = useState<string | null>(null)
    const [detail, setDetail] = useState<StoreApp | null>(null)
    /** null when idle; a percentage while the Store sync worker is running. */
    const [syncing, setSyncing] = useState<number | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [rows, when, checkJob, inFlight] = await Promise.all([
                listUpdates(),
                lastRefreshed(),
                getUpdateCheckJob(),
                findRunningPlan(),
            ])
            setApps(rows)
            setRefreshed(when)
            setJob(checkJob)
            setRunning(inFlight)
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    useEffect(() => {
        setFilters((current) => ({ ...current, hideDependencies: config.hideDependencies }))
    }, [config.hideDependencies])

    const runAction = async (action: () => Promise<unknown>) => {
        setBusy(true)
        setError(null)
        try {
            await action()
            await load()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const visible = useMemo(() => applyFilters(apps, filters), [apps, filters])

    const select = (chosen: StoreApp[], checked: boolean) => {
        const next = { ...selection }
        chosen.forEach((app) => {
            if (checked) next[app.sysId] = { app, target: app.latest }
            else delete next[app.sysId]
        })
        onSelectionChange(next)
    }

    const patches = useMemo(() => visible.filter((app) => app.level === 'patch'), [visible])
    const selectedCount = Object.keys(selection).length

    return (
        <main className="sum-page">
            <PageHeader
                title="Store Updates"
                subtitle={subtitle(apps.length, refreshed, config.instance)}
                actions={
                    <>
                        <Button
                            label={syncing === null ? 'Check for updates' : `Checking the Store... ${syncing}%`}
                            icon="arrow-clockwise-outline"
                            variant="secondary"
                            disabled={busy || loading}
                            onClicked={() =>
                                void runAction(async () => {
                                    setSyncing(0)
                                    try {
                                        await syncApps(setSyncing)
                                    } finally {
                                        setSyncing(null)
                                    }
                                })
                            }
                        />
                        <Button
                            label="Setup"
                            icon="book-outline"
                            variant="tertiary"
                            onClicked={() => onOpenGuide('setup')}
                        />
                        <Button
                            label="FAQ"
                            icon="circle-question-outline"
                            variant="tertiary"
                            onClicked={() => onOpenGuide('faq')}
                        />
                        <Button
                            label="Diagnostics"
                            icon="clipboard-check-outline"
                            variant="tertiary"
                            onClicked={() => onOpenGuide('diagnostics')}
                        />
                    </>
                }
            />

            {error && <Alert status="critical" header="Something went wrong" content={error} />}

            {running && (
                <Alert
                    status="info"
                    header="An install is already running"
                    content="A batch install started earlier has not finished yet."
                    action={{ type: 'acknowledge', label: 'View progress' }}
                    onActionClicked={() => onResume(running)}
                />
            )}

            {job && !job.active && (
                <Alert
                    status="warning"
                    header="The daily update check is switched off"
                    content="This list only changes when someone presses Check for updates."
                    action={{ type: 'acknowledge', label: 'Turn it back on' }}
                    onActionClicked={() => void runAction(() => setUpdateCheckJobActive(job.sysId, true))}
                />
            )}

            <FilterBar
                filters={filters}
                onChange={setFilters}
                total={apps.length}
                showing={visible.length}
                selected={selectedCount}
                patchCount={patches.length}
                onSelectPatches={() => select(patches, true)}
            />

            <div className="sum-split">
                <div className="sum-split__main">
                    {loading ? (
                        <Loader label="Loading store applications..." />
                    ) : (
                        <UpdatesTable
                            apps={visible}
                            selection={selection}
                            activeSysId={detail?.sysId}
                            onToggle={(app, checked) => select([app], checked)}
                            onToggleAll={(checked) => select(visible, checked)}
                            onOpenDetail={setDetail}
                        />
                    )}
                </div>
                {detail && (
                    <AppDetailPanel app={detail} family={config.family} onClose={() => setDetail(null)} />
                )}
            </div>

            <SelectionBar count={selectedCount} onClear={() => onSelectionChange({})} onReview={onReview} />
        </main>
    )
}

function subtitle(count: number, refreshed: string | null, instance: string): string {
    const where = instance ? ` on ${instance}` : ''
    const head =
        count === 1
            ? `1 application has a newer version available${where}`
            : `${count} applications have newer versions available${where}`
    return refreshed ? `${head} · Store catalogue last refreshed ${refreshed}` : head
}

function applyFilters(apps: StoreApp[], filters: Filters): StoreApp[] {
    const term = filters.search.trim().toLowerCase()
    return apps.filter((app) => {
        if (filters.hideDependencies && app.dependency) return false
        if (filters.levels.length > 0 && !filters.levels.includes(app.level)) return false
        if (!term) return true
        return app.name.toLowerCase().includes(term) || app.scope.toLowerCase().includes(term)
    })
}
