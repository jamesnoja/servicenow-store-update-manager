import '@servicenow/sdk/global'
import { Property } from '@servicenow/sdk/core'

/**
 * Everything an instance might need to differ on. The application ships the
 * defaults; an admin changes the value, not the code (working agreement §8.3).
 */

Property({
    $id: Now.ID['prop-notify-users'],
    name: 'x_301833_store_upd.notify_users',
    type: 'string',
    value: '',
    description:
        'Comma-separated user names or sys_ids to notify. Leave empty to switch every notification off on this instance.',
    roles: { read: ['admin'], write: ['admin'] },
})

Property({
    $id: Now.ID['prop-notify-on-finish'],
    name: 'x_301833_store_upd.notify_on_batch_finish',
    type: 'boolean',
    value: 'true',
    description: 'Email the notify_users list when a batch install reaches a final state.',
    roles: { read: ['admin'], write: ['admin'] },
})

Property({
    $id: Now.ID['prop-digest-frequency'],
    name: 'x_301833_store_upd.digest_frequency',
    type: 'choicelist',
    choices: ['off', 'weekly', 'monthly'],
    value: 'weekly',
    description: 'How often to email a summary of the Store updates waiting on this instance.',
    roles: { read: ['admin'], write: ['admin'] },
})

Property({
    $id: Now.ID['prop-digest-min-level'],
    name: 'x_301833_store_upd.digest_min_level',
    type: 'choicelist',
    choices: ['patch', 'minor', 'major'],
    value: 'patch',
    description:
        'Lowest update level worth an email. Set to major on an instance where only breaking changes matter.',
    roles: { read: ['admin'], write: ['admin'] },
})

Property({
    $id: Now.ID['prop-hide-dependencies'],
    name: 'x_301833_store_upd.hide_dependencies_by_default',
    type: 'boolean',
    value: 'true',
    description: 'Hide applications installed as a dependency of another application when the page opens.',
    roles: { read: ['admin'], write: ['admin'] },
})

Property({
    $id: Now.ID['prop-poll-seconds'],
    name: 'x_301833_store_upd.progress_poll_seconds',
    type: 'integer',
    value: '4',
    description: 'How often the installer view re-reads progress, in seconds.',
    roles: { read: ['admin'], write: ['admin'] },
})

/**
 * Watermark for the batch-finished notifier. Not for humans to edit, but it
 * has to survive between runs and the app owns no tables.
 */
Property({
    $id: Now.ID['prop-notify-watermark'],
    name: 'x_301833_store_upd.last_notified_on',
    type: 'string',
    value: '',
    description: 'Internal. The last plan update time already emailed. Clear it to re-send the most recent runs.',
    isPrivate: true,
    roles: { read: ['admin'], write: ['admin'] },
})

Property({
    $id: Now.ID['prop-digest-watermark'],
    name: 'x_301833_store_upd.last_digest_on',
    type: 'string',
    value: '',
    description: 'Internal. When the update digest was last sent.',
    isPrivate: true,
    roles: { read: ['admin'], write: ['admin'] },
})
