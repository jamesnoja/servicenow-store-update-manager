import React, { useEffect, useMemo, useState } from 'react'
import { Alert } from '@servicenow/react-components/Alert'
import { Button } from '@servicenow/react-components/Button'
import { Input } from '@servicenow/react-components/Input'
import { Loader } from '@servicenow/react-components/Loader'
import { Selection } from '../app'
import PageHeader from './PageHeader'
import ReviewRow from './ReviewRow'
import ScheduleDialog, { FailureStrategy } from './ScheduleDialog'
import { AppVersion, listVersions } from '../services/StoreAppService'
import { AppConfig, isCompatible } from '../services/ConfigService'
import { createSchedule, InstallPackage, ScheduleApp, submitInstall } from '../services/AppClientService'
import { defaultPlanName } from '../utils/plan'

interface Props {
    selection: Record<string, Selection>
    config: AppConfig
    onBack: () => void
    onRemove: (sysId: string) => void
    onSubmitted: (batchId: string) => void
    onScheduled: () => void
}

export default function ReviewView({ selection, config, onBack, onRemove, onSubmitted, onScheduled }: Props) {
    const rows = useMemo(() => Object.values(selection), [selection])
    const [versions, setVersions] = useState<Record<string, AppVersion[]>>({})
    const [targets, setTargets] = useState<Record<string, string>>({})
    const [planName, setPlanName] = useState(defaultPlanName)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [scheduling, setScheduling] = useState(false)
    const [booked, setBooked] = useState<string | null>(null)

    useEffect(() => {
        setTargets((current) => {
            const next = { ...current }
            rows.forEach((row) => {
                if (!next[row.app.sysId]) next[row.app.sysId] = row.target
            })
            return next
        })
    }, [rows])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        listVersions(rows.map((row) => row.app))
            .then((result) => {
                if (!cancelled) setVersions(result)
            })
            .catch((err) => {
                if (!cancelled) setError((err as Error).message)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
        // The set of applications is fixed once review opens; removing one does
        // not need a refetch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const chosenVersion = (row: Selection) =>
        (versions[row.app.sysId] || []).find((item) => item.version === targets[row.app.sysId])

    const blocked = rows.filter((row) => chosenVersion(row)?.blocked)

    const incompatible = rows.filter((row) => {
        const chosen = chosenVersion(row)
        return chosen ? isCompatible(chosen.compatibilities, config.family) === false : false
    })

    const book = async (startTime: string, failureStrategy: FailureStrategy) => {
        setSubmitting(true)
        setError(null)
        try {
            const apps: ScheduleApp[] = rows.map((row) => ({
                name: row.app.name,
                scope: row.app.scope,
                source_app_id: row.app.sysId,
                version: targets[row.app.sysId] || row.app.latest,
                is_store_app: true,
                is_plugin: false,
                load_demo_data: false,
            }))
            const result = await createSchedule(
                planName.trim() || defaultPlanName(),
                startTime,
                apps,
                failureStrategy
            )
            setScheduling(false)
            setBooked(result.startTime)
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    const submit = async () => {
        setSubmitting(true)
        setError(null)
        try {
            const packages: InstallPackage[] = rows.map((row) => ({
                id: row.app.sysId,
                type: 'application',
                requested_version: targets[row.app.sysId] || row.app.latest,
                load_demo_data: false,
                notes: '',
            }))
            const batchId = await submitInstall(planName.trim() || defaultPlanName(), packages)
            onSubmitted(batchId)
        } catch (err) {
            setError((err as Error).message)
            setSubmitting(false)
        }
    }

    return (
        <main className="sum-page">
            <PageHeader
                title="Review updates"
                subtitle={`${rows.length} ${rows.length === 1 ? 'application' : 'applications'} will be installed as one batch`}
                actions={<Button label="Back to list" icon="arrow-left-outline" variant="tertiary" onClicked={onBack} />}
            />

            {error && <Alert status="critical" header="The install was not submitted" content={error} />}

            {booked && (
                <Alert
                    status="positive"
                    header="Booked"
                    content={`The platform stored the start time as ${booked}${config.timeZone.offset ? ` (${config.timeZone.offset})` : ''}. If that is not the moment you meant, delete the schedule from Scheduled Installs and book it again.`}
                    action={{ type: 'acknowledge', label: 'Back to updates' }}
                    onActionClicked={onScheduled}
                />
            )}

            {blocked.length > 0 && (
                <Alert
                    status="warning"
                    header="Some versions are blocked"
                    content={`${blocked.length} selected ${blocked.length === 1 ? 'version is' : 'versions are'} marked as blocked in the Store catalogue. The platform will refuse them, and they will come back as Not applied.`}
                />
            )}

            {incompatible.length > 0 && (
                <Alert
                    status="warning"
                    header="Not listed for this release family"
                    content={`${incompatible.length} selected ${incompatible.length === 1 ? 'version does' : 'versions do'} not list ${config.family} among their supported families. Check the Store listing before installing.`}
                />
            )}

            <div className="sum-plan">
                <Input
                    label="Plan name"
                    value={planName}
                    manageValue
                    helperContent="Shown on the batch install plan record and in Install History."
                    onInput={(event) => setPlanName(String(event.detail.payload.fieldValue ?? ''))}
                    onValueSet={(event) => setPlanName(String(event.detail.payload.value ?? ''))}
                />
            </div>

            {loading ? (
                <Loader label="Loading available versions..." />
            ) : (
                <table className="sum-table">
                    <thead>
                        <tr>
                            <th scope="col">Application</th>
                            <th scope="col">Installed</th>
                            <th scope="col">Install version</th>
                            <th scope="col">Update</th>
                            <th scope="col" className="sum-table__actions">
                                <span className="sum-visually-hidden">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <ReviewRow
                                key={row.app.sysId}
                                app={row.app}
                                target={targets[row.app.sysId] || row.app.latest}
                                versions={versions[row.app.sysId] || []}
                                onTargetChange={(version) =>
                                    setTargets((current) => ({ ...current, [row.app.sysId]: version }))
                                }
                                onRemove={() => onRemove(row.app.sysId)}
                            />
                        ))}
                    </tbody>
                </table>
            )}

            <div className="sum-actions">
                <Button label="Back" variant="secondary" onClicked={onBack} disabled={submitting} />
                <Button
                    label="Schedule for later"
                    variant="secondary"
                    icon="calendar-outline"
                    disabled={submitting || rows.length === 0}
                    tooltipContent="An install locks the instance while it runs"
                    onClicked={() => setScheduling(true)}
                />
                <Button
                    label={submitting ? 'Submitting...' : `Install ${rows.length} ${rows.length === 1 ? 'update' : 'updates'} now`}
                    variant="primary"
                    icon="download-outline"
                    disabled={submitting || rows.length === 0}
                    onClicked={() => void submit()}
                />
            </div>

            <ScheduleDialog
                open={scheduling}
                appCount={rows.length}
                busy={submitting}
                dateTimeFormat={config.dateTimeFormat}
                timeZone={config.timeZone}
                onCancel={() => setScheduling(false)}
                onConfirm={(startTime, strategy) => void book(startTime, strategy)}
            />
        </main>
    )
}
