/**
 * Syntax highlighting actually reaching the document.
 *
 * `LanguageSupport` does not install a highlight style — its constructor is
 * `constructor(language, support = [])`, and the extension it exposes is
 * `[language, support]`. A language support that never adds `syntaxHighlighting`
 * therefore assigns tags to tokens but colours nothing, so the editor advertises
 * syntax highlighting that a consumer never sees.
 *
 * These tests assert the visible outcome, not the mechanism: a keyword token must
 * end up inside an element carrying the class the highlight style assigns to the
 * keyword tag.
 */
import { describe, it, expect } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { tags, type Tag } from '@lezer/highlight';
import { TokenKind } from '@agentix-e/spel-ts';

import { spelLanguage } from '../src/cm6/spel-language.js';
import { tokenKindToStyle } from '../src/cm6/spel-grammar.js';
import { spelHighlightStyle } from '../src/cm6/spel-highlight.js';

function render(doc: string): HTMLElement {
  const host = document.body.appendChild(document.createElement('div'));
  const view = new EditorView({
    state: EditorState.create({ doc, extensions: [spelLanguage()] }),
    parent: host,
  });
  view.requestMeasure();
  return host;
}

/** The class the highlight style assigns to `tag`, or null when it assigns none. */
/**
 * The tag registered under `name`, or null when the entry is not a tag.
 *
 * `tags` also holds tag *modifiers*, which are functions, so an index lookup has to
 * be narrowed before it can be styled.
 */
function tagFor(name: string): Tag | null {
  const value = (tags as Record<string, unknown>)[name];
  return typeof value === 'function' || value === undefined ? null : (value as Tag);
}

function classFor(tag: Tag): string | null {
  return spelHighlightStyle.style([tag]);
}

describe('spelHighlightStyle', () => {
  it('assigns a class to every tag the grammar can emit', () => {
    const style = spelHighlightStyle.style([tags.keyword, tags.bool, tags.number]);
    expect(style).toBeTruthy();
  });

  it('covers every style name tokenKindToStyle can return', () => {
    // Enumerating the grammar's own codomain keeps this honest: add a TokenKind
    // mapping without a matching highlight rule and this fails, which is the
    // drift the style table exists to prevent.
    const kinds = Object.values(TokenKind).filter(
      (value): value is TokenKind => typeof value === 'number',
    );
    const names = new Set(kinds.map((kind) => tokenKindToStyle(kind)));

    const unstyled: string[] = [];
    for (const name of names) {
      if (name === '') continue; // no style by design, for EOF
      const tag = tagFor(name);
      expect(
        tag,
        `tokenKindToStyle returned '${name}', which is not a @lezer/highlight tag`,
      ).not.toBeNull();
      if (tag && !spelHighlightStyle.style([tag])) {
        unstyled.push(name);
      }
    }
    expect(unstyled).toEqual([]);
  });

  it('styles the keyword tag with a non-empty class', () => {
    expect(classFor(tags.keyword)).toBeTruthy();
  });
});

describe('spelLanguage() highlighting', () => {
  it('renders a keyword token inside a styled element', () => {
    const host = render('true and null');
    const keywordClass = classFor(tags.keyword);
    const boolClass = classFor(tags.bool);
    expect(keywordClass).toBeTruthy();

    const styled = host.querySelectorAll('.cm-line span');
    expect(styled.length).toBeGreaterThan(0);
    expect(
      host.querySelectorAll(`.${keywordClass}`).length +
        host.querySelectorAll(`.${boolClass}`).length,
    ).toBeGreaterThan(0);
  });

  it('renders a number and a string with their own classes', () => {
    const host = render("42 + 'text'");
    const numberClass = classFor(tags.number);
    const stringClass = classFor(tags.string);
    expect(numberClass).toBeTruthy();
    expect(stringClass).toBeTruthy();
    expect(host.querySelectorAll(`.${numberClass}`).length).toBeGreaterThan(0);
    expect(host.querySelectorAll(`.${stringClass}`).length).toBeGreaterThan(0);
  });

  it('renders an operator with its own class', () => {
    const host = render('#a > 1');
    const operatorClass = classFor(tags.operator);
    expect(operatorClass).toBeTruthy();
    expect(host.querySelectorAll(`.${operatorClass}`).length).toBeGreaterThan(0);
  });
});
