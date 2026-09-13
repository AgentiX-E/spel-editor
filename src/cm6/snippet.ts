/**
 * Translate a snippet template from the engine's placeholder convention to
 * CodeMirror's.
 *
 * `@agentix-e/spel-ts` writes positional placeholders as `$1`, `$2`, `$3` — see the
 * completion items for `T($1)`, `?: $1`, `$1 ? $2 : $3` and `between {$1, $2}`.
 * CodeMirror's snippet parser recognises a placeholder only when it is braced:
 * its pattern is `[#$]\{...\}`, so `${1}` and `${1:default}` are fields while a bare
 * `$1` is ordinary text. Handing the engine's string to a completion's `apply`
 * therefore inserted the placeholder literally, and accepting the `T(...)`
 * completion typed `T($1)` into the document.
 *
 * Braces *outside* a placeholder need no escaping: CodeMirror only treats `{` as
 * significant when it directly follows `$` or `#`, so `between {${1}, ${2}}` keeps
 * its braces as text.
 */

/**
 * Rewrite `$N` placeholders as CodeMirror fields.
 *
 * The replacement is built by a function rather than a template string so that no
 * part of it can be read as a `$`-substitution by `String.prototype.replace` — an
 * inline replacement of `'${$1}'` yields `{1}`, silently dropping the dollar sign.
 */
export function toCm6Snippet(template: string): string {
  return template.replace(/\$(\d+)/g, (_match, digits: string) => `\${${digits}}`);
}
