# Security policy

## Reporting a vulnerability

Report security issues through GitHub's private vulnerability reporting:

**https://github.com/AgentiX-E/spel-editor/security/advisories/new**

That opens a draft advisory visible only to the maintainers, so a report can be discussed and
fixed before it becomes public. Please do not open a public issue for a suspected vulnerability.

Useful in a report: the affected version, the smallest expression or attribute that reproduces it,
and the impact you believe it has. This is a component that runs inside someone else's page, so a
reproduction that shows script executing in the host page is especially useful.

## What to expect

| stage | when |
|---|---|
| acknowledgement | within 3 working days |
| assessment, including whether the report is in scope | within 10 working days |
| fix and release | as soon as a patch is ready, with the advisory published alongside it |

You are credited in the published advisory unless you ask not to be.

## Supported versions

Fixes land on the newest published minor. Older minors are not maintained.

| version | supported |
|---|---|
| 1.x | yes |

## Scope

**In scope.** This component is embedded in a host page and renders text that comes from that
page, so the boundary between them is the interesting surface:

- markup or script reaching the host document from a value the element was given — an expression,
  a diagnostic message, a placeholder, or a context schema — instead of being escaped;
- an event or a message that lets one embedder's configuration affect another instance, or affect
  the page outside the element's shadow root;
- anything that makes the element disclose a value the host page did not pass to it.

**Out of scope.** The content of the expressions the embedder chooses to load is the embedder's
business; this component displays and edits them, and evaluating them is not part of its job.
Denying service to the host page by giving the editor a very large document is a performance
question rather than a vulnerability — although a crash or a hang on a plausibly sized input is
worth reporting.

**Tracked, but not reported as a security issue.** An advisory in a `devDependency` that cannot
reach a published artifact. Those are covered by Dependabot and fixed on a schedule.

## What is already automated

- **Dependabot** alerts, with version updates every Monday and grouped minor and patch
  updates. Advisory-driven updates depend on the repository setting, which is not a file in
  this repository and therefore not something the text above can promise.
- **CodeQL** analysis on push, on pull requests and weekly, with the repository's ruleset refusing
  a merge while a medium-or-higher alert is open.
- The `master` branch cannot be force-pushed or deleted, and requires signed commits and one
  approving review.
