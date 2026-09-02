/*
 * Refreshes what the ServiceNow Store says is available, so the update list is
 * current without anyone pressing Check for updates.
 *
 * This replaces the out-of-the-box "Check Scoped App Updates" job, which ships
 * inactive and carries sys_policy = read — it is protected, so an admin cannot
 * switch it on. Activating it fails with "update failed due to security
 * constraints", which is the platform working as designed, not a misconfigured
 * instance.
 *
 * Deliberately NOT a copy of the OOTB script action. That one ends with
 * `new AppUpgrader().autoUpdates()`, which installs every application flagged
 * auto_update without anyone choosing to. Refreshing the list and installing
 * software are different decisions, and this job only does the first.
 *
 * sn_appclient.UpdateChecker is access = public, so it can be called from this
 * scope directly. No event is fired and no REST call is made.
 */
(function checkStoreUpdates() {
    var LOG = '[StoreUpdateManager] ';

    // Present since 2014, but this application is installed on instances we
    // have not seen. A named, actionable log line beats a daily stack trace.
    if (typeof sn_appclient === 'undefined' || !sn_appclient.UpdateChecker) {
        gs.error(
            LOG +
                'sn_appclient.UpdateChecker is not available on this instance, so the daily Store check ' +
                'cannot run. Deactivate this job, and use Check for updates on the Store Updates page instead.'
        );
        return;
    }

    var checker;
    try {
        checker = new sn_appclient.UpdateChecker();
    } catch (e) {
        gs.error(LOG + 'could not construct sn_appclient.UpdateChecker: ' + e);
        return;
    }

    // Refreshes sn_appclient.client_calls_allowed, ServiceNow's own kill switch
    // for instances that must not call out to the Store.
    try {
        checker.updateClientCallsPropertyFromAppRepo();
    } catch (e) {
        gs.warn(LOG + 'could not refresh the client-calls property: ' + e);
    }

    if (gs.getProperty('sn_appclient.client_calls_allowed', 'true') != 'true') {
        gs.info(LOG + 'Store calls are switched off on this instance; skipping the update check');
        return;
    }

    if (typeof checker.checkAvailableUpdates !== 'function') {
        gs.error(
            LOG +
                'sn_appclient.UpdateChecker exists but has no checkAvailableUpdates method on this release. ' +
                'Deactivate this job and raise it — the platform API has moved.'
        );
        return;
    }

    try {
        checker.checkAvailableUpdates(false, false, { forceUpdate: true });
        gs.info(LOG + 'Store update check complete');
    } catch (e) {
        gs.error(LOG + 'Store update check failed: ' + e);
    }
})();
