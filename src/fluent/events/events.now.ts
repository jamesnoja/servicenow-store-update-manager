import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

/**
 * Both events carry the recipient in parm1 and the ready-made HTML summary in
 * parm2, so the notifications need no field dot-walking and the same event can
 * be fired once per person.
 *
 * `event_name` is capped at 40 characters by the platform and silently
 * truncated past it — both of these fit with room to spare.
 */

export const batchFinishedEvent = Record({
    $id: Now.ID['event-batch-finished'],
    table: 'sysevent_register',
    data: {
        event_name: 'x_301833_store_upd.batch_finished',
        suffix: 'batch_finished',
        table: 'sys_batch_install_plan',
        description: 'A batch install plan reached a final state.',
        fired_by: 'Store Update Manager - Notify on batch finish (scheduled script)',
    },
})

export const updatesReadyEvent = Record({
    $id: Now.ID['event-updates-ready'],
    table: 'sysevent_register',
    data: {
        event_name: 'x_301833_store_upd.updates_ready',
        suffix: 'updates_ready',
        table: 'sys_store_app',
        description: 'Store applications on this instance have newer versions available.',
        fired_by: 'Store Update Manager - Update digest (scheduled script)',
    },
})
