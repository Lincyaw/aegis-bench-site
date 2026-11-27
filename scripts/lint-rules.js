// The site's own lint rules, for conventions oxlint's built-in rules cannot state; .oxlintrc.json loads them.

/** A string that starts like a site path, such as "/benchmarks"; the home page "/" alone is not one. */
const SITE_PATH = /^\/[a-z]/;

/** Han characters, which only the catalogues and the records may hold. */
const HAN = /\p{Script=Han}/u;

/** A call of a hook, by the naming rule hooks follow. */
const HOOK = /^use[A-Z]/;

/** The modules whose hooks a component may call: React, the locale, the design system and the component's own directory. */
const HOOK_MODULES = /^(react|react-i18next|\.\/.*|(\.\.\/)+(i18n|ui)(\/.*)?)$/;

const HOOK_MESSAGE = 'A component reads data only through a `source` its page passes (`source.useXxx(...)`): a hook taken as a prop or imported from the API makes the component fetch for itself, and the page can no longer see what the component reads.';

export default {
  meta: { name: 'aegis' },
  rules: {
    'paths-from-routes': {
      meta: { type: 'problem', docs: { description: 'Every site path is built by src/routes, so a page or a component never spells one.' } },
      create(context) {
        const report = node => context.report({ node, message: 'Build site paths with src/routes, so a change of address happens in one place and every link to a page can be found.' });
        return {
          Literal(node) {
            if (typeof node.value === 'string' && SITE_PATH.test(node.value)) {
              report(node);
            }
          },
          TemplateLiteral(node) {
            if (SITE_PATH.test(node.quasis[0].value.cooked ?? '')) {
              report(node);
            }
          },
        };
      },
    },
    'hooks-from-own-modules': {
      meta: { type: 'problem', docs: { description: 'A component calls hooks of React, of the design system, of the locale and of its own directory, or of the source its page passes.' } },
      create(context) {
        const importedFrom = new Map();
        const declaredHere = new Set();
        const bareCalls = [];
        const isSource = object => (object.type === 'Identifier' && object.name === 'source') || (object.type === 'MemberExpression' && object.property.name === 'source');
        return {
          ImportDeclaration(node) {
            for (const specifier of node.specifiers) {
              importedFrom.set(specifier.local.name, node.source.value);
            }
          },
          FunctionDeclaration(node) {
            if (node.id && node.parent.type !== 'FunctionDeclaration') {
              declaredHere.add(node.id.name);
            }
          },
          CallExpression(node) {
            const { callee } = node;
            if (callee.type === 'MemberExpression') {
              if (HOOK.test(callee.property.name ?? '') && !isSource(callee.object)) {
                context.report({ node, message: HOOK_MESSAGE });
              }
              return;
            }
            if (callee.type === 'Identifier' && HOOK.test(callee.name)) {
              bareCalls.push(node);
            }
          },
          // A hook declared below the component that calls it is only known once the whole file is read.
          'Program:exit'() {
            for (const node of bareCalls) {
              const from = importedFrom.get(node.callee.name);
              if (from === undefined ? !declaredHere.has(node.callee.name) : !HOOK_MODULES.test(from)) {
                context.report({ node, message: HOOK_MESSAGE });
              }
            }
          },
        };
      },
    },
    'no-typed-symbols': {
      meta: {
        type: 'problem',
        docs: { description: 'Arrows, crosses and the like are icons from src/ui/icons.tsx, never typed characters.' },
        schema: [{ type: 'object', properties: { symbols: { type: 'string' } }, required: ['symbols'], additionalProperties: false }],
      },
      create(context) {
        const [{ symbols }] = context.options;
        const typed = new RegExp(`[${symbols}]`, 'u');
        const report = node => context.report({ node, message: 'Draw arrows, crosses and the like with an icon from src/ui/icons.tsx: a typed character takes the font\'s shape and weight, not the site\'s 16px line icons, and moves with neither the text colour nor the hover.' });
        return {
          JSXText(node) {
            if (typed.test(node.value)) {
              report(node);
            }
          },
          Literal(node) {
            if (typeof node.value === 'string' && typed.test(node.value)) {
              report(node);
            }
          },
          TemplateElement(node) {
            if (typed.test(node.value.cooked ?? '')) {
              report(node);
            }
          },
        };
      },
    },
    'english-comments': {
      meta: { type: 'suggestion', docs: { description: 'Comments are written in English; the texts readers see live in the catalogues.' } },
      create(context) {
        return {
          Program() {
            for (const comment of context.sourceCode.getAllComments()) {
              if (HAN.test(comment.value)) {
                context.report({ loc: comment.loc, message: 'Write comments in English; Chinese belongs in the locale catalogues and the records.' });
              }
            }
          },
        };
      },
    },
  },
};
