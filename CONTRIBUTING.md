# Contributing to SecureX Platform

Thank you for your interest in contributing to SecureX. This guide covers the conventions and workflow for getting changes into the codebase.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/securex-platform.git
   cd securex-platform
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch from the relevant team branch (see below)

## Branch Strategy

The repository uses three long-lived feature branches plus a stable `main`:

| Branch | Scope | Maintained By |
| --- | --- | --- |
| `main` | Stable production-ready foundation | All (via merges) |
| `frontend/public-verification` | Public website, landing pages, and credential verification UI | Public/Verification team |
| `frontend/institution-employer` | Institution dashboard, credential issuance, and employer verification tools | Institution/Employer team |
| `frontend/holder-admin` | Holder digital wallet, admin console, and shared UI components | Holder/Admin team |

Work in progress stays on your team's feature branch. Only ready-to-release code is merged into `main`.

## Development Workflow

1. Pull the latest changes on your team's feature branch:
   ```bash
   git checkout frontend/your-team-branch
   git pull origin frontend/your-team-branch
   ```
2. Create a feature branch from there:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Make your changes
4. Run quality checks before committing:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   ```
5. Commit with a conventional message (see below)
6. Push and open a Pull Request against your team's feature branch

## Code Standards

- **TypeScript strict mode** - All code must pass `tsc --noEmit` with no errors
- **Functional components** - Use React function components and hooks only; no class components
- **Tailwind CSS** - All styling via Tailwind utility classes; avoid inline styles
- **Component tests required** - New components must include corresponding test files
- **No secrets in code** - Never commit API keys, passwords, or tokens; use environment variables

## Project Structure Conventions

```
features/[feature-name]/
├── pages/          # Page components (each page is a lazy-loaded route)
├── components/     # Feature-specific shared components (optional)
└── hooks/          # Feature-specific hooks (optional)
```

| Location | Purpose |
| --- | --- |
| `features/[name]/pages/` | Page components for each route |
| `components/ui/` | Reusable UI primitives shared across features |
| `components/layout/` | Layout shells (navbar, sidebar, topbar, public layout) |
| `services/api/` | API service modules (one per domain) |
| `services/mock/` | Mock data and mock API handlers |
| `types/` | TypeScript interfaces and type definitions |
| `constants/` | Route paths, navigation maps, role constants |
| `hooks/` | Shared custom React hooks |
| `utils/` | Pure utility functions (no React dependencies) |

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use | Example |
| --- | --- | --- |
| `feat:` | New feature or capability | `feat: add credential share QR modal` |
| `fix:` | Bug fix | `fix: correct status badge color for SUSPENDED` |
| `docs:` | Documentation only | `docs: update README route table` |
| `refactor:` | Code restructuring with no behavior change | `refactor: extract form validation hook` |
| `test:` | Adding or updating tests | `test: add VerifyPage integration tests` |
| `style:` | Formatting or style-only changes | `style: fix indentation in Sidebar.tsx` |
| `chore:` | Tooling, config, CI changes | `chore: update vitest config` |

## Testing

- Run the full test suite: `npm run test`
- Run tests in watch mode during development: `npm run test:watch`
- View coverage: `npm run test:coverage`
- Place test files next to the source they test (e.g., `Button.test.tsx` beside `Button.tsx`)
- Use React Testing Library for component tests; prefer `userEvent` over `fireEvent`

## Questions

Open a GitHub issue or reach out to the maintainers if anything in this guide is unclear.
