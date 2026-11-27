// The site's own lint rules, for conventions oxlint's built-in rules cannot state; .oxlintrc.json loads them.

/** A string that starts like a site path, such as "/benchmarks"; the home page "/" alone is not one. */
const SITE_PATH = /^\/[a-z]/;

/** Han characters, which only the catalogues and the records may hold. */
const HAN = /\p{Script=Han}/u;

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
