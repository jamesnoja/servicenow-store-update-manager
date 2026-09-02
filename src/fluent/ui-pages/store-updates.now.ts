import '@servicenow/sdk/global'
import { UiPage } from '@servicenow/sdk/core'
import storeUpdatesPage from '../../client/index.html'

/**
 * The single page for the application. Views are switched by URLSearchParams
 * (?view=updates | review | install&batch=<sys_id>) so an install in flight can
 * be linked to and reopened.
 */
export const store_updates_page = UiPage({
    $id: Now.ID['store-updates-page'],
    endpoint: 'x_301833_store_upd_store_updates.do',
    description: 'Store Update Manager - review available Store updates and install them as one batch',
    category: 'general',
    html: storeUpdatesPage,
    direct: true,
})
