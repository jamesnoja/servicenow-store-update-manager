import React, { useCallback, useEffect, useState } from 'react'
import { Alert } from '@servicenow/react-components/Alert'
import { Button } from '@servicenow/react-components/Button'
import { Loader } from '@servicenow/react-components/Loader'
import PageHeader from './PageHeader'
import { AppConfig } from '../services/ConfigService'
import { Check, runDiagnostics } from '../services/DiagnosticsService'

interface Props {
    config: AppConfig
    onBack: () => void
}

/**
 * Everything worth knowing before trusting this application on an instance
 * nobody has run it on. Read-only: nothing here changes anything.
 */
export default function DiagnosticsView({ config, onBack }: Props) {
    const [checks, setChecks] = useState<Check[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    const run = useCallback(async () => {
        setChecks(null)
        setError(null)
        try {
            setChecks(await runDiagnostics(config))
        } catch (err) {
            setError((err as Error).message)
        }
    }, [config])

    useEffect(() => {
        void run()
    }, [run])

    const problems = (checks || []).filter((check) => check.status === 'critical').length
    const warnings = (checks || []).filter((check) => check.status === 'warning').length

    return (
        <main className="sum-page">
            <PageHeader
                title="Diagnostics"
                subtitle="What this application can see on this instance. Nothing here changes anything."
                actions={
                    <>
                        <Button
                            label="Run again"
                            icon="arrow-clockwise-outline"
                            variant="secondary"
                            onClicked={() => void run()}
                        />
                        <Button
                            label="Back to updates"
                            icon="arrow-left-outline"
                            variant="tertiary"
                            onClicked={onBack}
                        />
                    </>
                }
            />

            {error && <Alert status="critical" header="Diagnostics could not run" content={error} />}

            {checks && (
                <Alert
                    status={problems > 0 ? 'critical' : warnings > 0 ? 'warning' : 'positive'}
                    header={summary(problems, warnings, checks.length)}
                    content={
                        problems > 0
                            ? 'The application will not work correctly until the problems below are dealt with.'
                            : warnings > 0
                              ? 'Nothing is broken. The warnings below are worth a look before you rely on it.'
                              : 'Everything this application depends on is present and readable.'
                    }
                />
            )}

            {checks === null && !error ? (
                <Loader label="Checking this instance..." />
            ) : (
                <table className="sum-table">
                    <thead>
                        <tr>
                            <th scope="col">Check</th>
                            <th scope="col">Result</th>
                            <th scope="col">What it found</th>
                            <th scope="col">What to do</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(checks || []).map((check) => (
                            <tr key={check.name}>
                                <td>
                                    <span className="sum-table__name">{check.name}</span>
                                </td>
                                <td>
                                    <span className={`sum-check sum-check--${check.status}`}>
                                        {LABEL[check.status]}
                                    </span>
                                </td>
                                <td className="sum-table__detail">{check.detail}</td>
                                <td className="sum-table__detail">{check.action || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </main>
    )
}

const LABEL: Record<string, string> = {
    positive: 'OK',
    warning: 'Worth a look',
    critical: 'Problem',
}

function summary(problems: number, warnings: number, total: number): string {
    if (problems > 0) return `${problems} of ${total} checks found a problem`
    if (warnings > 0) return `${total - warnings} of ${total} checks clean, ${warnings} worth a look`
    return `All ${total} checks clean`
}
