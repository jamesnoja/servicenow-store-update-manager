import React, { useEffect, useState } from 'react'
import { Alert } from '@servicenow/react-components/Alert'
import { ButtonIconic } from '@servicenow/react-components/ButtonIconic'
import { Loader } from '@servicenow/react-components/Loader'
import { AppVersion, listVersions, StoreApp } from '../services/StoreAppService'
import { isCompatible } from '../services/ConfigService'
import LevelPill from './LevelPill'
import { updateLevel } from '../utils/version'

interface Props {
    app: StoreApp
    family: string
    onClose: () => void
}

/**
 * What a version actually brings. The Store publishes no release notes to the
 * instance — `short_description` is the same sentence on every release — so
 * this shows what is genuinely per-version and genuinely useful: the ladder
 * being jumped, what each release pulls in, and whether it claims to support
 * this family.
 */
export default function AppDetailPanel({ app, family, onClose }: Props) {
    const [versions, setVersions] = useState<AppVersion[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        listVersions([app])
            .then((result) => {
                if (!cancelled) setVersions(result[app.sysId] || [])
            })
            .catch((err) => {
                if (!cancelled) setError((err as Error).message)
            })
        return () => {
            cancelled = true
        }
    }, [app])

    const latestRow = versions?.find((version) => version.version === app.latest)
    const compatible = latestRow ? isCompatible(latestRow.compatibilities, family) : null

    return (
        <aside className="sum-panel" aria-label={`Details for ${app.name}`}>
            <header className="sum-panel__header">
                <div>
                    <p className="sum-panel__title">{app.name}</p>
                    <p className="sum-panel__scope">{app.scope}</p>
                </div>
                <ButtonIconic
                    icon="close-outline"
                    variant="tertiary"
                    size="sm"
                    configAria={{ 'aria-label': 'Close details' }}
                    onClicked={onClose}
                />
            </header>

            <p className="sum-panel__summary">
                <span className="sum-table__version">{app.installed}</span>
                <span aria-hidden="true"> → </span>
                <span className="sum-table__version sum-table__version--target">{app.latest}</span>
                <LevelPill level={app.level} />
            </p>

            {compatible === false && (
                <Alert
                    status="warning"
                    header="Not listed for this release family"
                    content={`Version ${app.latest} lists ${latestRow?.compatibilities} and this instance is on ${family}. Check the Store listing before installing.`}
                />
            )}

            {error && <Alert status="critical" header="Could not load versions" content={error} />}

            {versions === null ? (
                <Loader label="Loading versions..." size="md" />
            ) : versions.length === 0 ? (
                <p className="sum-note">
                    No published version records are held on this instance for this application. Run{' '}
                    <strong>Check for updates</strong> to refresh the Store catalogue.
                </p>
            ) : (
                <ol className="sum-ladder">
                    {versions.map((version) => (
                        <li key={version.version} className="sum-ladder__item">
                            <div className="sum-ladder__head">
                                <span className="sum-table__version">{version.version}</span>
                                <LevelPill level={updateLevel(app.installed, version.version)} />
                                {version.blocked && <span className="sum-tag">Blocked</span>}
                            </div>
                            {version.publishDate && (
                                <p className="sum-ladder__meta">Published {version.publishDate.split(' ')[0]}</p>
                            )}
                            {version.dependencies && (
                                <p className="sum-ladder__meta">
                                    Pulls in {version.dependencies.split(',').join(', ')}
                                </p>
                            )}
                            {version.blockMessage && <p className="sum-ladder__meta">{version.blockMessage}</p>}
                        </li>
                    ))}
                </ol>
            )}
        </aside>
    )
}
