import { api, tableUrl } from './api'

export interface AppConfig {
    hideDependencies: boolean
    pollSeconds: number
    /** e.g. "australia" — parsed from glide.war, used to warn on incompatible versions. */
    family: string
    instance: string
    /** The platform's own date+time pattern, e.g. "yyyy-MM-dd HH:mm:ss". */
    dateTimeFormat: string
    /** The zone the platform will read a typed time in — always the session user's. */
    timeZone: TimeZoneInfo
}

export interface TimeZoneInfo {
    /** IANA name when the user has set one, e.g. Australia/Sydney. Often empty. */
    name: string
    /** Current offset as rendered for this user, e.g. UTC+10:00. Empty when undeterminable. */
    offset: string
    /** True when the user set a time zone; false when they inherit the instance default. */
    explicit: boolean
}

export const FALLBACK_DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss'

export const UNKNOWN_TIME_ZONE: TimeZoneInfo = { name: '', offset: '', explicit: false }

const DEFAULTS: AppConfig = {
    hideDependencies: true,
    pollSeconds: 4,
    family: '',
    instance: '',
    dateTimeFormat: FALLBACK_DATETIME_FORMAT,
    timeZone: UNKNOWN_TIME_ZONE,
}

const NAMES = [
    'x_301833_store_upd.hide_dependencies_by_default',
    'x_301833_store_upd.progress_poll_seconds',
    'glide.war',
    'instance_name',
    'glide.sys.date_format',
    'glide.sys.time_format',
]

interface UserRow {
    date_format: string
    time_format: string
    time_zone: string
}

/**
 * One pass for every setting the page needs. Nothing here is hardcoded per
 * instance — the application ships defaults and an admin overrides them.
 */
export async function loadConfig(): Promise<AppConfig> {
    try {
        const [rows, user, offset] = await Promise.all([
            api.get<{ name: string; value: string }[]>(
                tableUrl('sys_properties', {
                    sysparm_query: `nameIN${NAMES.join(',')}`,
                    sysparm_fields: 'name,value',
                    sysparm_limit: 20,
                    sysparm_display_value: false,
                    sysparm_exclude_reference_link: true,
                })
            ),
            currentUserFormats(),
            instanceOffset(),
        ])

        const byName: Record<string, string> = {}
        rows.forEach((row) => {
            byName[row.name] = row.value
        })

        const poll = parseInt(byName['x_301833_store_upd.progress_poll_seconds'], 10)
        const date = user.date_format || byName['glide.sys.date_format'] || 'yyyy-MM-dd'
        const time = user.time_format || byName['glide.sys.time_format'] || 'HH:mm:ss'

        return {
            hideDependencies: byName['x_301833_store_upd.hide_dependencies_by_default'] !== 'false',
            pollSeconds: Number.isNaN(poll) || poll < 2 ? DEFAULTS.pollSeconds : poll,
            family: parseFamily(byName['glide.war']),
            instance: byName['instance_name'] || '',
            dateTimeFormat: safeFormat(`${date} ${time}`),
            timeZone: { name: user.time_zone || '', offset, explicit: Boolean(user.time_zone) },
        }
    } catch {
        return DEFAULTS
    }
}

/**
 * The signed-in user's own overrides, which beat the system defaults. The
 * encoded query is evaluated server-side, so no user sys_id is needed here.
 */
async function currentUserFormats(): Promise<UserRow> {
    try {
        const rows = await api.get<UserRow[]>(
            tableUrl('sys_user', {
                sysparm_query: 'user_name=javascript:gs.getUserName()',
                sysparm_fields: 'date_format,time_format,time_zone',
                sysparm_limit: 1,
                sysparm_display_value: false,
                sysparm_exclude_reference_link: true,
            })
        )
        return rows.length ? rows[0] : { date_format: '', time_format: '', time_zone: '' }
    } catch {
        return { date_format: '', time_format: '', time_zone: '' }
    }
}

/**
 * The offset the platform is currently rendering times at *for this user*.
 * sys_user.time_zone and glide.sys.default.tz are both routinely empty, so it
 * is worked out rather than read: the Table API returns the same timestamp raw
 * (UTC) and as a display value (the session user's zone), and the gap between
 * them is the offset.
 */
async function instanceOffset(): Promise<string> {
    try {
        const rows = await api.get<{ sys_updated_on: { value: string; display_value: string } }[]>(
            tableUrl('sys_properties', {
                sysparm_query: 'name=glide.sys.date_format',
                sysparm_fields: 'sys_updated_on',
                sysparm_limit: 1,
                sysparm_display_value: 'all',
                sysparm_exclude_reference_link: true,
            })
        )
        if (rows.length === 0) return ''

        const utc = Date.parse(`${rows[0].sys_updated_on.value.replace(' ', 'T')}Z`)
        const local = Date.parse(`${rows[0].sys_updated_on.display_value.replace(' ', 'T')}Z`)
        if (Number.isNaN(utc) || Number.isNaN(local)) return ''

        const minutes = Math.round((local - utc) / 60000)
        const sign = minutes < 0 ? '-' : '+'
        const abs = Math.abs(minutes)
        return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
    } catch {
        return ''
    }
}

function pad(value: number): string {
    return String(value).padStart(2, '0')
}

/**
 * One sentence naming the zone a typed time will be read in. It is always the
 * signed-in user's zone — the platform parses with
 * GlideDateTime.setDisplayValue(), which uses the session user's. Where they
 * have not set one, that resolves to the instance default, and saying so is
 * more useful than pretending they chose it.
 */
export function describeTimeZone(zone: TimeZoneInfo): string {
    if (zone.explicit) {
        const suffix = zone.offset ? ` (${zone.offset})` : ''
        return `Read in your time zone, ${zone.name}${suffix}.`
    }
    if (zone.offset) {
        return `Read in your time zone — you have not set one, so the instance default applies, currently ${zone.offset}.`
    }
    return 'Read in your time zone.'
}

/** "glide-australia-02-11-2026__patch3-..." -> "australia" */
function parseFamily(war: string): string {
    if (!war) return ''
    const match = /^glide-([a-z]+)-/i.exec(war)
    return match ? match[1].toLowerCase() : ''
}

/**
 * ServiceNow stores Java patterns; the date picker reads Unicode/date-fns ones.
 * The tokens below mean the same thing in both. Anything else and the pattern
 * is not used at all — a wrong format would produce a date the platform
 * misreads, which is worse than not matching the operator's preference.
 */
const KNOWN_TOKENS = /yyyy|yy|MMMM|MMM|MM|dd|EEEE|EEE|HH|hh|mm|ss|a/g

export function safeFormat(pattern: string): string {
    const residue = pattern.replace(KNOWN_TOKENS, '').replace(/[\s\-/.:,]/g, '')
    return residue.length === 0 ? pattern : FALLBACK_DATETIME_FORMAT
}

/**
 * Version records list the families they support as "Australia;Zurich;".
 * An empty list means the Store did not say, which is not the same as "no".
 */
export function isCompatible(compatibilities: string, family: string): boolean | null {
    if (!compatibilities || !family) return null
    const listed = compatibilities
        .split(';')
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry.length > 0)
    if (listed.length === 0) return null
    return listed.indexOf(family) !== -1
}
