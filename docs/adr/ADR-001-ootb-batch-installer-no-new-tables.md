# ADR-001 — Build on the platform's own batch installer, called from the browser, with no new tables

**Status:** ACCEPTED (2026-09-02) · **Phase:** Build v1
**Decision in one line:** The application is a React UI Page that reads `sys_store_app` / `sys_app_version`
directly and submits work to the OOTB `sn_appclient` REST API; it owns no tables, no server scripts and
no flows.
**Deciders:** James (solution architect), Claude
**Supersedes / relates:** Replaces the approach in the community article *Creating a batch installer for
store updates* (remote table + CICD Batch Install flow action + two Core UI pages).

---

## Context

The ask was a scoped app listing Store applications with an update available, with bulk select, a neat
installer page showing per-application progress, and a monthly refresh — built as though ServiceNow had
built it. The article that prompted it solves the same problem with a remote table
(`x_snc_app_updater_st_available_updates`), a subflow wrapping the CICD **Batch Install** action, and two
Core UI pages.

Before designing, the OOTB ladder was run against the live instance (the development instance, Australia patch 3).

## Findings

Each finding was established by live query on 2026-09-02; the detail sits in `CONTEXT.md`.

**F1 — Batch install is a platform feature, not something to build.** `sys_batch_install_plan` and
`sys_batch_install_item` are OOTB tables and two plans already existed on the instance. The engine is
`new GlideAppLoader().installBatch(planJson, isScheduled)`, wrapped by `sn_appclient.AppUpgrader` and
`AppManagerHandler`.

**F2 — A scoped app cannot reach that engine server-side.** `AppManagerHandler`, `AppUpgrader`,
`ProgressTracker`, `AppsData` and `DependencyProcessor` are all `access = package_private` in the
`sn_appclient` scope. Nothing in a custom scope can call them.

**F3 — The supported surface is `sn_appclient`'s scripted REST API**, based at
`/api/sn_appclient/v1/appmanager` (service_id `appmanager`, versioned — the unversioned path 404s with
*Requested URI does not represent any resource*). `POST /product/install` takes
`{name, packages:[{id, type, requested_version, load_demo_data, notes}]}` and returns
`batchInfo.batch_installation_id`; `GET /batch/{id}`, `GET /pendingbatchinstallations`,
`GET /sync_apps`, `POST /schedule` and `POST /batch/dependencies` sit alongside it. Called from the
browser these run under the operator's own session — no cross-scope script, and no outbound API spend
(working agreement §7).

**F4 — `packages[].id` is `sys_store_app.sys_id`.** Verified against the existing plan items: Creator
Studio's batch item id `81ac5fe1c7442110408bc8d6f2c260d1` is exactly its `sys_store_app` sys_id, and
`sys_app_version.source_app_id` carries the same value.

**F5 — The list needs no table of its own.** `sys_store_app` carries `version`, `latest_version` and
`update_available`; `sys_app_version` carries every published version with `publish_date` and
`block_install`. Update level (major / minor / patch) is arithmetic on two version strings.

**F6 — The refresh job already exists and is switched off.** `sysauto_script`
`8c265321d700310092610eca5e61036d` — "Check Scoped App Updates", daily, `active = false` — fires
`sn_appclient.check.for.update`.

**F7 — The platform's own progress response drops the reason.** `ProgressTracker._getBatchInstallItem()`
returns `id`, `state`, `status_message`, `type`, `version`, `notes`, `demo_data`, `name` — but not
`reason`, which is the field carrying `ALREADY_INSTALLED`, `UNKNOWN_VERSION`, `DOWNGRADE_NOT_ALLOWED`.

## Decision

1. **A React UI Page (Fluent `UiPage`, React 18 API surface via React 19 + `@servicenow/react-components`),
   styled with Horizon design tokens.** Three views on one page, switched by URLSearchParams:
   `?view=updates`, `?view=review`, `?view=install&batch=<sys_id>`.
2. **No tables.** The updates list is derived at read time from `sys_store_app` + `sys_app_version`.
   Run history is the platform's own `sys_batch_install_plan` / `sys_batch_install_item`, surfaced as
   two modules.
3. **Submit through `POST /api/sn_appclient/v1/appmanager/product/install`** (F3), from the browser,
   under the operator's session.
4. **Read progress from `sys_batch_install_item` via the Table API**, not from `GET /batch/{id}` —
   because of F7. The reason an application was skipped is the single most useful thing on that screen.
5. **Do not rebuild the refresh.** The page surfaces when the Store catalogue was last refreshed, offers
   a manual *Check for updates* (`GET /sync_apps`), and — when the OOTB job is inactive — offers a single
   action to activate it.
6. **Admin only.** `POST /product/install` explicitly refuses a caller holding only
   `sn_appclient.app_client_company_installer`, so a delegated installer role would show a page nobody
   but an admin could act on.

## Consequences

- **What we do not own:** no remote table and its query script, no subflow, no CICD role
  (`sn_cicd.sys_ci_automation`), no progress-worker plumbing, no scheduled job. The app is one UI Page,
  one application menu and six modules.
- **The version choice is real.** Because `sys_app_version` is read directly rather than through a
  remote table that keeps only the newest patch/minor/major, the review step can offer every published
  version newer than the installed one. That is the article's stated limitation, removed.
- **Cost:** the page issues four Table API reads on load and one read every four seconds while an
  install is running. All are internal — ServiceNow does not bill inbound Table API calls — so §7 does
  not bite here. The single outbound-shaped call is `GET /sync_apps`, and it only fires when a person
  presses the button.
- **Activating "Check Scoped App Updates" writes to an OOTB record.** That marks it customised, so it
  becomes a skipped change at upgrade and someone has to adjudicate it. This is the platform's own
  on/off switch and the alternative (a duplicate job in our scope firing the same event) is worse, but
  it is a real cost and the button says what it does.
- **Dependency pre-flight is deferred, not rejected.** `POST /batch/dependencies` exists and would let
  the review step show what else gets pulled in. Its request shape is undocumented and
  `sn_appclient.DependencyProcessor` is protected — its `script` field is not readable through the Table
  API — so the payload could not be established without guessing. The platform resolves dependencies
  during the install regardless; the review step warns on `block_install` instead.
- **The page depends on internal API shapes.** `batchInfo.batch_installation_id` and the
  `sys_batch_install_item` columns are platform internals, not a published contract. A future family
  release could move them. The failure is loud (an error banner, no silent wrong answer), and the fix is
  contained to two service files.
