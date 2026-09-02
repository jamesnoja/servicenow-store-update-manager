import { api, tableUrl, withParams } from './api'
import { compareVersions, updateLevel, UpdateLevel } from '../utils/version'

/**
 * Our own daily check, shipped with the application and active out of the box.
 *
 * The platform's equivalent, "Check Scoped App Updates", cannot be used: it
 * ships inactive and carries sys_policy = read, so switching it on fails with a
 * security-constraint error however much of an admin you are. Ours travels in
 * the app, so the name is ours and always present.
 */
export const UPDATE_CHECK_JOB_NAME = 'Store Update Manager - Check for Store updates'

export interface StoreApp {
    sysId: string
    name: string
    scope: string
    installed: string
    latest: string
    level: UpdateLevel
    dependency: boolean
    needsLicensing: boolean
}

export interface AppVersion {
    version: string
    publishDate: string
    blocked: boolean
    blockMessage: string
    /** Comma-separated 'scope:version' pairs this release pulls in. */
    dependencies: string
    /** Semicolon-separated family names, e.g. 'Australia;Zurich;'. Often empty. */
    compatibilities: string
}

interface StoreAppRow {
    sys_id: string
    name: string
    scope: string
    version: string
    latest_version: string
    installed_as_dependency: string
    needs_app_engine_licensing: string
}

interface VersionRow {
    source_app_id: string
    version: string
    publish_date: string
    block_install: string
    block_message: string
    dependencies: string
    compatibilities: string
}

const isTrue = (value: string) => value === 'true' || value === '1'

/**
 * Every store app with a newer version available. One call, one pass — the
 * update level is derived here rather than stored anywhere.
 */
export async function listUpdates(): Promise<StoreApp[]> {
    const rows = await api.get<StoreAppRow[]>(
        tableUrl('sys_store_app', {
            sysparm_query: 'update_available=true^active=true^ORDERBYname',
            sysparm_fields:
                'sys_id,name,scope,version,latest_version,installed_as_dependency,needs_app_engine_licensing',
            sysparm_limit: 2000,
            sysparm_display_value: false,
            sysparm_exclude_reference_link: true,
        })
    )

    return rows
        .filter((row) => row.latest_version && compareVersions(row.version, row.latest_version) < 0)
        .map((row) => ({
            sysId: row.sys_id,
            name: row.name,
            scope: row.scope,
            installed: row.version,
            latest: row.latest_version,
            level: updateLevel(row.version, row.latest_version),
            dependency: isTrue(row.installed_as_dependency),
            needsLicensing: isTrue(row.needs_app_engine_licensing),
        }))
}

/**
 * Every version newer than what is installed, for a set of apps, in as few
 * calls as the URL length allows — one query per 50 applications, not one per
 * application.
 */
export async function listVersions(apps: StoreApp[]): Promise<Record<string, AppVersion[]>> {
    const installedBy: Record<string, string> = {}
    apps.forEach((app) => {
        installedBy[app.sysId] = app.installed
    })

    const chunks: string[][] = []
    const ids = apps.map((app) => app.sysId)
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50))

    const pages = await Promise.all(
        chunks.map((chunk) =>
            api.get<VersionRow[]>(
                tableUrl('sys_app_version', {
                    sysparm_query: `source_app_idIN${chunk.join(',')}`,
                    sysparm_fields:
                        'source_app_id,version,publish_date,block_install,block_message,dependencies,compatibilities',
                    sysparm_limit: 2000,
                    sysparm_display_value: false,
                    sysparm_exclude_reference_link: true,
                })
            )
        )
    )

    const byApp: Record<string, AppVersion[]> = {}
    const seen = new Set<string>()

    pages.flat().forEach((row) => {
        const appId = row.source_app_id
        const installed = installedBy[appId]
        if (installed === undefined) return
        if (compareVersions(installed, row.version) >= 0) return

        const key = `${appId}:${row.version}`
        if (seen.has(key)) return
        seen.add(key)

        if (!byApp[appId]) byApp[appId] = []
        byApp[appId].push({
            version: row.version,
            publishDate: row.publish_date,
            blocked: isTrue(row.block_install),
            blockMessage: row.block_message,
            dependencies: row.dependencies,
            compatibilities: row.compatibilities,
        })
    })

    Object.keys(byApp).forEach((appId) => {
        byApp[appId].sort((a, b) => compareVersions(b.version, a.version))
    })

    return byApp
}

/**
 * When the Store catalogue was last refreshed. The platform stamps the sync
 * itself, which is a straighter answer than the newest version row — a version
 * row only appears when something actually changed.
 */
export async function lastRefreshed(): Promise<string | null> {
    const stamped = await api
        .get<{ value: string }[]>(
            tableUrl('sys_properties', {
                sysparm_query: 'name=sn_appclient.apps_last_sync_time',
                sysparm_fields: 'value',
                sysparm_limit: 1,
                sysparm_display_value: false,
                sysparm_exclude_reference_link: true,
            })
        )
        .catch(() => [] as { value: string }[])

    if (stamped.length && stamped[0].value) return stamped[0].value

    const rows = await api.get<{ sys_created_on: string }[]>(
        tableUrl('sys_app_version', {
            sysparm_query: 'ORDERBYDESCsys_created_on',
            sysparm_fields: 'sys_created_on',
            sysparm_limit: 1,
            sysparm_display_value: true,
        })
    )
    return rows.length ? rows[0].sys_created_on : null
}

export interface UpdateCheckJob {
    sysId: string
    name: string
    active: boolean
}

export async function getUpdateCheckJob(): Promise<UpdateCheckJob | null> {
    try {
        const rows = await api.get<{ sys_id: string; active: string; name: string }[]>(
            tableUrl('sysauto_script', {
                sysparm_query: `name=${UPDATE_CHECK_JOB_NAME}`,
                sysparm_fields: 'sys_id,active,name',
                sysparm_limit: 1,
                sysparm_display_value: false,
                sysparm_exclude_reference_link: true,
            })
        )
        if (rows.length === 0) return null
        return { sysId: rows[0].sys_id, name: rows[0].name, active: isTrue(rows[0].active) }
    } catch {
        return null
    }
}

export async function setUpdateCheckJobActive(sysId: string, active: boolean): Promise<void> {
    await api.patch(withParams(`/api/now/table/sysauto_script/${sysId}`, {}), { active })
}
