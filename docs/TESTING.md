# Store Update Manager — new instance test script

For the first install of `store_update_manager_1_0_0.zip` on an instance other than the development instance.

Four paths in this application have **never actually run**: notifications, scheduled install, retry, and
rollback. Everything else has been exercised on the development instance. Work top to bottom — later
tests depend on earlier ones.

Record the instance, family and date here before you start:

| | |
|---|---|
| Instance | |
| Release family | |
| Date | |
| App version | 1.0.0 |

---

## 0. Install — 5 minutes

- [ ] Install the app (application repository, or `now-sdk install` from source).
- [ ] **All** menu → **Store Update Manager** appears with eleven modules.
- [ ] No errors in `syslog` mentioning `x_301833`.

## 1. Diagnostics — 2 minutes

This is the point of doing it first: it tells you what is wrong before you go looking.

- [ ] Open **Diagnostics**. Note anything that is not "OK".
- [ ] **Application Manager API** — it should be OK either way, because the check now *calls* the API
      rather than only locating it. If the detail says the path could not be read from the platform,
      copy the reason it gives; it means this instance cannot read `sys_ws_operation` and the default
      path is carrying it.
- [ ] **Scheduled jobs** — all three present and active.
- [ ] **Store connectivity** — `client_calls_allowed` is true.
- [ ] **Release family** — detected, and it matches the instance.
- [ ] **Date format and time zone** — matches what you see elsewhere in the platform.

> Expected on a fresh instance: **Notification recipients** warns (empty by design) and possibly
> **Version catalogue** warns until the first Store check runs. Everything else should be OK.

## 2. The list — 5 minutes

- [ ] **Store Updates** loads and shows a count in the subtitle.
- [ ] Press **Check for updates**. The button counts up and the page reloads when it finishes.
      *Watch for: "Unknown request type" (the sync contract differs on this family) or a two-minute
      timeout.*
- [ ] "Store catalogue last refreshed" updates to roughly now.
- [ ] Level filters, search and **Hide apps installed as dependencies** all change the count.
- [ ] Click an application name — the detail panel opens with a version ladder and publish dates.
- [ ] If a version lists families, check the compatibility warning appears for one that excludes this
      family (skip if none do).

## 3. Install now — 10 minutes

Pick **two patch-level** applications. Patches are the low-risk bulk.

- [ ] Select two, press **Review 2**.
- [ ] Change one target version using the picker; confirm the level pill changes with it.
- [ ] Press **Install 2 updates now**.
- [ ] The installer view opens, the progress bar moves, per-application rows show state and reason.
- [ ] Close the tab and reopen the URL — the same run is still shown.
- [ ] It finishes and the summary matches the rows.

## 4. Retry — 5 minutes · **never run before**

Easiest way to produce a failure is to install something already at its latest version.

- [ ] Install one application twice in a row. The second run should come back **Not applied /
      Already at this version**.
- [ ] Confirm **no** retry button appears for it — `ALREADY_INSTALLED` is deliberately excluded.
- [ ] If you get a genuine failure or another skip reason, press **Retry N that did not install** and
      confirm it lands you in Review with those applications selected.

## 5. Rollback — 5 minutes · **never run before**

- [ ] On a finished install, look for **Roll back this batch**. It only appears when the platform
      captured a rollback context; not every run gets one.
- [ ] Click it — the platform's own rollback screen opens in a new tab. **Do not complete the rollback**
      unless you want to.

## 6. Scheduled install — 15 minutes · **never run before**

- [ ] Select one patch, **Review**, then **Schedule for later**.
- [ ] The dialog shows a date/time picker and a line naming the time zone. Check that line says
      something sensible for this instance.
- [ ] Pick a time about ten minutes ahead. Book it.
- [ ] The confirmation reports the time **as the platform stored it**. *Does it match what you picked?*
      If not, that is the misparse this design exists to catch — record both values.
- [ ] The booking appears under **Scheduled Installs**.
- [ ] Wait for the window. The install runs and a plan appears in **Install History**.

## 7. Notifications — 20 minutes · **never run before**

- [ ] **Properties** → set `notify_users` to your user name.
- [ ] Confirm the instance can actually send email (`glide.email.smtp.active`, and check
      **System Mailboxes → Outbound**). On a PDI this is often off — if so, verify by looking for the
      row in the outbox rather than an inbox.
- [ ] Wait up to ten minutes for **Store Update Manager - Notify on batch finish**, or run it manually
      from **Scheduled Jobs**.
- [ ] An email arrives (or lands in the outbox) for the batch you ran in step 3, listing what installed
      and what did not.
- [ ] Run **Store Update Manager - Update digest** manually. A summary arrives with major / minor /
      patch counts and the instance name in the subject.
- [ ] Set `digest_frequency` to `off`, run it again, confirm nothing is sent.

## 8. The daily check — next morning

- [ ] Next day, confirm `syslog` has `[StoreUpdateManager] Store update check complete`.
- [ ] "Store catalogue last refreshed" has moved without anyone pressing anything.

---

## What to send back

- The Diagnostics screen, whatever it says.
- Anything from steps 4 to 7 that did not behave — those four paths have no track record.
- The **Application Manager API** line from Diagnostics if it fell back to the default, and the family
  this instance is on. That tells us whether the REST path really does move between families.
