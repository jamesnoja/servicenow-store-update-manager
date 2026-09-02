import { api, tableUrl, withParams } from './api'

/**
 * The batch installer is out of the box. Everything useful in the sn_appclient
 * scope is package_private, so the supported surface is its scripted REST API —
 * called from here, under the operator's own session.
 *
 * Where that API lives if nothing better is found. Only a fallback — see
 * appclientBase().
 */
export const APPCLIENT_FALLBACK = '/api/sn_appclient/v1/appmanager'

export interface BaseResolution {
    base: string
    /** 'resolved' when read from the platform, 'fallback' when assumed. */
    source: 'resolved' | 'fallback'
    /** Why the fallback was used. Empty when resolved. */
    reason: string
}

let cachedBase: BaseResolution | null = null

/**
 * The base path of the sn_appclient REST API on *this* instance, read from the
 * platform rather than assumed.
 *
 * That service is versioned (`sys_ws_version`), so the `/v1/` segment is not a
 * constant across families, and assembling the path by hand has already failed
 * once — the missing `/appmanager` segment produced "Requested URI does not
 * represent any resource". `sys_ws_operation.operation_uri` holds the whole
 * path, so the base is that minus the operation's own relative path.
 */
export async function resolveAppclientBase(): Promise<BaseResolution> {
    if (cachedBase) return cachedBase

    let reason = ''

    try {
        // The operation is matched here rather than in the encoded query:
        // `relative_path=/product/install` returns nothing through the Table
        // API even though that is the stored value. Thirty rows is a cheap read
        // and the match is exact.
        const rows = await api.get<{ operation_uri: string; relative_path: string }[]>(
            tableUrl('sys_ws_operation', {
                sysparm_query: 'web_service_definition.service_id=appmanager^active=true',
                sysparm_fields: 'operation_uri,relative_path',
                sysparm_limit: 100,
                sysparm_display_value: false,
                sysparm_exclude_reference_link: true,
            })
        )

        const install = rows.find((row) => row.relative_path === '/product/install')

        if (rows.length === 0) {
            reason = 'sys_ws_operation returned no rows for the appmanager service — likely a read ACL.'
        } else if (!install) {
            reason = `Read ${rows.length} operations but none had relative_path /product/install.`
        } else if (!install.operation_uri) {
            reason = 'The Install Product operation has no operation_uri.'
        } else {
            const base = install.operation_uri.slice(
                0,
                install.operation_uri.length - install.relative_path.length
            )
            if (base.startsWith('/api/')) {
                cachedBase = { base, source: 'resolved', reason: '' }
                return cachedBase
            }
            reason = `Derived "${base}", which is not an API path.`
        }
    } catch (err) {
        reason = `sys_ws_operation could not be read: ${(err as Error).message}`
    }

    cachedBase = { base: APPCLIENT_FALLBACK, source: 'fallback', reason }
    return cachedBase
}

export async function appclientBase(): Promise<string> {
    return (await resolveAppclientBase()).base
}

/**
 * Proves the API actually answers, rather than only that a path was found.
 * `pendingbatchinstallations` takes no parameters and changes nothing.
 */
export async function probeAppclient(): Promise<{ ok: boolean; message: string }> {
    const base = await appclientBase()
    try {
        await api.get(`${base}/pendingbatchinstallations`)
        return { ok: true, message: '' }
    } catch (err) {
        return { ok: false, message: (err as Error).message }
    }
}

export type ItemState = 'ready' | 'in_progress' | 'installed' | 'failed' | 'invalid' | 'rolled_back'

export const STATE_LABEL: Record<string, string> = {
    ready: 'Queued',
    in_progress: 'Installing',
    installed: 'Installed',
    failed: 'Failed',
    invalid: 'Not applied',
    rolled_back: 'Rolled back',
}

export const REASON_LABEL: Record<string, string> = {
    ALREADY_INSTALLED: 'Already at this version',
    UNKNOWN_VERSION: 'Version not available',
    DOWNGRADE_NOT_ALLOWED: 'Downgrade not allowed',
    NO_ASSIGNED_VERSION: 'No assigned version',
    APPLICATION_UNAVAILABLE: 'Application unavailable',
    APPLICATION_DEPENDENCY_UNAVAILABLE: 'A dependency is unavailable',
    APPLICATION_DEPENDENCY_BLOCKED: 'A dependency is blocked',
    PLUGIN_DEPENDENCY_UNAVAILABLE: 'A plugin dependency is unavailable',
    SCOPE_CONFLICT_WITH_CUSTOM_APPLICATION: 'Scope conflicts with a custom application',
    OFFERING_REQUIRED: 'Requires a subscription offering',
    INSUFFICIENT_PRIVILEGE: 'Insufficient privilege',
}

