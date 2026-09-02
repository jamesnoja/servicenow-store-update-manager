import React from 'react'
import { ButtonIconic } from '@servicenow/react-components/ButtonIconic'
import { Select } from '@servicenow/react-components/Select'
import LevelPill from './LevelPill'
import { AppVersion, StoreApp } from '../services/StoreAppService'
import { updateLevel } from '../utils/version'

interface Props {
    app: StoreApp
    target: string
    versions: AppVersion[]
    onTargetChange: (version: string) => void
    onRemove: () => void
}

export default function ReviewRow({ app, target, versions, onTargetChange, onRemove }: Props) {
    const items = (versions.length ? versions : [{ version: app.latest, blocked: false } as AppVersion]).map(
        (version) => ({
            id: version.version,
            label: version.version === app.latest ? `${version.version} (latest)` : version.version,
            sublabel: version.blocked ? 'Blocked in the Store' : version.publishDate,
        })
    )

    return (
        <tr>
            <td>
                <span className="sum-table__name">{app.name}</span>
                <span className="sum-table__scope">{app.scope}</span>
            </td>
            <td className="sum-table__version">{app.installed}</td>
            <td className="sum-table__picker">
                <Select
                    items={items}
                    selectedItem={target}
                    size="sm"
                    search={items.length > 8 ? 'contains' : 'none'}
                    manageSelectedItem
                    configAria={{ trigger: { 'aria-label': `Install version for ${app.name}` } }}
                    onSelectedItemSet={(event) => onTargetChange(String(event.detail.payload.value))}
                />
            </td>
            <td>
                <LevelPill level={updateLevel(app.installed, target)} />
            </td>
            <td className="sum-table__actions">
                <ButtonIconic
                    icon="trash-outline"
                    variant="tertiary"
                    size="sm"
                    tooltipContent={`Remove ${app.name}`}
                    configAria={{ 'aria-label': `Remove ${app.name} from this batch` }}
                    onClicked={onRemove}
                />
            </td>
        </tr>
    )
}
