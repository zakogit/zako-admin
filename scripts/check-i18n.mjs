#!/usr/bin/env node
/**
 * i18n consistency checker for the admin panel.
 *
 *   node scripts/check-i18n.mjs                      # locales + every t() call in src/
 *   node scripts/check-i18n.mjs --ns=users,common    # restrict locale checks to namespaces
 *   node scripts/check-i18n.mjs src/pages/users      # restrict source scan to files / dirs
 *   node scripts/check-i18n.mjs --hardcoded src/pages/users   # also list leftover hard-coded UI text
 *
 * Checks:
 *   - uz / ru / en have the same keys per namespace, same {{placeholders}}, no empty values
 *   - plural groups (`key_one`, `key_few`, ...) carry every form the language needs
 *   - every literal t('ns:key') / t('key') call in source resolves to an existing key
 *   - variables passed to t() cover the {{placeholders}} of the key
 *   - (--hardcoded) user-visible string literals that are not routed through t()
 *
 * Add `// i18n-ignore` to a line (or the line above it) to silence a hard-coded-text finding.
 * Exit code 1 when any error is found; warnings never fail the run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const LOCALES = path.join(SRC, 'i18n', 'locales');
const LANGS = ['uz', 'ru', 'en'];
const BASE = 'uz';

const args = process.argv.slice(2);
const nsFilter = (args.find((a) => a.startsWith('--ns=')) ?? '').slice(5).split(',').filter(Boolean);
const wantHardcoded = args.includes('--hardcoded');
const scanPaths = args.filter((a) => !a.startsWith('--'));

const errors = [];
const warnings = [];
const err = (tag, msg) => errors.push(`[${tag}] ${msg}`);
const warn = (tag, msg) => warnings.push(`[${tag}] ${msg}`);

// ───────────────────────── locales ─────────────────────────
const PLURAL_RE = /_(zero|one|two|few|many|other)$/;
const PLACEHOLDER_RE = /\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g;
const REQUIRED_PLURALS = Object.fromEntries(
  LANGS.map((l) => [l, new Intl.PluralRules(l).resolvedOptions().pluralCategories]),
);

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const placeholders = (v) => {
  const set = new Set();
  const text = Array.isArray(v) ? v.join(' ') : String(v);
  for (const m of text.matchAll(PLACEHOLDER_RE)) set.add(m[1]);
  return set;
};

/** data[lang][ns] = { base: { plural: bool, forms: Map(form -> value) } } */
const data = Object.fromEntries(LANGS.map((l) => [l, {}]));
for (const lang of LANGS) {
  const dir = path.join(LOCALES, lang);
  if (!fs.existsSync(dir)) {
    err('locale', `missing directory src/i18n/locales/${lang}`);
    continue;
  }
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const ns = file.slice(0, -5);
    let json;
    try {
      json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch (e) {
      err('bad-json', `${lang}/${file}: ${e.message}`);
      continue;
    }
    const groups = {};
    for (const [key, value] of Object.entries(flatten(json))) {
      const m = key.match(PLURAL_RE);
      const base = m ? key.slice(0, -m[0].length) : key;
      const g = (groups[base] ??= { plural: false, forms: new Map() });
      if (m) g.plural = true;
      g.forms.set(m ? m[1] : '', value);
    }
    data[lang][ns] = groups;
  }
}

