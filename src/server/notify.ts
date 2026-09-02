import { gs, GlideRecord, GlideDateTime } from '@servicenow/glide'

const P = {
    users: 'x_301833_store_upd.notify_users',
    onFinish: 'x_301833_store_upd.notify_on_batch_finish',
    digestFrequency: 'x_301833_store_upd.digest_frequency',
    digestMinLevel: 'x_301833_store_upd.digest_min_level',
    lastNotified: 'x_301833_store_upd.last_notified_on',
    lastDigest: 'x_301833_store_upd.last_digest_on',
}

const EVENT_BATCH_FINISHED = 'x_301833_store_upd.batch_finished'
const EVENT_UPDATES_READY = 'x_301833_store_upd.updates_ready'

const TERMINAL = 'installed,failed,invalid,rolled_back,partial_install'

/**
 * Duplicated from src/client/utils/version.ts on purpose: server modules and
 * the browser bundle are compiled separately and cannot share a file. Fifteen
 * lines in two places beats a bridge script include.
 */
function parts(version: string): number[] {
    return String(version || '')
        .split('.')
        .map((segment) => {
            const parsed = parseInt(segment, 10)
            return isNaN(parsed) ? 0 : parsed
        })
}

function isNewer(installed: string, candidate: string): boolean {
    const a = parts(installed)
    const b = parts(candidate)
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const diff = (b[i] || 0) - (a[i] || 0)
        if (diff !== 0) return diff > 0
    }
    return false
}

function levelOf(installed: string, target: string): string {
    const a = parts(installed)
    const b = parts(target)
    if ((b[0] || 0) !== (a[0] || 0)) return 'major'
    if ((b[1] || 0) !== (a[1] || 0)) return 'minor'
    return 'patch'
}

/** Resolves the notify_users property to sys_user sys_ids. Names or sys_ids both work. */
function recipients(): string[] {
    const raw = gs.getProperty(P.users, '') || ''
    const wanted = raw
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)

    if (wanted.length === 0) return []

    const found: string[] = []
    const user = new GlideRecord('sys_user')
    user.addQuery('active', true)
    user.addEncodedQuery('user_nameIN' + wanted.join(',') + '^ORsys_idIN' + wanted.join(','))
    user.query()
    while (user.next()) found.push(user.getUniqueValue())

    if (found.length === 0) gs.warn('[StoreUpdateManager] notify_users is set but matched no active user: ' + raw)
    return found
}

function instanceName(): string {
    return gs.getProperty('instance_name', '') || gs.getProperty('glide.servlet.uri', '')
}

/**
 * Emails the notify_users list once a batch install reaches a final state.
 * The app owns no tables, so a property carries the watermark.
 */
export function notifyBatchFinished(): void {
    if (gs.getProperty(P.onFinish, 'true') !== 'true') return

    const people = recipients()
    if (people.length === 0) return

    const watermark = gs.getProperty(P.lastNotified, '')
    const highest = new GlideDateTime()

    const plan = new GlideRecord('sys_batch_install_plan')
    plan.addEncodedQuery('stateIN' + TERMINAL)
    if (watermark) plan.addEncodedQuery('sys_updated_on>' + watermark)
    plan.orderBy('sys_updated_on')
    plan.setLimit(50)
    plan.query()

    let sent = 0
    while (plan.next()) {
        const summary = describePlan(plan.getUniqueValue(), plan.getValue('name'), plan.getValue('state'))
        people.forEach((userId) => {
            gs.eventQueue(EVENT_BATCH_FINISHED, plan, userId, summary)
            sent++
        })
        highest.setDisplayValueInternal(plan.getValue('sys_updated_on'))
    }

    if (sent > 0) {
        gs.setProperty(P.lastNotified, highest.getValue())
        gs.info('[StoreUpdateManager] queued ' + sent + ' batch-finished notifications')
    }
}

function describePlan(planId: string, name: string, state: string): string {
    const counts: { [key: string]: number } = {}
    const detail: string[] = []

    const item = new GlideRecord('sys_batch_install_item')
    item.addQuery('batch_install_plan', planId)
    item.orderBy('name')
    item.setLimit(500)
    item.query()
    while (item.next()) {
        const itemState = item.getValue('state') || 'unknown'
        counts[itemState] = (counts[itemState] || 0) + 1
        if (itemState !== 'installed') {
            detail.push(
                '<li>' +
                    item.getValue('name') +
                    ' ' +
                    (item.getValue('version') || '') +
                    ' &mdash; ' +
                    itemState +
                    (item.getValue('reason') ? ' (' + item.getValue('reason') + ')' : '') +
                    '</li>'
            )
        }
    }

    let html =
        '<p><strong>' +
        name +
        '</strong> finished on ' +
        instanceName() +
        ' with state <strong>' +
        state +
        '</strong>.</p><p>' +
        (counts['installed'] || 0) +
        ' installed, ' +
        (counts['invalid'] || 0) +
        ' not applied, ' +
        (counts['failed'] || 0) +
        ' failed.</p>'

    if (detail.length > 0) html += '<p>Applications that did not install:</p><ul>' + detail.join('') + '</ul>'
    return html
}

/**
 * A periodic summary of what is waiting. Runs weekly; the digest_frequency
 * property decides whether a given run actually sends.
 */
export function notifyUpdatesAvailable(): void {
    const frequency = gs.getProperty(P.digestFrequency, 'weekly')
    if (frequency === 'off') return

    const last = gs.getProperty(P.lastDigest, '')
    if (last && !dueAgain(last, frequency)) return

    const people = recipients()
    if (people.length === 0) return

    const minLevel = gs.getProperty(P.digestMinLevel, 'patch')
    const rank: { [key: string]: number } = { patch: 0, minor: 1, major: 2 }
    const counts = { major: 0, minor: 0, patch: 0 }
    let carrier = ''
    let carrierRank = -1

    const app = new GlideRecord('sys_store_app')
    app.addEncodedQuery('update_available=true^active=true')
    app.setLimit(2000)
    app.query()
    while (app.next()) {
        const installed = app.getValue('version')
        const latest = app.getValue('latest_version')
        if (!latest || !isNewer(installed, latest)) continue

        const level = levelOf(installed, latest)
        counts[level]++
        if (rank[level] > carrierRank) {
            carrierRank = rank[level]
            carrier = app.getUniqueValue()
        }
    }

    const reportable = Object.keys(counts).filter((level) => rank[level] >= rank[minLevel])
    const total = reportable.reduce((sum, level) => sum + counts[level], 0)

    gs.setProperty(P.lastDigest, new GlideDateTime().getValue())
    if (total === 0 || !carrier) return

    const summary =
        '<p><strong>' +
        total +
        '</strong> Store ' +
        (total === 1 ? 'application has' : 'applications have') +
        ' a newer version available on ' +
        instanceName() +
        '.</p><ul><li>' +
        counts.major +
        ' major</li><li>' +
        counts.minor +
        ' minor</li><li>' +
        counts.patch +
        ' patch</li></ul>'

    const carrierGr = new GlideRecord('sys_store_app')
    if (!carrierGr.get(carrier)) return

    people.forEach((userId) => gs.eventQueue(EVENT_UPDATES_READY, carrierGr, userId, summary))
    gs.info('[StoreUpdateManager] queued update digest for ' + people.length + ' recipients')
}

function dueAgain(last: string, frequency: string): boolean {
    const previous = new GlideDateTime(last)
    const now = new GlideDateTime()
    const elapsedDays = (now.getNumericValue() - previous.getNumericValue()) / 86400000
    return frequency === 'monthly' ? elapsedDays >= 28 : elapsedDays >= 7
}
