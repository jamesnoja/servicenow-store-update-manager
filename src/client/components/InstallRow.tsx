import React from 'react'
import { BatchItem, REASON_LABEL, STATE_LABEL } from '../services/AppClientService'

/** Skipped is not failed: the platform distinguishes them and so does this row. */
export default function InstallRow({ item }: { item: BatchItem }) {
    const detail = item.reason ? REASON_LABEL[item.reason] || item.reason : item.statusMessage

    return (
        <tr>
            <td>
                <span className="sum-table__name">{item.name}</span>
            </td>
            <td className="sum-table__version">{item.version}</td>
            <td>
                <span className={`sum-state sum-state--${item.state}`}>
                    {item.state === 'in_progress' && <span className="sum-state__spinner" aria-hidden="true" />}
                    {STATE_LABEL[item.state] || item.state}
                </span>
            </td>
            <td className="sum-table__detail">{detail || '—'}</td>
        </tr>
    )
}