const allNamespaces = new Set(LANGS.flatMap((l) => Object.keys(data[l])));
for (const ns of allNamespaces) {
  if (nsFilter.length && !nsFilter.includes(ns)) continue;
  const union = new Set(LANGS.flatMap((l) => Object.keys(data[l][ns] ?? {})));
  for (const lang of LANGS) {
    const groups = data[lang][ns];
    if (!groups) {
      err('locale', `namespace "${ns}" is missing for ${lang} (src/i18n/locales/${lang}/${ns}.json)`);
      continue;
    }
    for (const base of union) {
      const g = groups[base];
      if (!g) {
        const have = LANGS.filter((l) => data[l][ns]?.[base]).join(',');
        err('missing-translation', `${lang}/${ns}.json: "${base}" (present in ${have})`);
        continue;
      }
      if (!g.plural && LANGS.some((l) => data[l][ns]?.[base]?.plural))
        err('plural', `${lang}/${ns}.json: "${base}" is pluralised in another language — add the _one/_few/_many/_other forms here too`);
      for (const [form, value] of g.forms) {
        const empty = Array.isArray(value) ? value.length === 0 : String(value).trim() === '';
        if (empty) err('empty', `${lang}/${ns}.json: "${base}${form ? '_' + form : ''}" is empty`);
        const text = Array.isArray(value) ? value.join(' ') : String(value);
        if ((lang === 'uz' || lang === 'en') && /[Ѐ-ӿ]/.test(text))
          warn('script', `${lang}/${ns}.json: "${base}" contains Cyrillic: ${text.slice(0, 60)}`);
        if (lang === 'ru' && !/[Ѐ-ӿ]/.test(text) && /[A-Za-z]{3,}/.test(text))
          warn('ru-latin', `ru/${ns}.json: "${base}" has no Cyrillic (untranslated?): ${text.slice(0, 60)}`);
      }
      if (g.plural) {
        for (const cat of REQUIRED_PLURALS[lang]) {
          if (!g.forms.has(cat)) err('plural', `${lang}/${ns}.json: "${base}" needs a "_${cat}" form`);
        }
        const hasCount = [...g.forms.values()].some((v) => placeholders(v).has('count'));
        if (!hasCount) err('plural', `${lang}/${ns}.json: plural "${base}" never uses {{count}}`);
      }
    }
    // placeholder parity against the base language
    const baseGroups = data[BASE][ns];
    if (baseGroups) {
      for (const [base, g] of Object.entries(groups)) {
        const b = baseGroups[base];
        if (!b) continue;
        const mine = new Set([...g.forms.values()].flatMap((v) => [...placeholders(v)]));
        const theirs = new Set([...b.forms.values()].flatMap((v) => [...placeholders(v)]));
        const diff = [...theirs].filter((x) => !mine.has(x)).concat([...mine].filter((x) => !theirs.has(x)));
        if (diff.length) err('placeholder', `${lang}/${ns}.json: "${base}" {{${diff.join('}}, {{')}}} differs from ${BASE}`);
      }
    }
  }
}

