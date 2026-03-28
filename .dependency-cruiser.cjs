/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are forbidden.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-no-dependencies',
      severity: 'error',
      comment: 'The core package should not depend on other local packages.',
      from: { path: '^core/src' },
      to: { path: '^(canvas|editor|renderer)/src' },
    },
    {
      name: 'canvas-only-core',
      severity: 'error',
      comment: 'The canvas package should only depend on core.',
      from: { path: '^canvas/src' },
      to: { path: '^(editor|renderer)/src' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.base.json',
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
      archi: {
        collapsePattern: '^(core|canvas|editor|renderer)/src/[^/]+',
      },
    },
  },
};
