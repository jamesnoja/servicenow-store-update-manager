# Changelog

## 1.0.0 — 2026-09-02

First public release. Running on two instances.

### Added

- **Updates list** — every installed Store application with a newer version available, filtered by
  update level, searchable, with dependency-installed applications hidden by default. Bulk select,
  select-all-shown, and a one-click select-all-patches.
- **Detail panel** — the version ladder between installed and target, publish dates, per-version
  dependencies, and a warning when a version does not list the instance's release family.
- **Review step** — pick a specific version per application rather than only the latest, with warnings
  for versions blocked in the Store catalogue.
- **Installer view** — live per-application progress carrying the platform's own reason
  (`ALREADY_INSTALLED`, `DOWNGRADE_NOT_ALLOWED`, and so on). The batch id lives in the URL, so a run can
  be reopened after closing the tab.
- **Retry** — re-select everything that did not install, excluding `ALREADY_INSTALLED`, which cannot
  change on a second attempt.
- **Rollback** — links to the platform's own rollback screen when a run captured a rollback context.
- **Scheduled installs** — book a batch for a maintenance window via `sys_installation_schedule`. The
  booked time is read back from the record and shown, rather than echoing what was typed.
- **Notifications** — email when a batch reaches a final state, and a periodic digest of what is
  waiting. Recipients resolve at send time from a property, so one build serves any number of instances.
- **Daily Store check** — the application's own job, because the platform's is protected.
- **Setup Guide, FAQ and Diagnostics** pages inside the application.

### Notes

- No tables are created. The update list is derived at read time; history is the platform's own batch
  install records.
- Tested on the Australia release family.
