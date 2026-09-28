# Autonomous development loop

This branch is developed continuously. External CI is evidence, not a blocking
synchronisation primitive between implementation steps.

## Non-blocking rule

After a push:

1. Confirm that the relevant GitHub Actions run started.
2. Read at most two status snapshots for that run during the current work block.
3. If the run is still executing, move immediately to an independent task that
   does not modify the same files or depend on that result.
4. Return to the run only when:
   - it completed and its result is needed to diagnose a failure;
   - the current increment is being accepted as a checkpoint;
   - a release, baseline acceptance, merge, or completion claim is about to be made.

Never poll the same in-progress job repeatedly as the main activity.

## QA lanes

The main Nexus QA workflow intentionally runs three independent lanes:

- **Fast** — scale guard, unit tests, TypeScript/Vite build, reference and
  whitespace guards.
- **Browser** — interaction E2E and extension/browser integration.
- **Visual** — approved screenshot baselines.

A failure in one lane does not prevent the other lanes from producing evidence.
New pushes cancel stale runs for the same branch.

## Failure budget

For a defect that does not yield a clear root cause after two focused
diagnostic attempts:

- isolate or revert only that increment if necessary;
- record the unresolved point in the task/commit context;
- choose another independent product area;
- do not stall the rest of Nexus on the unresolved point.

Exceptions: data-loss, security, migration and release-blocking defects. Those
remain blockers for release, but they still do not block unrelated development.

## Exact-head completion

Work may continue while CI runs, but no message may call an increment
"complete", "green", "release-ready" or equivalent until the exact HEAD being
claimed has fresh evidence for every relevant QA lane.

## Concurrent writers

Before every write, fetch the current branch/file again. Never overwrite a
parallel agent's newer change with a stale blob SHA. If another agent changed
the same surface, rebase the intended change conceptually onto the new state or
move to a different independent task.
