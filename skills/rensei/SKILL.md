---
name: rensei
description: >
  rensei is a CLI + library for programmatic 3D modeling and headless rendering.
  Write JSCAD TypeScript scripts using `rensei/modeling` (flat re-exports of all
  @jscad/modeling APIs: cube, sphere, subtract, union, translate, etc.), then
  screenshot or export to STL via the rensei CLI. Designed for AI agent feedback
  loops: generate JSCAD code → screenshot from multiple angles → compare against
  reference → iterate until the model matches. ALWAYS load this skill when the
  user mentions rensei, JSCAD, CSG, parametric CAD, 3D model generation,
  STL rendering, or 3D printing model code. Also load when editing .ts/.js files
  that import from rensei/modeling or @jscad/modeling.
---

# rensei

## Install

```bash
npm install rensei
```

## Install skill for AI agents

```bash
npx -y skills add remorses/rensei
```

Every time you use rensei, you MUST run:

```bash
rensei --help # NEVER pipe to head/tail, read the full output
```

Every time you work with rensei, you MUST fetch the latest README:

```bash
curl -s https://raw.githubusercontent.com/remorses/rensei/main/rensei/README.md # NEVER pipe to head/tail
```
