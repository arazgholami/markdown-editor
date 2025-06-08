module.exports = {
  // Indicates whether each individual test should be reported during the run
  verbose: true,

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // A map from regular expressions to paths to transformers
  // This tells Jest to use babel-jest for .js files
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  // Default: /node_modules/
  // We need to transform 'marked' and 'turndown' as they are likely ESM.
  transformIgnorePatterns: [
    "/node_modules/(?!(marked|turndown)/)", // Transform marked and turndown, ignore others in node_modules
    "\\.pnp\\.[^\\/]+$"
  ],

  // Module file extensions for Jest to look for
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  // moduleNameMapper: {
    // '^jest-environment-jsdom$': 'jest-environment-jsdom', // No longer needed
  // },

  // Some modules (like marked, turndown) might be distributed as ESM,
  // Jest's experimental ESM support can be tricky with CommonJS (which our editor is).
  // If we encounter issues with these modules, we might need to tell Jest to transform them.
  // For now, we'll assume babel-jest handles commonjs `require` correctly.
  // If 'marked' or 'turndown' cause "SyntaxError: Unexpected token 'export'" or similar,
  // we'd add them to `transformIgnorePatterns` in a negative way, e.g.
  // transformIgnorePatterns: ['/node_modules/(?!marked|turndown)/'],
};
