import React from 'react'
import { Checkbox } from '@servicenow/react-components/Checkbox'
import { Selection } from '../app'
import LevelPill from './LevelPill'
import { StoreApp } from '../services/StoreAppService'

interface Props {
    apps: StoreApp[]
    selection: Record<string, Selection>
    activeSysId?: string
    onToggle: (app: StoreApp, checked: boolean) => void
    onToggleAll: (checked: boolean) => void
    onOpenDetail: (app: StoreApp) => void
}

export default function UpdatesTable({
    apps,
    selection,
    activeSysId,
    onToggle,
    onToggleAll,
    onOpenDetail,
}: Props) {
    if (apps.length === 0) {
        return (
            <div className="sum-empty">
                <p className="sum-empty__title">Nothing to update here</p>
                <p className="sum-empty__body">
                    No application matches the current filters. Clear a filter, or check for updates to refresh the
                    list.
                </p>
            </div>
        )
    }

    const selectedHere = apps.filter((app) => selection[app.sysId]).length
    const headerState: boolean | 'indeterminate' =
        selectedHere === 0 ? false : selectedHere === apps.length ? true : 'indeterminate'

    return (
        <table className="sum-table">
            <thead>
                <tr>
                    <th scope="col" className="sum-table__check">
                        <Checkbox
                            checked={headerState}
                            manageChecked
                            configAria={{ checkbox: { 'aria-label': 'Select all shown applications' } }}
                            onCheckedSet={(event) => onToggleAll(event.detail.payload.value)}
                        />
                    </th>
                    <th scope="col">Application</th>
                    <th scope="col">Installed</th>
                    <th scope="col">Available</th>
                    <th scope="col">Update</th>
                </tr>
            </thead>
            <tbody>
                {apps.map((app) => (
                    <tr key={app.sysId} className={rowClass(Boolean(selection[app.sysId]), activeSysId === app.sysId)}>
                        <td className="sum-table__check">
                            <Checkbox
                                checked={Boolean(selection[app.sysId])}
                                manageChecked
                                configAria={{ checkbox: { 'aria-label': `Select ${app.name}` } }}
                                onCheckedSet={(event) => onToggle(app, event.detail.payload.value)}
                            />
                        </td>
                        <td>
                            <button type="button" className="sum-table__link" onClick={() => onOpenDetail(app)}>
                                {app.name}
                            </button>
                            <span className="sum-table__scope">{app.scope}</span>
                            {app.dependency && <span className="sum-tag">Dependency</span>}
                            {app.needsLicensing && <span className="sum-tag">Licensed</span>}
                        </td>
                        <td className="sum-table__version">{app.installed}</td>
                        <td className="sum-table__version sum-table__version--target">{app.latest}</td>
                        <td>
                            <LevelPill level={app.level} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function rowClass(selected: boolean, active: boolean): string | undefined {
    const classes: string[] = []
    if (selected) classes.push('sum-table__row--selected')
    if (active) classes.push('sum-table__row--active')
    return classes.length ? classes.join(' ') : undefined
}
