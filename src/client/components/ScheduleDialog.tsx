import React, { useState } from 'react'
import { Alert } from '@servicenow/react-components/Alert'
import { DateTime } from '@servicenow/react-components/DateTime'
import { Modal } from '@servicenow/react-components/Modal'
import { Select } from '@servicenow/react-components/Select'
import { describeTimeZone, TimeZoneInfo } from '../services/ConfigService'
import { isInThePast } from '../utils/datetime'

export type FailureStrategy = 'retry_next_day' | 'do_not_retry'

interface Props {
    open: boolean
    appCount: number
    busy: boolean
    /** The platform's own date+time pattern, so the picker emits exactly what it parses. */
    dateTimeFormat: string
    /** The zone the platform will read the chosen time in — the session user's. */
    timeZone: TimeZoneInfo
    onCancel: () => void
    onConfirm: (startTime: string, failureStrategy: FailureStrategy) => void
}

const STRATEGIES = [
    { id: 'retry_next_day', label: 'Try again in the same slot tomorrow' },
    { id: 'do_not_retry', label: 'Do not reschedule' },
]

/**
 * The picker is given the operator's own date pattern, so the string it emits
 * is already in the format GlideDateTime.setDisplayValue() expects. That call
 * parses in the session user's time zone, so the chosen time is wall-clock in
 * the user's zone: nothing is converted here, only labelled.
 */
export default function ScheduleDialog({
    open,
    appCount,
    busy,
    dateTimeFormat,
    timeZone,
    onCancel,
    onConfirm,
}: Props) {
    const [startTime, setStartTime] = useState('')
    const [strategy, setStrategy] = useState<FailureStrategy>('retry_next_day')

    const zone = describeTimeZone(timeZone)
    const past = isInThePast(startTime, dateTimeFormat)

    return (
        <Modal
            opened={open}
            size="md"
            headerLabel={`Schedule ${appCount} ${appCount === 1 ? 'update' : 'updates'}`}
            footerActions={[
                { label: 'Cancel', variant: 'secondary' },
                { label: busy ? 'Booking...' : 'Book it', variant: 'primary', disabled: busy || !startTime },
            ]}
            onOpenedSet={onCancel}
            onFooterActionClicked={(event) => {
                if (event.detail.payload.action.label === 'Cancel') onCancel()
                else onConfirm(startTime, strategy)
            }}
        >
            <div className="sum-dialog">
                <Alert
                    status="info"
                    header="Installs lock the instance while they run"
                    content="Booking a window is the safer option anywhere that is not a personal development instance."
                />
                <DateTime
                    label="Start time"
                    type="date-time"
                    format={dateTimeFormat}
                    value={startTime}
                    manageValue
                    required
                    helperContent="The booked time is shown back to you once it is saved."
                    messages={
                        past
                            ? [
                                  {
                                      status: 'warning' as const,
                                      content: 'That time looks like it has already passed. The platform will not run it.',
                                      icon: 'triangle-exclamation-outline',
                                  },
                              ]
                            : []
                    }
                    onValueSet={(event) => setStartTime(String(event.detail.payload.value ?? ''))}
                />
                <p className="sum-dialog__zone">{zone}</p>
                <Select
                    label="If the window is missed"
                    items={STRATEGIES}
                    selectedItem={strategy}
                    manageSelectedItem
                    onSelectedItemSet={(event) => setStrategy(String(event.detail.payload.value) as FailureStrategy)}
                />
            </div>
        </Modal>
    )
}

