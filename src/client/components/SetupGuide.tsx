import React from 'react'
import GuideLayout, { Step } from './GuideLayout'

const PROPERTIES = [
    ['notify_users', 'Comma-separated user names or sys_ids. Empty means no email is ever sent.', ''],
    ['notify_on_batch_finish', 'Email when a batch install reaches a final state.', 'true'],
    ['digest_frequency', 'off, weekly or monthly summary of what is waiting.', 'weekly'],
    ['digest_min_level', 'Lowest level worth an email: patch, minor or major.', 'patch'],
    ['hide_dependencies_by_default', 'Hide apps installed as a dependency when the page opens.', 'true'],
    ['progress_poll_seconds', 'How often the installer view re-reads progress.', '4'],
]

export default function SetupGuide({ onBack }: { onBack: () => void }) {
    return (
        <GuideLayout
            title="Setup guide"
            subtitle="Everything a new instance needs, in order. About ten minutes."
            onBack={onBack}
        >
            <p className="sum-guide__lead">
                Store Update Manager is a thin front end over machinery ServiceNow already ships. It creates no
                tables and writes nothing of its own — batch installs are recorded on the platform's own{' '}
                <strong>Batch Install Plan</strong> records, whoever started them. Setting it up is mostly
                switching on things that are already there.
            </p>

            <Step n={1} title="Check you have what it needs">
                <ul className="sum-guide__list">
                    <li>
                        The <strong>admin</strong> role. The platform's install API refuses callers holding only{' '}
                        <code>sn_appclient.app_client_company_installer</code>, so this application is admin-only by
                        design rather than by omission.
                    </li>
                    <li>
                        An instance that can reach the ServiceNow Store. If it cannot, the list still renders from
                        what was last synced, but <strong>Check for updates</strong> will fail.
                    </li>
                </ul>
            </Step>

            <Step n={2} title="Install the application">
                <p>
                    Deploy it the way you deploy any scoped app: publish to your application repository and install
                    from <strong>System Applications &gt; All Available Applications</strong>, or push it with{' '}
                    <code>now-sdk install</code> from source. Nothing else needs configuring for the page to work.
                </p>
            </Step>

            <Step n={3} title="Nothing — the daily check is already on">
                <p>
                    The application ships its own job,{' '}
                    <strong>Store Update Manager - Check for Store updates</strong>, active and running daily at
                    02:00. It arrives with the app, so there is nothing to switch on and nothing to look up. Change
                    the time or switch it off from <strong>Scheduled Jobs</strong>.
                </p>
                <p className="sum-guide__aside">
                    Why not the platform's own job? ServiceNow ships <strong>Check Scoped App Updates</strong>{' '}
                    inactive and marks it read-only (<code>sys_policy = read</code>). Switching it on fails with{' '}
                    <em>update failed due to security constraints</em> no matter what roles you hold. That is the
                    platform working as designed, not a broken instance.
                </p>
                <p className="sum-guide__aside">
                    Ours also does less on purpose. The platform's script action finishes by installing every
                    application flagged <code>auto_update</code>. Refreshing a list and installing software are
                    different decisions, so this job only refreshes.
                </p>
            </Step>

            <Step n={4} title="Decide who hears about it">
                <p>
                    All notification behaviour is configuration, not code. Open{' '}
                    <strong>Store Update Manager &gt; Properties</strong> — the module is already filtered to this
                    application.
                </p>
                <div className="sum-guide__tablewrap">
                    <table className="sum-table">
                        <thead>
                            <tr>
                                <th scope="col">Property</th>
                                <th scope="col">What it does</th>
                                <th scope="col">Default</th>
                            </tr>
                        </thead>
                        <tbody>
                            {PROPERTIES.map(([name, description, value]) => (
                                <tr key={name}>
                                    <td>
                                        <code>{name}</code>
                                    </td>
                                    <td className="sum-table__detail">{description}</td>
                                    <td className="sum-table__version">{value || '(empty)'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>
                    <strong>Nothing is emailed until <code>notify_users</code> has a value.</strong> That is
                    deliberate: a freshly installed app on a new instance should be silent until someone asks for
                    it.
                </p>
            </Step>

            <Step n={5} title="Run Diagnostics before you trust it">
                <p>
                    On an instance nobody has run this on, open <strong>Diagnostics</strong> first. It is read-only
                    and checks the things that actually stop this working: whether the platform tables are
                    readable, whether the Application Manager API resolves, whether the three jobs arrived and are
                    active, whether the Store is reachable, and whether anyone is set to be notified.
                </p>
                <p>
                    A clean run means the application has everything it needs. Warnings are worth a look but
                    nothing is broken.
                </p>
            </Step>

            <Step n={6} title="Do a small first run">
                <p>
                    Filter to <strong>Patch</strong>, pick two or three applications, and install them. Patches are
                    the low-risk bulk and they prove the whole path — submit, progress, per-application result —
                    in a couple of minutes.
                </p>
                <p>
                    On anything that is not a personal development instance, use <strong>Schedule</strong> instead
                    of <strong>Install now</strong>. An install locks the instance while it runs.
                </p>
            </Step>

            <Step n={7} title="Know where things live">
                <ul className="sum-guide__list">
                    <li>
                        <strong>Store Updates</strong> — the page. Everything starts here.
                    </li>
                    <li>
                        <strong>Diagnostics</strong> — a read-only check of everything this application depends
                        on. The first thing to open on a new instance.
                    </li>
                    <li>
                        <strong>Install History</strong> — <code>sys_batch_install_plan</code>. Platform records, so
                        installs started from the OOTB Application Manager appear here too.
                    </li>
                    <li>
                        <strong>Install Results</strong> — <code>sys_batch_install_item</code>, one row per
                        application per run, carrying the reason it was skipped.
                    </li>
                    <li>
                        <strong>Applications With Updates</strong> — the same set as the page, as a standard list you
                        can filter and export.
                    </li>
                    <li>
                        <strong>Scheduled Installs</strong> — <code>sys_installation_schedule</code>, batches booked for a
                        later window.
                    </li>
                    <li>
                        <strong>Scheduled Jobs</strong> — the daily Store check and the two notification jobs, all
                        shipped with this application and all editable.
                    </li>
                    <li>
                        <strong>Properties</strong> — the six settings from step 4, filtered to this application.
                    </li>
                </ul>
            </Step>
        </GuideLayout>
    )
}
