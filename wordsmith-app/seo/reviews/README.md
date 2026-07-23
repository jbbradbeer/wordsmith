# Monthly SEO reviews

`/seo-review` (run in an interactive Claude session, where the openseo GSC
connector works) writes a dated `YYYY-MM.md` report here and opens a
`seo-review-YYYY-MM` PR of reversible edits (`PRUNED_WORDS` / `BOOSTED_WORDS`
in `src/lib/seo-controls.ts`, and `seo/keyword-backlog.json` order).

A monthly reminder routine notifies when a review is due (1st of month, 14:00
UTC): routine id `trig_01P4xxcuR8YhgDg8nqiDWWbW`. The routine does not pull GSC
itself (the openseo connector is not available in headless cron); it only
notifies, then you run `/seo-review`.

Prerequisite (one-time): connect the trywordsmith.com Search Console property to
the openseo project.
