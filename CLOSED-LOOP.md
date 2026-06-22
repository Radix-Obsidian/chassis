# CLOSED-LOOP.md — DOT Navigator

> D19 manifest. This SKU is not a calendar you read; it is a compliance co-pilot that owns the outcome,
> does the preparation, remembers your true state, and pulls you back before deadlines slip. This file
> declares the loop so the factory's `closed-loop-check` can verify the build matches the promise.

## Outcome (the job it owns)

A first-year ("new entrant") motor carrier must survive an 18-month FMCSA monitoring period and pass a
mandatory safety audit, or lose operating authority. The outcome we own is: **the carrier stays compliant
and passes that audit without having to become a compliance expert.** They are not paying for a list of
deadlines — they already half-know the deadlines. They are paying to not get caught out: to have the right
records assembled, the right form pre-filled, and the next obligation handled before it becomes a violation.
We measure success as audit-readiness over the full program, not as "pages viewed."

## What it does for the user (the action it takes)

Open-loop software shows you what's due and leaves the work to you. DOT Navigator does the work:

- It computes the carrier's personalized, CFR-anchored 18-month milestone schedule from a single input
  (the authority-grant date) — no spreadsheet, no guessing which 49 CFR parts apply.
- It tells them the **single next action** to take right now (the next-action engine ranks everything by
  urgency and authority-risk), instead of handing over an undifferentiated list.
- It prepares the actual paperwork from their stored profile — pre-filled MCS-150, a Driver Qualification
  File checklist, DVIR logs, and a safety-audit binder (roadmap below) — so the carrier reviews and signs
  rather than authoring from scratch.

Honest ceiling: FMCSA deliberately requires the carrier's own signature/submission, so we cannot silently
file on their behalf. We prepare, track, remind, and make submission one reviewed click — we never fake an
auto-submit that legally cannot exist.

## State it remembers (what it persists)

A loop you can't persist isn't a loop. DOT Navigator keeps a real, durable record per carrier (Postgres):

- The carrier's identity (passwordless email account), authority date, operation type, and USDOT number.
- The **true state of every milestone** — done vs. open, with timestamps — so progress survives the
  session, the device, and the logout. This is the line between "a calculator" and "a record."
- The documents we've generated for them and the reminders queued on their behalf.

Because state persists, every visit resumes exactly where they left off, and the next-action engine reasons
over what is *actually* done, not what they re-typed this session.

## How it keeps you in the loop (proactive)

The carrier should not have to remember to come back — that is the whole failure mode we remove. A
scheduled worker scans each carrier's remembered state and **emails proactive reminders** ahead of every
deadline (and escalates anything overdue), with the safety-audit window flagged hardest. Marking an item
done stops its reminders automatically. The loop closes: we watch the carrier's real situation, act and
prepare on their behalf, and bring them back at exactly the moment that protects their authority.
