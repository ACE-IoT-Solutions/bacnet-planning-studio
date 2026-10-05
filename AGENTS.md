# BACnet Studio by ACE IoT

Conventions and daily commands for contributors/agents working on this repository.

## Toolchain

| Concern | Tool | Notes |
|---|---|---|
| Package/project manager | **uv** | Used to manage the Python environment |
| Dev web server (Node) | **Vite** | Primary local server for fast frontend dev |
| Local server (Python) | **http.server** | Fallback server for Python-only environments |
| Build backend | **Hatchling** | Python packaging |
| Python version | **3.13** | Pinned in `.python-version` |
| Lint + format | **Ruff** | Code quality for Python files |
| Frontend style | **Vanilla CSS** | Modern CSS variables, glassmorphism |

## Project Layout

```
.
├── CLAUDE.md                  # this file (AGENTS.md -> copy of it)
├── AGENTS.md                  # copy of CLAUDE.md
├── README.md                  # user documentation
├── pyproject.toml             # uv & Python packaging config
├── package.json               # Node dev tools config
├── tsconfig.json              # TypeScript compilation config
├── vite.config.js             # Vite compiler and Vue configuration
├── .python-version            # 3.13
├── index.html                 # main application template
├── style.css                  # application styling
├── dist/                      # compiled browser-ready production assets
├── src/
│   ├── main.ts                # Application entrypoint
│   ├── App.vue                # Main application component layout
│   ├── components/            # Vue Page and UI components
│   │   ├── CalculatorPage.vue
│   │   ├── PrimerPage.vue
│   │   ├── PlannerPage.vue
│   │   ├── diagram/           # Diagram editors, dialogs, diagnostics, and SVG views
│   │   ├── primer/            # Extracted primer sections and scenarios
│   │   └── TerminalLog.vue
│   ├── composables/           # Shared reactive project and handoff workflows
│   ├── lib/                   # TypeScript helper modules
│   │   ├── fixtures/          # Frozen schema-compatibility projects and baselines
│   │   ├── physical.ts        # Physical-layer schema and factories
│   │   ├── physical-*.ts      # Physical diagnostics, graph, limits, and layout
│   │   ├── subnet.ts          # IP calculations library
│   │   ├── planner.ts         # Planner logic & auto-size algorithm
│   │   └── export-xlsx.ts     # Dynamic Excel sheet builder
│   └── bacnet_network_calculator/
│       ├── __init__.py
│       └── main.py            # Python web server entry point
```

- Keep frontend files clean, modular, and performant.
- Avoid introducing Tailwind CSS; write raw CSS properties using custom properties (variables) defined in `style.css`.
- Python-side server code is kept under `src/`.

## Daily Commands

### Python Commands

```bash
uv sync                                               # Synchronize the Python environment
uv run python -m src.bacnet_network_calculator.main   # Serve the site using Python and open browser
uv run ruff check --fix .                             # Lint Python files
uv run ruff format .                                  # Format Python files
```

### Node / Frontend Commands

```bash
npm install                          # Install Vite dev tool dependencies
npm run dev                          # Run local Vite development server
npm run build                        # Package static application into dist/
npm run preview                      # Preview local production build
npm test                             # Run unit tests via Vitest
```

## Conventions

- Validate IP inputs at the network boundary (`src/lib/subnet.ts`).
- Linear packet interpolation is driven dynamically by coordinate maps using `requestAnimationFrame` inside Vue components.
- State management and previews are handled reactively by Vue 3 components.
- Follow semantic versioning for releases.
- All documentation updates go to `README.md` or dedicated `docs/` files, never loose markdown in root.
