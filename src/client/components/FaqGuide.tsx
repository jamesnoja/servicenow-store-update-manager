import React from 'react'
import GuideLayout, { Question } from './GuideLayout'

const REASONS = [
    ['Already at this version', 'ALREADY_INSTALLED', 'Something else installed it first. Harmless.'],
    ['Version not available', 'UNKNOWN_VERSION', 'The Store no longer offers that version. Re-check for updates.'],
    ['Downgrade not allowed', 'DOWNGRADE_NOT_ALLOWED', 'The chosen version is older than what is installed.'],
    ['A dependency is unavailable', 'APPLICATION_DEPENDENCY_UNAVAILABLE', 'Install the dependency first.'],
    ['Requires a subscription offering', 'OFFERING_REQUIRED', 'The instance is not entitled to this application.'],
    ['Insufficient privilege', 'INSUFFICIENT_PRIVILEGE', 'The caller is not an admin.'],
]

export default function FaqGuide({ onBack }: { onBack: () => void }) {
    return (
        <GuideLayout
            title="Frequently asked questions"
            subtitle="What the screens mean, and the honest limits."
            onBack={onBack}
        >
            <Question q="Why is there no list of what changed in a version?">
                <p>
                    Because the instance does not hold one. Each version record carries the application's standing
                    description — the same sentence on every release — and the manifest field is empty. Rather than
                    dress that up, the detail panel shows what is genuinely per-version: the ladder of releases you
                    are jumping over, each one's publish date, what it pulls in as a dependency, and whether it
                    lists this release family as supported.
                </p>
                <p>Release notes live on the Store listing itself, outside the instance.</p>
            </Question>

            <Question q="What is the difference between Not applied and Failed?">
                <p>
                    <strong>Not applied</strong> means the platform declined before doing anything — usually because
                    the application was already at that version. Nothing changed and nothing is broken.{' '}
                    <strong>Failed</strong> means it tried and could not finish. Only the second one needs you.
                </p>
            </Question>

            <Question q="What do the reasons mean?">
                <div className="sum-guide__tablewrap">
                    <table className="sum-table">
                        <thead>
                            <tr>
                                <th scope="col">Shown as</th>
                                <th scope="col">Platform code</th>
                                <th scope="col">What to do</th>
                            </tr>
                        </thead>
                        <tbody>
                            {REASONS.map(([shown, code, action]) => (
                                <tr key={code}>
                                    <td>{shown}</td>
                                    <td>
                                        <code>{code}</code>
                                    </td>
                                    <td className="sum-table__detail">{action}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Question>

            <Question q="Why are some applications hidden?">
                <p>
                    Applications installed as a dependency of something else are hidden by default — on a typical
                    instance that is around a third of the list. They are updated as part of whatever pulled them
                    in, so updating them by hand is usually noise. Untick{' '}
                    <strong>Hide apps installed as dependencies</strong> to see them, or change the default with the{' '}
                    <code>hide_dependencies_by_default</code> property.
                </p>
            </Question>

            <Question q="Can someone without the admin role use this?">
                <p>
                    No, and that is deliberate rather than an oversight. The platform's install API explicitly
                    refuses a caller holding only <code>sn_appclient.app_client_company_installer</code>. A
                    delegated role would show somebody a page they could not act on.
                </p>
            </Question>

            <Question q="Does it create any tables of its own?">
                <p>
                    None. The update list is derived at read time from <code>sys_store_app</code> and{' '}
                    <code>sys_app_version</code>; history is the platform's own <code>sys_batch_install_plan</code>{' '}
                    and <code>sys_batch_install_item</code>. The only state the application owns is a handful of
                    system properties, two of which are watermarks for the notification jobs.
                </p>
            </Question>

            <Question q="What happens if I close the page while an install is running?">
                <p>
                    Nothing stops. The install runs on the instance, not in the browser. The batch id is in the URL,
                    so that link reopens the same run; if you have lost it, the updates page shows a banner while
                    any batch is still going and offers to take you back to it.
                </p>
            </Question>

            <Question q="Can I undo an install?">
                <p>
                    Sometimes. When the platform captures a rollback context for a run, the finished install shows a{' '}
                    <strong>Roll back this batch</strong> link that opens ServiceNow's own rollback screen. The
                    rollback itself is the platform's, not ours — we only surface it. Not every run gets one.
                </p>
            </Question>

            <Question q="What time zone is a scheduled install booked in?">
                <p>
                    Yours. The platform reads the start time with{' '}
                    <code>GlideDateTime.setDisplayValue()</code>, which parses in the signed-in user's time zone —
                    so the time you pick is the wall-clock time <em>you</em> mean, and nothing is converted on the
                    way. The dialog says which zone that is.
                </p>
                <p>
                    If you have not set a personal time zone on your user record, yours resolves to the instance
                    default, and the dialog says that too rather than pretending you chose it.
                </p>
                <p>
                    The picker is also handed your own date format, so what it produces is exactly what the
                    platform expects to read. The confirmation still shows the time as the platform{' '}
                    <em>stored</em> it — that is the only real proof. If the two disagree, delete the schedule from{' '}
                    <strong>Scheduled Installs</strong> and book it again.
                </p>
            </Question>

            <Question q="Who receives the emails?">
                <p>
                    Whoever is listed in <code>x_301833_store_upd.notify_users</code> on that instance, and nobody
                    otherwise. Recipients are resolved when the notification fires rather than baked into the
                    application, so the same build can be installed everywhere and each instance decides for
                    itself.
                </p>
            </Question>

            <Question q="Does the digest email tell me about every update?">
                <p>
                    It counts everything by level, but <code>digest_min_level</code> decides whether a run is worth
                    an email at all. On an instance where only breaking changes matter, set it to{' '}
                    <code>major</code> and the weekly patch churn stops arriving.
                </p>
            </Question>

            <Question q="Why does the update list sometimes not change for days?">
                <p>
                    Check <strong>Scheduled Jobs</strong>. The daily{' '}
                    <strong>Store Update Manager - Check for Store updates</strong> job ships active, so the usual
                    cause is that someone switched it off. The page shows a banner offering to turn it back on, and
                    always says when the catalogue was last refreshed.
                </p>
            </Question>

            <Question q="Why ship a check job instead of using the platform's?">
                <p>
                    Because the platform's cannot be used. <strong>Check Scoped App Updates</strong> ships inactive
                    and carries <code>sys_policy = read</code>, so activating it fails with{' '}
                    <em>update failed due to security constraints</em> however senior the account. Ours travels with
                    the application: present on every instance, no lookup needed, editable like any other job.
                </p>
                <p>
                    It is also not a copy of it. The platform's script action ends by calling{' '}
                    <code>AppUpgrader().autoUpdates()</code>, which installs every application flagged{' '}
                    <code>auto_update</code> with nobody pressing anything. This job refreshes the catalogue and
                    stops there — what gets installed stays a decision someone makes on the page.
                </p>
            </Question>
        </GuideLayout>
    )
}