// ───────────────────────── source scan ─────────────────────────
function collectFiles(target) {
  const abs = path.resolve(ROOT, target);
  if (!fs.existsSync(abs)) {
    err('path', `no such file or directory: ${target}`);
    return [];
  }
  const stat = fs.statSync(abs);
  if (stat.isFile()) return /\.(ts|tsx)$/.test(abs) ? [abs] : [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = path.join(abs, entry.name);
    if (entry.isDirectory()) {
      if (p === LOCALES) continue;
      out.push(...collectFiles(path.relative(ROOT, p)));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const files = (scanPaths.length ? scanPaths : ['src']).flatMap(collectFiles);

const strVal = (node) =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;

function lookup(ns, key) {
  const groups = data[BASE][ns];
  if (!groups) return { exists: false, why: `namespace "${ns}" not found` };
  if (groups[key]) return { exists: true, group: groups[key] };
  const asObject = Object.keys(groups).some((k) => k.startsWith(key + '.'));
  return { exists: false, isObject: asObject };
}

function lookupPrefix(ns, prefix) {
  const groups = data[BASE][ns];
  if (!groups) return false;
  const p = prefix.replace(/\.$/, '');
  return Object.keys(groups).some((k) => k === p || k.startsWith(p + '.') || k.startsWith(p));
}

const LABEL_ATTRS = new Set([
  'placeholder', 'title', 'label', 'alt', 'aria-label', 'ariaLabel', 'description', 'subtitle', 'message',
  'text', 'header', 'heading', 'emptyText', 'helperText', 'tooltip', 'hint', 'confirmText', 'cancelText',
  'legend', 'error', 'unit',
]);
const GENERIC_ATTRS = new Set(['name', 'content', 'headers']);
const LABEL_PROPS = new Set([
  'label', 'title', 'description', 'subtitle', 'message', 'placeholder', 'header', 'heading', 'text', 'tooltip',
  'emptyMessage', 'hint', 'helperText', 'confirmText', 'cancelText',
]);
const GENERIC_PROPS = new Set(['name', 'content']);
const LABEL_VAR_RE = /(labels?|titles?|texts?|messages?|names?|headers?|headings?|captions?)$/i;
const ALLOWED_TOKENS = new Set([
  'ID', 'XP', 'AI', 'OTP', 'IP', 'URL', 'PDF', 'JSON', 'API', 'SMS', 'ZAKO', 'ZAKO Admin', 'iOS', 'Android',
  'Telegram', 'Google', 'AdMob', 'Apple', 'Click', 'Payme', 'Uzum', 'Email', 'QR', 'FCM', 'JWT', 'HTML', 'CSV',
  'TOP-10', 'PNG', 'JPG', 'WEBP', 'MFA', '2FA', 'Android / iOS', 'Premium', 'Admin', 'Dashboard',
]);

const ALLOWED_RE = new RegExp(
  `(?<![\\p{L}\\d])(${[...ALLOWED_TOKENS].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\d])`,
  'gu',
);

function isHumanText(text, strict) {
  const t = text.trim();
  if (!/\p{L}{2,}/u.test(t)) return false;
  if (ALLOWED_TOKENS.has(t)) return false;
  // "ID:", "XP", "ZAKO Admin" … — nothing translatable once brand/technical tokens are removed
  if (!/\p{L}{2,}/u.test(t.replace(ALLOWED_RE, ''))) return false;
  if (/^(https?:|\/|\.\/|#|data:|mailto:)/.test(t)) return false;
  if (/^[\w\-./:#@[\]%$]+$/.test(t) && !/^\p{Lu}/u.test(t) && !strict) return false; // identifier / class-like
  if (/^[\w\-./:#@[\]%$]+$/.test(t) && /[-_/.:]/.test(t) && !/\s/.test(t) && /^[a-z]/.test(t)) return false;
  return true;
}

/** String-literal nodes whose text can reach the screen through `expr` (ternaries, ||, ??, templates). */
function stringsIn(expr, out = []) {
  if (!expr) return out;
  if (strVal(expr) !== null) out.push({ node: expr, text: strVal(expr) });
  else if (ts.isTemplateExpression(expr)) {
    const parts = [expr.head.text, ...expr.templateSpans.map((s) => s.literal.text)];
    out.push({ node: expr, text: parts.join(' ') });
  } else if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isNonNullExpression(expr))
    stringsIn(expr.expression, out);
  else if (ts.isConditionalExpression(expr)) {
    stringsIn(expr.whenTrue, out);
    stringsIn(expr.whenFalse, out);
  } else if (ts.isBinaryExpression(expr)) {
    const k = expr.operatorToken.kind;
    if (k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken || k === ts.SyntaxKind.AmpersandAmpersandToken) {
      stringsIn(expr.left, out);
      stringsIn(expr.right, out);
    } else if (k === ts.SyntaxKind.PlusToken) {
      stringsIn(expr.left, out);
      stringsIn(expr.right, out);
    }
  }
  return out;
}

const hardcoded = [];
const unusedDynamic = [];

function scanFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lines = text.split(/\r?\n/);
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
  const ignored = (node) => {
    const l = lineOf(node);
    return /i18n-ignore/.test(lines[l] ?? '') || /i18n-ignore/.test(lines[l - 1] ?? '');
  };

  // translation callee identifiers + default namespaces for this file
  const callees = new Set(['t']);
  const fileNamespaces = [];
  let usesHook = false;
  (function pre(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useTranslation') {
      usesHook = true;
      const a = node.arguments[0];
      if (!a) fileNamespaces.push('common');
      else if (strVal(a) !== null) fileNamespaces.push(strVal(a));
      else if (ts.isArrayLiteralExpression(a)) for (const el of a.elements) if (strVal(el) !== null) fileNamespaces.push(strVal(el));
    }
    if (ts.isBindingElement(node) && node.propertyName && ts.isIdentifier(node.propertyName) && node.propertyName.text === 't' && ts.isIdentifier(node.name))
      callees.add(node.name.text);
    ts.forEachChild(node, pre);
  })(sf);
  if (!fileNamespaces.length) fileNamespaces.push('common');

  const flag = (node, kind, str) => {
    if (!wantHardcoded || ignored(node)) return;
    hardcoded.push(`${rel}:${lineOf(node) + 1}  ${kind.padEnd(11)} ${JSON.stringify(str.trim().replace(/\s+/g, ' ').slice(0, 70))}`);
  };

  function checkTCall(node) {
    const [keyArg, optsArg] = node.arguments;
    if (!keyArg) return;
    const where = `${rel}:${lineOf(node) + 1}`;
    const literal = strVal(keyArg);
    if (literal === null) {
      if (ts.isTemplateExpression(keyArg)) {
        const head = keyArg.head.text;
        let ns = null;
        let prefix = head;
        const colon = head.indexOf(':');
        if (colon >= 0) {
          ns = head.slice(0, colon);
          prefix = head.slice(colon + 1);
        }
        const candidates = ns ? [ns] : fileNamespaces;
        if (!prefix) unusedDynamic.push(`${where}  fully dynamic key (verify every value exists in all languages)`);
        else if (!candidates.some((n) => lookupPrefix(n, prefix)))
          err('missing-key', `${where}  dynamic t(\`${head}\${…}\`) — no keys start with "${prefix}" in ${candidates.join('|')}`);
        else unusedDynamic.push(`${where}  dynamic key prefix "${head}" — verify every possible value exists`);
      } else unusedDynamic.push(`${where}  non-literal key ${keyArg.getText(sf).slice(0, 50)}`);
      return;
    }
    let ns;
    let key = literal;
    const colon = literal.indexOf(':');
    if (colon >= 0) {
      ns = literal.slice(0, colon);
      key = literal.slice(colon + 1);
    }
    let found = null;
    const candidates = ns ? [ns] : fileNamespaces;
    for (const n of candidates) {
      const r = lookup(n, key);
      if (r.exists) {
        found = { ns: n, group: r.group };
        break;
      }
    }
    if (!found) {
      if (!ns && !usesHook) err('no-hook', `${where}  t("${literal}") without useTranslation() in this file — use i18n.t('ns:key') outside components`);
      else err('missing-key', `${where}  t("${literal}") not found in ${candidates.map((n) => `${n}.json`).join(' / ')}`);
      return;
    }
    if (optsArg && ts.isObjectLiteralExpression(optsArg)) {
      const provided = new Set();
      let spread = false;
      for (const p of optsArg.properties) {
        if (ts.isShorthandPropertyAssignment(p)) provided.add(p.name.text);
        else if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) provided.add(p.name.text);
        else spread = true;
      }
      if (!spread) {
        const needed = new Set([...found.group.forms.values()].flatMap((v) => [...placeholders(v)]));
        for (const v of needed) if (!provided.has(v)) err('missing-var', `${where}  t("${literal}") needs {{${v}}} but it is not passed`);
      }
    } else if (!optsArg || strVal(optsArg) !== null) {
      const needed = new Set([...found.group.forms.values()].flatMap((v) => [...placeholders(v)]));
      if (needed.size) err('missing-var', `${where}  t("${literal}") needs {{${[...needed].join('}}, {{')}}} but no variables are passed`);
    }
  }

  function visit(node) {
    // translation calls
    if (ts.isCallExpression(node)) {
      const c = node.expression;
      const isT =
        (ts.isIdentifier(c) && callees.has(c.text)) ||
        (ts.isPropertyAccessExpression(c) && c.name.text === 't' && ts.isIdentifier(c.expression) && c.expression.text === 'i18n');
      if (isT) checkTCall(node);

      // toast / confirm / alert strings
      if (wantHardcoded) {
        const callee = c.getText(sf);
        if (/^(toast(\.(success|error|loading|custom))?|window\.confirm|confirm|alert|window\.alert)$/.test(callee)) {
          for (const a of node.arguments) for (const s of stringsIn(a)) if (isHumanText(s.text, true)) flag(s.node, 'toast/dialog', s.text);
        }
      }
    }

    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      if (node.tagName.getText(sf) === 'Trans') {
        const attr = (n) => node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === n);
        const keyAttr = attr('i18nKey');
        const raw = keyAttr?.initializer && (strVal(keyAttr.initializer) ?? (ts.isJsxExpression(keyAttr.initializer) ? strVal(keyAttr.initializer.expression) : null));
        if (raw) {
          const nsAttr = attr('ns');
          const nsRaw = nsAttr?.initializer && (strVal(nsAttr.initializer) ?? (ts.isJsxExpression(nsAttr.initializer) ? strVal(nsAttr.initializer.expression) : null));
          const colon = raw.indexOf(':');
          const ns = colon >= 0 ? raw.slice(0, colon) : nsRaw;
          const key = colon >= 0 ? raw.slice(colon + 1) : raw;
          // <Trans> does NOT inherit the parent's useTranslation('ns'): without an "ns:" prefix, an `ns=` or a `t=` prop it
          // resolves against the default namespace ("common") and renders the raw key.
          const usesT = Boolean(attr('t'));
          if (!ns && !usesT) err('trans-ns', `${rel}:${lineOf(node) + 1}  <Trans i18nKey="${raw}"> needs an "ns:" prefix (Trans ignores useTranslation's namespace)`);
          const candidates = ns ? [ns] : usesT ? fileNamespaces : ['common'];
          if (!candidates.some((n) => lookup(n, key).exists))
            err('missing-key', `${rel}:${lineOf(node) + 1}  <Trans i18nKey="${raw}"> not found in ${candidates.join('|')}`);
        }
      }
    }

    if (wantHardcoded) {
      if (ts.isJsxText(node)) {
        const txt = node.text.trim();
        if (txt && isHumanText(txt, true)) flag(node, 'jsx-text', txt);
      }
      if (ts.isJsxAttribute(node) && node.initializer) {
        const name = node.name.getText(sf);
        const init = node.initializer;
        const expr = ts.isJsxExpression(init) ? init.expression : init;
        if (LABEL_ATTRS.has(name) || GENERIC_ATTRS.has(name)) {
          const strict = LABEL_ATTRS.has(name);
          if (expr && ts.isArrayLiteralExpression(expr)) {
            for (const el of expr.elements) for (const s of stringsIn(el)) if (isHumanText(s.text, strict)) flag(s.node, `attr:${name}`, s.text);
          } else for (const s of stringsIn(expr)) if (isHumanText(s.text, strict)) flag(s.node, `attr:${name}`, s.text);
        }
      }
      if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
        // {cond ? 'Ha' : "Yo'q"}  /  {value || 'Noma\'lum'}  /  {`... ${x}`}
        for (const s of stringsIn(node.expression)) if (isHumanText(s.text, true)) flag(s.node, 'jsx-expr', s.text);
      }
      if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))) {
        const key = node.name.text;
        const inLabelObject = (() => {
          let p = node.parent;
          while (p && !ts.isVariableDeclaration(p) && !ts.isSourceFile(p)) p = p.parent;
          return p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && LABEL_VAR_RE.test(p.name.text);
        })();
        if (LABEL_PROPS.has(key) || GENERIC_PROPS.has(key) || inLabelObject)
          for (const s of stringsIn(node.initializer)) if (isHumanText(s.text, LABEL_PROPS.has(key))) flag(s.node, `prop:${key}`, s.text);
      }
      if (ts.isArrayLiteralExpression(node)) {
        let p = node.parent;
        while (p && (ts.isAsExpression(p) || ts.isParenthesizedExpression(p))) p = p.parent;
        if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && /(headers?|labels?|titles?|columns?)$/i.test(p.name.text))
          for (const el of node.elements) for (const s of stringsIn(el)) if (isHumanText(s.text, false)) flag(s.node, 'array', s.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

for (const f of files) scanFile(f);

// ───────────────────────── nav keys (resolved dynamically in Sidebar/Header, so check them explicitly) ─────────────────────────
{
  const navFile = path.join(SRC, 'components', 'layout', 'navItems.ts');
  if (fs.existsSync(navFile) && (!nsFilter.length || nsFilter.includes('layout'))) {
    const src = fs.readFileSync(navFile, 'utf8');
    const need = [
      ...[...src.matchAll(/key:\s*'(\w+)'/g)].map((m) => `nav.${m[1]}`),
      ...[...src.matchAll(/section:\s*'(\w+)'/g)].map((m) => `sections.${m[1]}`),
    ];
    for (const lang of LANGS)
      for (const key of need)
        if (!data[lang].layout?.[key]) err('nav-key', `${lang}/layout.json: missing "${key}" (used by components/layout/navItems.ts)`);
  }
}

// ───────────────────────── questions JSON import: dynamic key families ─────────────────────────
// ImportQuestionsModal resolves `import.errors.<code>` / `import.rules.<name>` at runtime, so the usual
// literal-key check cannot see them. Every IssueCode of importQuestions.ts must have a message in all languages.
{
  const file = path.join(SRC, 'pages', 'questions', 'importQuestions.ts');
  if (fs.existsSync(file) && (!nsFilter.length || nsFilter.includes('questions'))) {
    const src = fs.readFileSync(file, 'utf8');
    const union = src.match(/export type IssueCode =([\s\S]*?);/);
    const codes = union ? [...union[1].matchAll(/'(\w+)'/g)].map((m) => m[1]) : [];
    if (!codes.length) err('import-keys', 'could not read the IssueCode union from pages/questions/importQuestions.ts');
    const need = [
      ...codes.map((c) => `import.errors.${c}`),
      'import.errors.topic_not_found_any',
      ...['root', 'question', 'explanation', 'overrides', 'names', 'limits'].map((r) => `import.rules.${r}`),
    ];
    for (const lang of LANGS)
      for (const key of need)
        if (!data[lang].questions?.[key]) err('import-keys', `${lang}/questions.json: missing "${key}" (used dynamically by ImportQuestionsModal)`);
  }
}

// ───────────────────────── report ─────────────────────────
const section = (title, list) => {
  if (!list.length) return;
  console.log(`\n${title} (${list.length})`);
  for (const l of list) console.log('  ' + l);
};

section('ERRORS', errors);
if (wantHardcoded) section('HARD-CODED TEXT (route through t(), or add // i18n-ignore)', hardcoded);
section('WARNINGS', warnings);
if (args.includes('--verbose')) section('DYNAMIC KEYS (manual review)', unusedDynamic);

const nsCount = allNamespaces.size;
console.log(
  `\ni18n check: ${nsCount} namespaces × ${LANGS.length} languages, ${files.length} source files scanned — ` +
    `${errors.length} error(s), ${warnings.length} warning(s)` +
    (wantHardcoded ? `, ${hardcoded.length} hard-coded string(s)` : ''),
);
process.exit(errors.length ? 1 : 0);
