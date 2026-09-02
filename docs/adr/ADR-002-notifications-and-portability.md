# ADR-002 — Notifications by polling, and nothing instance-specific in the code

**Status:** ACCEPTED (2026-09-02) · **Phase:** Build v2
**Decision in one line:** Notifications are two scheduled scripts that read platform tables and fire
scoped events; every value that could differ between instances lives in an application property.
**Deciders:** James (solution architect), Claude
**Supersedes / relates:** Extends [ADR-001](ADR-001-ootb-batch-installer-no-new-tables.md); the no-new-tables
decision constrains everything below.

---

## Context

v1 was built for one personal development instance. v2 has to survive being installed on several, and
adds email notification, scheduled install, a per-application detail panel, retry, rollback and two
in-app guides.

## Findings

**F8 — A scoped script may read the platform tables but not write them.** `sys_db_object.read_access`
is `true` and `create_access` / `update_access` are `false` on `sys_store_app`, `sys_app_version`,
`sys_batch_install_plan`, `sys_batch_install_item` and `sys_installation_schedule`. So server-side code
can watch, but every write keeps going through the browser under the operator's session.

**F9 — There is nothing to hang a business rule on.** `sys_batch_install_plan` belongs to another scope,
so this application cannot put a business rule or a record-triggered notification on it. Watching it from
the outside is the only route.

**F10 — Fluent source files take literal values only.** String concatenation inside a `.now.ts` is a
build error (`TS303: Failed to parse property`). Notification bodies are therefore single long literals.

**F11 — Scheduled install parses the start time in the operator's date format.**
`ScheduledInstallService.createSchedule()` calls `GlideDateTime.setDisplayValue(schedule.start_time)`,
which reads the string in the *user's* format. A mismatch misparses silently.

**F12 — The Store publishes no release notes to the instance.** `sys_app_version.short_description` is
the application's standing blurb, identical on every release, and `manifest` is empty. What *is*
per-version: `publish_date`, `dependencies` (`sn_config_hub:1.0.9,sn_ace:5.1.1`) and `compatibilities`
(`Australia;Zurich;`).

**F13 — A hardcoded out-of-the-box sys_id was a real defect.** v1 pointed at
`8c265321d700310092610eca5e61036d` for "Check Scoped App Updates". Base-system sys_ids are usually stable
across instances, but "usually" is not a property to ship.

## Decision

1. **Notifications poll.** Two scheduled scripts in scope: one every ten minutes for finished batches,
   one weekly for the digest. Each reads the platform tables (F8), composes the HTML, and fires a scoped
   event. Two `EmailNotification` records consume those events.
2. **Watermarks live in properties, not a table.** ADR-001's no-new-tables decision holds. Two private
   properties carry "last plan already emailed" and "last digest sent".
3. **Recipients resolve at fire time** via `eventParm1WithRecipient` and the `notify_users` property, so
   one build serves every instance and each decides who hears about it. **Empty means silent** — a newly
   installed application says nothing until someone asks it to.
4. **Cadence is a property, not a schedule.** The digest job runs weekly and `digest_frequency`
   (`off` / `weekly` / `monthly`) decides whether a given run sends. Changing an instance to monthly
   needs no schedule edit.
5. **Look records up by name.** The update-check job is found by name in both the page and the module
   (F13). No out-of-the-box sys_id appears anywhere in the source.
6. **Read the booked schedule back and show it** (F11) rather than echoing what was typed.
7. **The detail panel shows what exists** (F12): the version ladder with publish dates, each release's
   dependencies, and a warning when a version does not list this instance's release family. It does not
   pretend to have release notes.
8. **Rollback links out.** The finished-install view surfaces `sys_batch_install_plan.rollback_context`
   and opens the platform's own rollback screen. We do not reimplement it.
9. **Retry excludes `ALREADY_INSTALLED`.** Everything else that failed or was refused can change on a
   second attempt; that one cannot.
10. **The guides are views, not pages.** `?view=setup` and `?view=faq` in the same single-page
    application, each with its own module. One artifact rather than three (working agreement §1).

## Consequences

- **Notification latency is up to ten minutes**, not instant. That is the price of F9. For an activity
  measured in minutes-long installs it does not matter, and the alternative was a global-scope artifact
  living outside the application.
- **The digest needs a carrier record.** An event must be fired against *some* record; a digest is about
  a set. The store application with the highest-impact pending update is used as the carrier and appears
  nowhere in the email. Mildly inelegant, and preferable to a global business rule or a table of our own.
- **The level-classification logic exists twice** — `src/client/utils/version.ts` and `src/server/notify.ts`
  — because the browser bundle and server modules are compiled separately and cannot share a file.
  Fifteen lines duplicated, with a comment in both, beats a bridge script include.
- **Scheduled install can still be misread if someone types a foreign date format.** Mitigated, not
  solved: the booked time is shown as the platform stored it, so the error is visible immediately rather
  than at 2am on Sunday.
- **The notification jobs are deployed and active but have not been observed firing.** `notify_users` is
  empty by design, so they currently return early. First real test needs a recipient set.
- **Six properties are now the configuration surface.** They are documented in the in-app Setup Guide
  rather than only here, so the person installing on instance number four does not need this repository.
