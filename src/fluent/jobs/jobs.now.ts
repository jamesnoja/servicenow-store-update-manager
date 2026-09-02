import '@servicenow/sdk/global'
import { ScheduledScript } from '@servicenow/sdk/core'
import { notifyBatchFinished, notifyUpdatesAvailable } from '../../server/notify'

/**
 * The application's own update check, because the platform's cannot be used:
 * "Check Scoped App Updates" ships inactive with sys_policy = read, so
 * activating it fails on security constraints. Ours travels with the app, needs
 * no lookup by name, and can be switched off like any other job.
 *
 * Written as an included script rather than a module because it calls
 * sn_appclient.UpdateChecker through the scope prefix, which only resolves in a
 * plain server script.
 */
ScheduledScript({
    $id: Now.ID['job-check-store-updates'],
    name: 'Store Update Manager - Check for Store updates',
    active: true,
    frequency: 'daily',
    executionTime: { hours: 2, minutes: 0, seconds: 0 },
    timeZone: 'floating',
    script: Now.include('../../scripts/check-store-updates.js'),
})

/**
 * Polling rather than a business rule: sys_batch_install_plan is a platform
 * table this scope cannot write to or hang logic off, so the app watches it
 * from the outside and keeps its watermark in a property.
 */
ScheduledScript({
    $id: Now.ID['job-notify-batch-finished'],
    name: 'Store Update Manager - Notify on batch finish',
    active: true,
    frequency: 'periodically',
    executionInterval: { minutes: 10 },
    timeZone: 'floating',
    script: notifyBatchFinished,
})

/**
 * Runs weekly and lets the digest_frequency property decide whether this run
 * actually sends, so switching an instance to monthly needs no schedule change.
 */
ScheduledScript({
    $id: Now.ID['job-notify-updates-available'],
    name: 'Store Update Manager - Update digest',
    active: true,
    frequency: 'weekly',
    daysOfWeek: ['monday'],
    executionTime: { hours: 8, minutes: 0, seconds: 0 },
    timeZone: 'floating',
    script: notifyUpdatesAvailable,
})