export const TERMINAL_STATES: string[] = ['installed', 'failed', 'invalid', 'rolled_back']

export interface InstallPackage {
    id: string
    type: 'application'
    requested_version: string
    load_demo_data: boolean
    notes: string
}

export interface BatchItem {
    sysId: string
    appId: string
    name: string
    version: string
    state: string
    reason: string
    statusMessage: string
    updatedOn: string
}

export interface BatchPlan {
    sysId: string
    name: string
    state: string
    createdOn: string
    /** sys_rollback_context sys_id, when the platform captured one. */
    rollbackContext: string
}

interface Links {
    progress?: { id?: string }
    results?: { id?: string }
}

interface InstallResponse {
    batchInfo?: { batch_installation_id?: string; execution_tracker_id?: string; links?: Links }
    links?: Links
    trackerId?: string
    error?: string
}

/**
 * Submits one batch install plan and returns the sys_batch_install_plan sys_id.
 *
 * The plan id comes back in one of two shapes depending on the instance's
 * sn_appclient.use_queued_installation property, so both are read, and if
 * neither is present the newest running plan is claimed instead — the install
 * has already started by that point and losing track of it is the worse
 * outcome.
 */
export async function submitInstall(name: string, packages: InstallPackage[]): Promise<string> {
    const base = await appclientBase()
    const response = await api.post<InstallResponse>(`${base}/product/install`, {
        name,
        packages,
    })

    if (response?.error) throw new Error(response.error)

    const batchId =
        response?.batchInfo?.batch_installation_id ||
        response?.batchInfo?.links?.results?.id ||
        response?.links?.results?.id ||
        (await findRunningPlan())

    if (!batchId) throw new Error('The platform accepted the request but returned no batch plan.')
    return batchId
}

interface SyncStatus {
    isComplete: boolean | string
    appsSyncProgress?: string | number
    appsLastSyncTime?: string
    errorMessage?: string
}

const SYNC_POLL_MS = 2000
const SYNC_TIMEOUT_MS = 120000

/**
 * Re-checks the Store for newer versions.
 *
 * Two steps, not one: `trigger_apps_sync` starts a background worker and hands
 * back its progress id, and `get_apps_sync_status` reports on it. Calling
 * /sync_apps with no request_type throws "Unknown request type" server-side.
 *
 * The wait is real — returning as soon as the worker starts would reload the
 * list before anything had changed.
 */
