import { api, tableUrl } from './api'
import { probeAppclient, resolveAppclientBase } from './AppClientService'
import { AppConfig } from './ConfigService'

export type CheckStatus = 'positive' | 'warning' | 'critical'

export interface Check {
    name: string
    status: CheckStatus
    detail: string
    /** What to do about it. Empty when nothing needs doing. */
    action: string
}

const JOBS = [
    'Store Update Manager - Check for Store updates',
    'Store Update Manager - Notify on batch finish',
    'Store Update Manager - Update digest',
]

/**
 * A preflight for an instance nobody has run this on before. Every check is a
 * read; nothing here changes anything.
 */
export async function runDiagnostics(config: AppConfig): Promise<Check[]> {
    const results = await Promise.all([
        checkTable('sys_store_app', 'Store applications', 'update_available=true^active=true'),
        checkTable('sys_app_version', 'Version catalogue', ''),
        checkTable('sys_batch_install_plan', 'Batch install plans', ''),
        checkApi(),
        checkJobs(),
        checkProperty(
            'sn_appclient.client_calls_allowed',
            'Store connectivity',
            'true',
            'Calls to the ServiceNow Store are switched off on this instance, so update checks cannot run.'
        ),
        checkNotifyUsers(),
    ])

    return results.concat(describeEnvironment(config))
}

async function checkTable(table: string, name: string, query: string): Promise<Check> {
    try {
        const rows = await api.get<{ sys_id: string }[]>(
            tableUrl(table, {
                sysparm_query: query,
                sysparm_fields: 'sys_id',
                sysparm_limit: 1,
                sysparm_display_value: false,
                sysparm_exclude_reference_link: true,
            })
        )
        if (rows.length === 0 && table === 'sys_app_version') {
            return {
                name,
                status: 'warning',
                detail: `${table} is readable but empty.`,
                action: 'Press Check for updates once so the version picker has something to offer.',
            }
        }
        return { name, status: 'positive', detail: `${table} is readable.`, action: '' }
    } catch (err) {
        return {
            name,
            status: 'critical',
            detail: `${table} could not be read: ${(err as Error).message}`,
            action: 'Confirm you hold the admin role on this instance.',
        }
    }
}

/**
 * Two questions, not one: where the API is, and whether it answers. The second
 * is what actually matters — a path found by falling back to the default is
 * fine if calls to it succeed.
 */
async function checkApi(): Promise<Check> {
    const resolution = await resolveAppclientBase()
    const probe = await probeAppclient()

    if (!probe.ok) {
        return {
            name: 'Application Manager API',
            status: 'critical',
            detail: `${resolution.base} did not answer: ${probe.message}`,
            action: 'Installing and Check for updates will both fail. Confirm the AppManager scripted REST API exists on this instance.',
        }
    }

    if (resolution.source === 'fallback') {
        return {
            name: 'Application Manager API',
            status: 'positive',
            detail: `Working at ${resolution.base}, though the path could not be read from the platform. ${resolution.reason}`,
            action: 'Nothing — the default path answers. Worth reporting if this instance is on a different family.',
        }
    }

    return {
        name: 'Application Manager API',
        status: 'positive',
        detail: `Resolved to ${resolution.base} and answering.`,
        action: '',
    }
}

async function checkJobs(): Promise<Check> {
    try {
        const rows = await api.get<{ name: string; active: string }[]>(
            tableUrl('sysauto_script', {
                sysparm_query: 'nameSTARTSWITHStore Update Manager -',
                sysparm_fields: 'name,active',
                sysparm_limit: 10,
                sysparm_display_value: false,
                sysparm_exclude_reference_link: true,
            })
        )

        const missing = JOBS.filter((job) => !rows.some((row) => row.name === job))
        const inactive = rows.filter((row) => row.active !== 'true').map((row) => row.name)

        if (missing.length > 0) {
            return {
                name: 'Scheduled jobs',
                status: 'critical',
                detail: `${missing.length} of ${JOBS.length} jobs are missing: ${missing.join(', ')}.`,
                action: 'Reinstall the application — these ship with it.',
            }
        }
        if (inactive.length > 0) {
            return {
                name: 'Scheduled jobs',
                status: 'warning',
                detail: `Switched off: ${inactive.join(', ')}.`,
                action: 'Activate them from Scheduled Jobs unless they were switched off deliberately.',
            }
        }
        return { name: 'Scheduled jobs', status: 'positive', detail: 'All three present and active.', action: '' }
    } catch (err) {
        return {
            name: 'Scheduled jobs',
            status: 'critical',
            detail: `sysauto_script could not be read: ${(err as Error).message}`,
            action: 'Confirm you hold the admin role on this instance.',
        }
    }
}

async function checkProperty(name: string, label: string, expected: string, badNews: string): Promise<Check> {
    const value = await readProperty(name)
    if (value === null) {
        return {
            name: label,
            status: 'warning',
            detail: `${name} is not set on this instance.`,
            action: 'Usually fine — the platform default applies.',
        }
    }
    if (value !== expected) {
        return { name: label, status: 'warning', detail: badNews, action: `Set ${name} to ${expected}.` }
    }
    return { name: label, status: 'positive', detail: `${name} is ${value}.`, action: '' }
}

async function checkNotifyUsers(): Promise<Check> {
    const value = await readProperty('x_301833_store_upd.notify_users')
    if (!value) {
        return {
            name: 'Notification recipients',
            status: 'warning',
            detail: 'x_301833_store_upd.notify_users is empty, so no email will ever be sent.',
            action: 'Set it in Properties if you want notifications on this instance. Empty is a valid choice.',
        }
    }
    return {
        name: 'Notification recipients',
        status: 'positive',
        detail: `Notifying: ${value}`,
        action: '',
    }
}

async function readProperty(name: string): Promise<string | null> {
    try {
        const rows = await api.get<{ value: string }[]>(
            tableUrl('sys_properties', {
                sysparm_query: `name=${name}`,
                sysparm_fields: 'value',
                sysparm_limit: 1,
                sysparm_display_value: false,
                sysparm_exclude_reference_link: true,
            })
        )
        return rows.length ? rows[0].value : null
    } catch {
        return null
    }
}

/** Not pass or fail — what the page worked out about this instance. */
function describeEnvironment(config: AppConfig): Check[] {
    return [
        {
            name: 'Release family',
            status: config.family ? 'positive' : 'warning',
            detail: config.family
                ? `Detected ${config.family}, used to warn about incompatible versions.`
                : 'Could not be parsed from glide.war; version compatibility warnings are switched off.',
            action: '',
        },
        {
            name: 'Date format and time zone',
            status: 'positive',
            detail: `Scheduling uses ${config.dateTimeFormat}${
                config.timeZone.offset ? `, read at ${config.timeZone.offset}` : ''
            }${config.timeZone.explicit ? ` (${config.timeZone.name})` : ' (instance default)'}.`,
            action: '',
        },
    ]
}
