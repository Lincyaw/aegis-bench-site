/**
 * Tokens are the only source of visual truth: component CSS takes every colour, size and duration from the tokens
 * in src/ui, and every custom property it reads must be defined somewhere.
 */
const TOKEN_FILES = ['src/ui/tokens.css', 'src/ui/base.css'];

/** Properties a library sets on the elements it renders, for the stylesheet to read. */
const LIBRARY_PROPERTIES = {
  customProperties: {
    '--radix-select-trigger-width': '',
    '--radix-select-content-available-height': '',
  },
};

export default {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-value-no-unknown-custom-properties'],
  ignoreFiles: ['dist/**', 'node_modules/**'],
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    // px survives only as a media query breakpoint, because custom properties cannot be used inside @media.
    'unit-disallowed-list': [['px', 'ms', 's'], { ignoreMediaFeatureNames: { px: ['max-width', 'min-width'] } }],
    'csstools/value-no-unknown-custom-properties': [true, { importFrom: [...TOKEN_FILES, LIBRARY_PROPERTIES] }],
    // Breakpoints are written the way the scripts' media queries are, as max-width.
    'media-feature-range-notation': null,
    // CSS modules scope their own class names, and a module reaches a drawing's plain classes through :global.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    // The stylesheets keep short rules on one line.
    'declaration-block-single-line-max-declarations': null,
    'declaration-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'rule-empty-line-before': null,
    'comment-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'no-descending-specificity': null,
  },
  overrides: [
    {
      // The token files define the raw values everything else reads.
      files: TOKEN_FILES,
      rules: { 'color-no-hex': null, 'unit-disallowed-list': null },
    },
  ],
};