export async function syncApps(onProgress?: (percent: number) => void): Promise<string> {
    const base = await appclientBase()
    const started = await api.get<{ trackerId?: string }>(
        withParams(`${base}/sync_apps`, { request_type: 'trigger_apps_sync' })
    )

    const trackerId = started?.trackerId
    if (!trackerId) throw new Error('The platform did not start a Store sync.')

    const deadline = Date.now() + SYNC_TIMEOUT_MS
    while (Date.now() < deadline) {
        await wait(SYNC_POLL_MS)

        const status = await api.get<SyncStatus>(
            withParams(`${base}/sync_apps`, {
                request_type: 'get_apps_sync_status',
                tracker_id: trackerId,
            })
        )

        if (onProgress) onProgress(Number(status?.appsSyncProgress) || 0)

        if (status?.isComplete === true || status?.isComplete === 'true') {
            if (status.errorMessage) throw new Error(status.errorMessage)
            return status.appsLastSyncTime || ''
        }
    }

    throw new Error('The Store check is taking longer than two minutes. It is still running — reload shortly.')
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/**
 * Progress is read straight off sys_batch_install_item rather than through
 * /batch/{id}: the platform's own response drops the `reason` field, and reason
 * is what tells an operator why an app was skipped.
 */
export async function listBatchItems(batchId: string): Promise<BatchItem[]> {
    const rows = await api.get<Record<string, string>[]>(
        tableUrl('sys_batch_install_item', {
            sysparm_query: `batch_install_plan=${batchId}^ORDERBYname`,
            sysparm_fields: 'sys_id,id,name,version,state,reason,status_message,sys_updated_on',
            sysparm_limit: 500,
            sysparm_display_value: false,
            sysparm_exclude_reference_link: true,
        })
    )

    return rows.map((row) => ({
        sysId: row.sys_id,
        appId: row.id,
        name: row.name || row.id,
        version: row.version,
        state: row.state,
        reason: row.reason,
        statusMessage: row.status_message,
        updatedOn: row.sys_updated_on,
    }))
}

export async function getPlan(batchId: string): Promise<BatchPlan | null> {
    try {
        const row = await api.get<Record<string, string>>(
            withParams(`/api/now/table/sys_batch_install_plan/${batchId}`, {
                sysparm_fields: 'sys_id,name,state,sys_created_on,rollback_context',
                sysparm_display_value: false,
                sysparm_exclude_reference_link: true,
            })
        )
        return {
            sysId: row.sys_id,
            name: row.name,
            state: row.state,
            createdOn: row.sys_created_on,
            rollbackContext: row.rollback_context || '',
        }
    } catch {
        return null
    }
}

export interface ScheduleApp {
    name: string
    scope: string
    source_app_id: string
    version: string
    is_store_app: boolean
    is_plugin: boolean
    load_demo_data: boolean
}

export interface BookedSchedule {
    sysId: string
    name: string
    startTime: string
}

/**
 * Books a batch for later instead of running it now — the platform's own
 * sys_installation_schedule, which is what you want on anything that is not a
 * personal instance, because an install locks the instance while it runs.
 *
 * `start_time` is parsed server-side with GlideDateTime.setDisplayValue(), so
 * it is read in the operator's own date format. The booked record is read back
 * and shown rather than trusted, because a misparse would otherwise be silent.
 */
export async function createSchedule(
    name: string,
    startTimeDisplay: string,
    apps: ScheduleApp[],
    failureStrategy: 'retry_next_day' | 'do_not_retry'
): Promise<BookedSchedule> {
    const base = await appclientBase()
    const response = await api.post<{ sys_id?: string; error?: string; schedule?: { sys_id?: string } }>(
        withParams(`${base}/schedule`, { action: 'create_schedule' }),
        {
            name,
            start_time: startTimeDisplay,
            failure_strategy: failureStrategy,
            load_demo_data: false,
            additional_args: {},
            list_of_apps: apps,
        }
    )

    if (response?.error) throw new Error(response.error)

    const scheduleId = response?.sys_id || response?.schedule?.sys_id || (await findScheduleByName(name))
    if (!scheduleId) throw new Error('The schedule was submitted but the platform returned no schedule record.')

    const booked = await readSchedule(scheduleId)
    if (!booked) throw new Error('The schedule was created but could not be read back.')
    return booked
}

async function findScheduleByName(name: string): Promise<string | null> {
    const rows = await api.get<{ sys_id: string }[]>(
        tableUrl('sys_installation_schedule', {
            sysparm_query: `name=${name}^ORDERBYDESCsys_created_on`,
            sysparm_fields: 'sys_id',
            sysparm_limit: 1,
            sysparm_display_value: false,
            sysparm_exclude_reference_link: true,
        })
    )
    return rows.length ? rows[0].sys_id : null
}

async function readSchedule(sysId: string): Promise<BookedSchedule | null> {
    try {
        const row = await api.get<Record<string, string>>(
            withParams(`/api/now/table/sys_installation_schedule/${sysId}`, {
                sysparm_fields: 'sys_id,name,start_time',
                sysparm_display_value: true,
                sysparm_exclude_reference_link: true,
            })
        )
        return { sysId: row.sys_id, name: row.name, startTime: row.start_time }
    } catch {
        return null
    }
}

export async function listSchedules(): Promise<BookedSchedule[]> {
    const rows = await api.get<Record<string, string>[]>(
        tableUrl('sys_installation_schedule', {
            sysparm_query: 'active=true^ORDERBYstart_time',
            sysparm_fields: 'sys_id,name,start_time',
            sysparm_limit: 20,
            sysparm_display_value: true,
            sysparm_exclude_reference_link: true,
        })
    )
    return rows.map((row) => ({ sysId: row.sys_id, name: row.name, startTime: row.start_time }))
}

/** The most recent plan still running, so a reopened page can rejoin it. */
export async function findRunningPlan(): Promise<string | null> {
    const rows = await api.get<{ batch_install_plan: string }[]>(
        tableUrl('sys_batch_install_item', {
            sysparm_query: 'stateINready,in_progress^ORDERBYDESCsys_updated_on',
            sysparm_fields: 'batch_install_plan',
            sysparm_limit: 1,
            sysparm_display_value: false,
            sysparm_exclude_reference_link: true,
        })
    )
    return rows.length ? rows[0].batch_install_plan : null
}
