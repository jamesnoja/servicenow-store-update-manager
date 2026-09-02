# ADR-003 — Ship our own Store update check job

**Status:** ACCEPTED (2026-09-02) · **Phase:** Build v2.1
**Decision in one line:** The application ships an active daily job that calls
`sn_appclient.UpdateChecker` directly, replacing any dependence on the platform's protected
"Check Scoped App Updates".
**Deciders:** James (solution architect), Claude
**Supersedes / relates:** Reverses decision 5 of [ADR-001](ADR-001-ootb-batch-installer-no-new-tables.md)
("do not rebuild the refresh") and decision 5 of
[ADR-002](ADR-002-notifications-and-portability.md) ("look records up by name").

---

## Context

ADR-001 concluded that the refresh already existed out of the box and only needed switching on, and the
page offered a one-click activation. On 2026-09-02 James pressed it and got:

> Something went wrong: ACL exception update failed due to security constraints

## Findings

**F14 — The out-of-the-box job is protected, not merely inactive.** `sysauto_script` "Check Scoped App
Updates" carries `sys_policy = read`. It is read-only by design; no role can activate it. The one-click
activation in v2 could never have worked, on this instance or any other.

**F15 — The event it fires is open to any caller.** `sysevent_register` for
`sn_appclient.check.for.update` has `caller_access = ''` (None), and its consumer — an active Script
Action in the `sn_appclient` scope — does the work whether or not the OOTB job is active. So firing the
event was one available route.

**F16 — But that script action does more than refresh.** It ends with
`new AppUpgrader().autoUpdates()`, which installs every application flagged `auto_update` with nobody
pressing anything. On the development instance no application is flagged, so nothing would have happened here — but
shipping that to another instance would mean a job of ours silently installing software.

**F17 — `sn_appclient.UpdateChecker` is `access = public`.** It can be called straight from this scope.
`checkAvailableUpdates(false, false, {forceUpdate: true})` is the refresh on its own, without the
auto-install tail.

## Decision

1. **Ship `Store Update Manager - Check for Store updates`** — a `ScheduledScript` in this scope, active
   on install, daily at 02:00.
2. **Call `sn_appclient.UpdateChecker` directly** (F17). Do not fire the event and do not copy the OOTB
   script action, because of F16. Refreshing a catalogue and installing software are different
   decisions and this job only makes the first.
3. **Respect ServiceNow's kill switch.** The job refreshes `sn_appclient.client_calls_allowed` first and
   skips the check when it is false, matching the platform's own behaviour for instances that must not
   call the Store.
4. **Stop touching the out-of-the-box job entirely.** No activation, no lookup, no module pointing at
   it. The page's "switched off" banner now refers to our own job, which is ours to toggle.
5. **Written as `Now.include()` rather than a module**, because it calls `sn_appclient.UpdateChecker`
   through the scope prefix, which only resolves in a plain server script.

## Consequences

- **The instance-portability worry from ADR-002 goes away for this job.** It is not looked up by name
  because it is not somebody else's record — it arrives with the application, on every instance.
- **One outbound Store call per day**, plus one to refresh the client-calls property. That is the same
  cadence the platform would have used, and it is the reason the application exists.
- **ADR-001 decision 5 was wrong**, and for a reason worth keeping: "the platform already does this" was
  true, but "and it can therefore be switched on" was an assumption never tested. `sys_policy` was
  visible on the record the whole time. Read the protection policy, not just the active flag.
- **The upgrade-skip cost recorded in ADR-002 disappears** — no out-of-the-box record is modified any
  more, so nothing becomes a skipped change at the next family upgrade.
- **We now differ from the platform's behaviour** in one visible way: an application flagged
  `auto_update` will not be auto-installed by our job. If an instance actually wants that, the OOTB job
  is still there for whoever can enable it, and the two are independent.
- The **Update Check Job** module became **Scheduled Jobs**, filtered to this scope, and now covers all
  three of the application's jobs rather than pointing at somebody else's.
