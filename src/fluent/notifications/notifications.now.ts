import '@servicenow/sdk/global'
import { EmailNotification } from '@servicenow/sdk/core'

/**
 * Recipients arrive in event.parm1 rather than being baked in, so the same
 * application can be installed on any instance and the notify_users property
 * decides who hears about it. The body is event.parm2, already composed by the
 * scheduled script.
 *
 * Fluent source files take literal values only — no string concatenation — so
 * the message bodies are single long literals on purpose.
 */

EmailNotification({
    $id: Now.ID['notify-batch-finished'],
    table: 'sys_batch_install_plan',
    name: 'Store Update Manager - Batch install finished',
    description:
        'Sent when a batch install plan reaches a final state. Recipients come from x_301833_store_upd.notify_users.',
    active: true,
    triggerConditions: {
        generationType: 'event',
        eventName: 'x_301833_store_upd.batch_finished',
    },
    recipientDetails: {
        eventParm1WithRecipient: true,
        sendToCreator: false,
    },
    emailContent: {
        subject: 'Store updates: ${name} finished (${state})',
        contentType: 'text/html',
        messageHtml:
            '${event.parm2}<p><a href="${URI_REF}">Open the batch install plan</a></p><p style="color:#71827d;font-size:12px">Sent by Store Update Manager. Change who receives this in the system property x_301833_store_upd.notify_users, or switch it off with x_301833_store_upd.notify_on_batch_finish.</p>',
    },
})

EmailNotification({
    $id: Now.ID['notify-updates-ready'],
    table: 'sys_store_app',
    name: 'Store Update Manager - Updates available digest',
    description:
        'Periodic summary of Store applications with a newer version available. Cadence is set by x_301833_store_upd.digest_frequency.',
    active: true,
    triggerConditions: {
        generationType: 'event',
        eventName: 'x_301833_store_upd.updates_ready',
    },
    recipientDetails: {
        eventParm1WithRecipient: true,
        sendToCreator: false,
    },
    emailContent: {
        subject: 'Store updates available on ${instance_name}',
        contentType: 'text/html',
        messageHtml:
            '${event.parm2}<p>Open <strong>Store Update Manager &gt; Store Updates</strong> to review and install them.</p><p style="color:#71827d;font-size:12px">Sent by Store Update Manager. Change the cadence with x_301833_store_upd.digest_frequency (off, weekly, monthly) or the threshold with x_301833_store_upd.digest_min_level.</p>',
    },
})
