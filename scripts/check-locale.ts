import { en } from '../src/i18n/en.ts';
import { zh } from '../src/i18n/zh.ts';

/*
 * Fails when a Chinese text reads the same as its English one, which is how an untranslated text shows, and when a
 * count's text lacks one of its two plural forms. The type checker already makes both catalogues the same shape, so
 * only the Chinese one is read for the plural forms.
 */

/** The plural forms every text of a count has, which i18next picks by the count. */
const PLURAL_FORMS = ['_one', '_other'];

/** Keys whose Chinese and English texts are meant to read the same, each with the reason. */
export const SAME_TEXT_ALLOWED = new Map<string, string>([
  ['landing.stageEyebrow', 'only placeholders and a separator'],
  ['landing.halfCode.dev', 'a code, set in Latin letters in every language'],
  ['landing.halfCode.ops', 'a code, set in Latin letters in every language'],
  ['landing.updates.0.date', 'a date in ISO form'],
  ['landing.updates.1.date', 'a date in ISO form'],
  ['landing.updates.2.date', 'a date in ISO form'],
]);

/** Every text of a catalogue, keyed by its dotted path. */
export function textsOf(catalogue: object, prefix = ''): [string, string][] {
  return Object.entries(catalogue).flatMap(([key, value]): [string, string][] => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [[path, value]] : textsOf(value, path);
  });
}

const english = new Map(textsOf(en));
const chinese = textsOf(zh);
const sameTexts = chinese.filter(([path, text]) => english.get(path) === text);
const untranslated = sameTexts.filter(([path]) => !SAME_TEXT_ALLOWED.has(path));
const staleAllowances = [...SAME_TEXT_ALLOWED.keys()].filter(path => !sameTexts.some(([samePath]) => samePath === path));
const paths = new Set(chinese.map(([path]) => path));
const missingForms = chinese.flatMap(([path]) => {
  const form = PLURAL_FORMS.find(suffix => path.endsWith(suffix));
  const stem = form && path.slice(0, -form.length);
  return stem === undefined ? [] : PLURAL_FORMS.map(suffix => `${stem}${suffix}`).filter(other => !paths.has(other));
});
for (const [path, text] of untranslated) {
  console.log(`untranslated  ${path}: ${JSON.stringify(text)}; a text meant to read the same goes into SAME_TEXT_ALLOWED with its reason`);
}
for (const path of staleAllowances) {
  console.log(`no longer the same, remove it from SAME_TEXT_ALLOWED  ${path}`);
}
for (const path of new Set(missingForms)) {
  console.log(`missing plural form  ${path}: a count's text has both ${PLURAL_FORMS.join(' and ')}`);
}
if (untranslated.length > 0 || staleAllowances.length > 0 || missingForms.length > 0) {
  process.exit(1);
}
console.log(`All ${english.size} texts are translated.`);
