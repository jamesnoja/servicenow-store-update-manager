import '@servicenow/sdk/global'
import { ApplicationMenu, Record } from '@servicenow/sdk/core'

/**
 * Admin only, deliberately. The install itself runs through
 * POST /api/sn_appclient/product/install, which refuses a caller holding only
 * sn_appclient.app_client_company_installer, so a delegated installer role
 * would show the page to someone who could not use it.
 */
const ROLES = ['admin']

const menu = ApplicationMenu({
    $id: Now.ID['store-update-menu'],
    title: 'Store Update Manager',
    hint: 'Review and batch-install available ServiceNow Store updates',
    description: 'Lists installed Store applications with a newer version available and installs them as one batch.',
    roles: ROLES,
    active: true,
})

Record({
    $id: Now.ID['store-update-module-updates'],
    table: 'sys_app_module',
    data: {
        title: 'Store Updates',
        application: menu,
        link_type: 'DIRECT',
        query: 'x_301833_store_upd_store_updates.do',
        hint: 'Choose which Store applications to update',
        roles: ROLES,
        active: true,
        order: 100,
    },
})

Record({
    $id: Now.ID['store-update-module-history'],
    table: 'sys_app_module',
    data: {
        title: 'Install History',
        application: menu,
        link_type: 'LIST',
        name: 'sys_batch_install_plan',
        hint: 'Every batch install plan the platform has recorded, whoever submitted it',
        roles: ROLES,
        active: true,
        order: 200,
    },
})

Record({
    $id: Now.ID['store-update-module-items'],
    table: 'sys_app_module',
    data: {
        title: 'Install Results',
        application: menu,
        link_type: 'LIST',
        name: 'sys_batch_install_item',
        hint: 'Per-application outcome of every batch install, including the reason it was skipped',
        roles: ROLES,
        active: true,
        order: 300,
    },
})

Record({
    $id: Now.ID['store-update-module-separator'],
    table: 'sys_app_module',
    data: {
        title: 'Reference',
        application: menu,
        link_type: 'SEPARATOR',
        roles: ROLES,
        active: true,
        order: 400,
    },
})

Record({
    $id: Now.ID['store-update-module-apps'],
    table: 'sys_app_module',
    data: {
        title: 'Applications With Updates',
        application: menu,
        link_type: 'FILTER',
        name: 'sys_store_app',
        filter: 'update_available=true^active=true^ORDERBYname',
        hint: 'The same set as the page, as a standard list',
        roles: ROLES,
        active: true,
        order: 500,
    },
})

Record({
    $id: Now.ID['store-update-module-setup'],
    table: 'sys_app_module',
    data: {
        title: 'Setup Guide',
        application: menu,
        link_type: 'DIRECT',
        query: 'x_301833_store_upd_store_updates.do?view=setup',
        hint: 'What a new instance needs, in order',
        roles: ROLES,
        active: true,
        order: 600,
    },
})

Record({
    $id: Now.ID['store-update-module-faq'],
    table: 'sys_app_module',
    data: {
        title: 'FAQ',
        application: menu,
        link_type: 'DIRECT',
        query: 'x_301833_store_upd_store_updates.do?view=faq',
        hint: 'What the screens mean, and the honest limits',
        roles: ROLES,
        active: true,
        order: 700,
    },
})

Record({
    $id: Now.ID['store-update-module-diagnostics'],
    table: 'sys_app_module',
    data: {
        title: 'Diagnostics',
        application: menu,
        link_type: 'DIRECT',
        query: 'x_301833_store_upd_store_updates.do?view=diagnostics',
        hint: 'What this application can see on this instance. Read-only.',
        roles: ROLES,
        active: true,
        order: 750,
    },
})

Record({
    $id: Now.ID['store-update-module-check-job'],
    table: 'sys_app_module',
    data: {
        title: 'Scheduled Jobs',
        application: menu,
        link_type: 'FILTER',
        name: 'sysauto_script',
        // Matched on name rather than dot-walking sys_scope: sys_scope is
        // defined on sys_metadata rather than on sysauto_script itself, and the
        // dot-walk came back empty in the list view even though the same query
        // returns all three jobs through the Table API. The names ship with the
        // application, so this is stable everywhere it is installed.
        filter: 'nameSTARTSWITHStore Update Manager -^ORDERBYname',
        hint: 'The daily Store check and the two notification jobs, all shipped with this application',
        roles: ROLES,
        active: true,
        order: 800,
    },
})

Record({
    $id: Now.ID['store-update-module-schedules'],
    table: 'sys_app_module',
    data: {
        title: 'Scheduled Installs',
        application: menu,
        link_type: 'LIST',
        name: 'sys_installation_schedule',
        hint: 'Batches booked for a later window',
        roles: ROLES,
        active: true,
        order: 900,
    },
})

/**
 * The six settings that make this application portable. Filtered by prefix
 * rather than listed by sys_id so a new property appears here automatically.
 */
Record({
    $id: Now.ID['store-update-module-properties'],
    table: 'sys_app_module',
    data: {
        title: 'Properties',
        application: menu,
        link_type: 'FILTER',
        name: 'sys_properties',
        filter: 'nameSTARTSWITHx_301833_store_upd^ORDERBYname',
        hint: 'Notification recipients, digest cadence and page defaults for this instance',
        roles: ROLES,
        active: true,
        order: 1000,
    },
})
