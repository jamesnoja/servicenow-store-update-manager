import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from '@servicenow/react-components/Alert'
import { Button } from '@servicenow/react-components/Button'
import { Loader } from '@servicenow/react-components/Loader'
import { ProgressBar } from '@servicenow/react-components/ProgressBar'
import PageHeader from './PageHeader'
import InstallRow from './InstallRow'
import { BatchItem, BatchPlan, getPlan, listBatchItems, TERMINAL_STATES } from '../services/AppClientService'

interface Props {
    batchId: string
    pollSeconds: number
    onRetry: (appIds: string[]) => Promise<void>
    onDone: () => void
}

export default function InstallView({ batchId, pollSeconds, onRetry, onDone }: Props) {
    const [items, setItems] = useState<BatchItem[]>([])
    const [plan, setPlan] = useState<BatchPlan | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [firstLoad, setFirstLoad] = useState(true)
    const [retrying, setRetrying] = useState(false)
    const timer = useRef<number | undefined>(undefined)

    const poll = useCallback(async () => {
        try {
            const [rows, planRow] = await Promise.all([listBatchItems(batchId), getPlan(batchId)])
            setItems(rows)
            setPlan(planRow)
            setError(null)
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setFirstLoad(false)
        }
    }, [batchId])

    const finished = items.length > 0 && items.every((item) => TERMINAL_STATES.includes(item.state))

    useEffect(() => {
        void poll()
    }, [poll])

    useEffect(() => {
        if (finished) return undefined
        timer.current = window.setTimeout(() => void poll(), Math.max(2, pollSeconds) * 1000)
        return () => window.clearTimeout(timer.current)
    }, [poll, finished, items, pollSeconds])

    const done = items.filter((item) => TERMINAL_STATES.includes(item.state)).length
    const installed = items.filter((item) => item.state === 'installed').length
    const failed = items.filter((item) => item.state === 'failed').length
    const skipped = items.filter((item) => item.state === 'invalid' || item.state === 'rolled_back').length

    /**
     * Worth another go: it failed, or it was refused for a reason that can
     * change. ALREADY_INSTALLED never can, so it is left out.
     */
    const retryable = items
        .filter((item) => item.state === 'failed' || (item.state === 'invalid' && item.reason !== 'ALREADY_INSTALLED'))
        .map((item) => item.appId)

    return (
        <main className="sum-page">
            <PageHeader
                title={finished ? 'Install finished' : 'Installing updates'}
                subtitle={plan ? plan.name : 'Preparing the batch install plan...'}
                actions={
                    <Button
                        label="Back to updates"
                        icon="arrow-left-outline"
                        variant={finished ? 'primary' : 'tertiary'}
                        onClicked={onDone}
                    />
                }
            />

            {error && <Alert status="critical" header="Could not read progress" content={error} />}

            <section className="sum-progress" aria-live="polite">
                <ProgressBar
                    label={
                        items.length === 0
                            ? 'Waiting for the platform to queue the applications'
                            : `${done} of ${items.length} processed`
                    }
                    value={items.length ? done / items.length : undefined}
                    max={1}
                    size="lg"
                    pathType={failed > 0 ? 'alert' : finished ? 'positive' : 'initial'}
                />
                <ul className="sum-progress__counts">
                    <li>
                        <strong>{installed}</strong> installed
                    </li>
                    <li>
                        <strong>{skipped}</strong> not applied
                    </li>
                    <li>
                        <strong>{failed}</strong> failed
                    </li>
                </ul>
            </section>

            {finished && (
                <Alert
                    status={failed > 0 ? 'critical' : skipped > 0 ? 'warning' : 'positive'}
                    header={summaryHeader(installed, skipped, failed)}
                    content="Each row below carries the platform's own reason. Nothing is retried automatically."
                />
            )}

            {finished && (retryable.length > 0 || plan?.rollbackContext) && (
                <div className="sum-actions sum-actions--start">
                    {retryable.length > 0 && (
                        <Button
                            label={`Retry ${retryable.length} that did not install`}
                            variant="secondary"
                            icon="arrow-clockwise-outline"
                            disabled={retrying}
                            onClicked={() => {
                                setRetrying(true)
                                void onRetry(retryable).finally(() => setRetrying(false))
                            }}
                        />
                    )}
                    {plan?.rollbackContext && (
                        <Button
                            label="Roll back this batch"
                            variant="secondary"
                            icon="arrow-left-outline"
                            tooltipContent="Opens the platform's own rollback screen"
                            onClicked={() => {
                                window.open(`/sys_rollback_context.do?sys_id=${plan.rollbackContext}`, '_blank')
                            }}
                        />
                    )}
                </div>
            )}

            {firstLoad && items.length === 0 ? (
                <Loader label="Starting the batch install..." />
            ) : items.length === 0 ? (
                <p className="sum-note">
                    The plan has been submitted but the platform has not queued any applications yet. This page keeps
                    checking.
                </p>
            ) : (
                <table className="sum-table">
                    <thead>
                        <tr>
                            <th scope="col">Application</th>
                            <th scope="col">Version</th>
                            <th scope="col">Status</th>
                            <th scope="col">Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <InstallRow key={item.sysId} item={item} />
                        ))}
                    </tbody>
                </table>
            )}
        </main>
    )
}

function summaryHeader(installed: number, skipped: number, failed: number): string {
    if (failed > 0) return `${failed} ${failed === 1 ? 'application' : 'applications'} failed to install`
    if (skipped > 0) return `${installed} installed, ${skipped} not applied`
    return `${installed} ${installed === 1 ? 'application' : 'applications'} installed`
}
