# Contributing to SecureX Platform

Thank you for your interest in contributing to **SecureX** — the Blockchain-Powered Digital Credential Trust Network.

This guide defines the repository governance, access model, branch ownership, and contribution workflow for the SecureX Platform repository.

## Repository Ownership

**Savan Patel** is the sole repository administrator and backend owner of `SecureX-Network/securex-platform`.

Savan is responsible for:

- Backend development
- API integration
- Authentication backend
- Database integration
- Blockchain integration
- Fraud-engine integration
- Security backend
- Platform architecture
- Production configuration
- Secrets and environment configuration
- Pull-request approval and merging
- `main` branch management

## Repository Purpose

`SecureX-Network/securex-platform` is the **full product repository** containing the SecureX web platform: the React/TypeScript frontend plus its backend/integration layers (REST APIs, database, authentication backend, blockchain integration, credential lifecycle, fraud/AI, document tampering detection, and attack simulation).

The application code is a **completed-and-verified V1 foundation**. This repository is shared by 7 developers across two ownership groups: one backend/integration owner and six frontend engineers.

## Team Ownership Model

SecureX has 7 developers with clearly separated responsibilities.

### Savan — Repository Owner / Backend / Integration Owner

Savan owns **all backend and integration work**:

- Backend and REST APIs
- PostgreSQL / database
- Authentication backend and Authorization backend
- SecureX blockchain integration
- Credential lifecycle backend
- Issuer management backend
- Security backend
- Fraud / risk backend and AI/ML backend
- Document tampering detection backend
- Credential fingerprint backend
- Blockchain Explorer backend
- Attack Simulation backend
- Network backend
- API contracts
- Production configuration
- Secrets and environment configuration
- Frontend/backend integration
- Pull-request approval and merging
- Final integration into `main`

**Savan may commit directly to `main`.** Savan is the only repository administrator with Owner/Admin access.

### Six Frontend Engineers

The other six developers are **frontend-only**. They receive **Write access ONLY to `securex-platform`**. They must **NOT** receive access to:

- `securex-blockchain`
- `securex-fraud-engine`
- Any other private SecureX repository unless explicitly required later

Write access to `securex-platform` is sufficient for:

- Clone / pull
- Create local branches
- Push assigned branches
- Open Pull Requests
- Review frontend code
- Run tests / builds locally

They do **not** need Admin, Maintain, or Owner access.

Frontend engineers must **NOT** independently create:

- Backend servers or databases
- Blockchain implementations
- Authentication servers
- Fraud engines or AI/ML services
- Alternative API architectures / parallel backend folders
- Duplicate service layers

If backend functionality is unavailable, frontend engineers must **coordinate with Savan** and use the existing API abstraction / mock layer until the real API is ready.

## Branch Strategy

Six long-lived frontend branches plus a stable integrated `main`. **All branches currently originate from `889c300`** (the verified V1 foundation).

```
main
├── frontend/public-verification
├── frontend/institution-employer
├── frontend/holder-admin
├── frontend/security-center
├── frontend/fraud-tampering
└── frontend/explorer-simulation
```

- **`main`** — the integrated, production-oriented development branch. It contains the complete SecureX Platform. Savan commits backend/integration work here directly; frontend changes arrive via Pull Requests.
- **Frontend branches** — engineers work on their assigned branch and merge into `main` via Pull Requests. They do **not** push directly to `main`.

### Branch Ownership

Primary routes are listed under each engineer's scope.

| Engineer | Branch | Owns (frontend UI) | Primary routes |
| --- | --- | --- | --- |
| **Engineer 1** | `frontend/public-verification` | Public website, About, How It Works, Contact, credential verification, QR verification UI, verification results, credential details, issuer information, credential status, blockchain proof display | `/`, `/about`, `/how-it-works`, `/contact`, `/verify`, `/verify/:credentialId` |
| **Engineer 2** | `frontend/institution-employer` | Institution dashboard, credential management, credential issuance UI, bulk issuance UI, issuer management, credential templates, institution audit UI, employer dashboard, employer verification, verification history | `/institution/*`, `/employer/*` |
| **Engineer 3** | `frontend/holder-admin` | Digital credential wallet, holder dashboard, credential details, credential sharing, QR display, notifications, holder settings, Admin dashboard, institution administration, user administration, security administration UI | `/holder/*`, `/admin/*` |
| **Security/AI Engineer 1** | `frontend/security-center` | Security Center: security dashboard, security alerts, security events, risk overview, suspicious activity UI, threat indicators, security status, security visualizations | `frontend/security-center` scope |
| **Security/AI Engineer 2** | `frontend/fraud-tampering` | Fraud dashboard, fraud/risk UI, suspicious credential UI, risk score visualization, risk explanation UI, document tampering results, credential fingerprint results, fraud history, security warnings | `frontend/fraud-tampering` scope |
| **Security/AI Engineer 3** | `frontend/explorer-simulation` | Blockchain Explorer, block list, block details, transaction list, transaction details, validator/network status, network security visualization, Attack Simulation UI, security event visualization | `frontend/explorer-simulation` scope |

> **Note on "Security/AI" role naming:** Engineers 4, 5, and 6 are called Security/AI engineers for project-role purposes, but their **implementation responsibility in this repository is FRONTEND UI only**. The actual fraud, AI, tampering, fingerprint, blockchain, and attack-simulation logic is implemented by **Savan on the backend** and belongs in the appropriate backend repositories.

## Repository Boundaries

SecureX is split across separate repositories by responsibility. **One repository, one responsibility.**

| Repository | Purpose | Who works here |
| --- | --- | --- |
| `securex-platform` | Frontend + platform integration (this repository) | All frontend engineers + Savan (backend/integration) |
| `securex-blockchain` | SecureX custom permissioned blockchain and cryptographic trust infrastructure | Savan / backend |
| `securex-fraud-engine` | Fraud detection, risk analysis, tampering detection, fingerprinting and security intelligence | Savan / backend |
| `securex-docs` | Master documentation, architecture, presentations and project documentation | Savan / team |

Team members should only receive access to repositories required for their assigned responsibilities.

## Security Principle

Use **least privilege**.

A frontend engineer needs:

- `securex-platform` → **Write**

They do **not** need:

- `securex-blockchain` → No access
- `securex-fraud-engine` → No access

...unless Savan explicitly changes their responsibility.

```
                    Savan Patel
                         │
              ┌──────────┴──────────┐
              │                     │
        Backend / Core         Platform Owner
              │                     │
      ┌───────┴────────┐            │
      │                │            │
 Blockchain       Fraud Engine      │
      │                │            │
      └────────────────┴────────────┘
                       │
                securex-platform
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Frontend       Frontend       Frontend
      Team 1         Team 2         Team 3
        │              │              │
   Public/Verify  Institution/    Holder/Admin
                  Employer
```

All frontend contributors are restricted to the platform repository from an organizational-access perspective.

**Access rule:** Frontend developers build the product. Savan owns the infrastructure behind the product.

## Development Workflow

### Sync your branch with `main` (especially after backend/API changes)

```bash
git switch main
git pull origin main
git switch <assigned-branch>
git merge main
```

Resolve any conflicts carefully (see [Merge Conflicts](#merge-conflicts)). Do **not** force push.

### Daily development loop

```bash
git status
git diff
npm run dev
npm test
npm run build
```

### Before committing

```bash
git status
git diff
```

Stage and commit only related, focused changes:

```bash
git add .
git commit -m "feat: <description>"
git push origin <assigned-branch>
```

### Open a Pull Request

Open a Pull Request: **`<assigned-branch>` → `main`**.

Never edit against `main` directly if you are a frontend engineer.

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/)-style messages. Keep commits **focused and descriptive**.

| Scope | Example |
| --- | --- |
| `feat:` | `feat: add credential verification result UI` |
| `feat:` | `feat: add institution credential table` |
| `feat:` | `feat: add holder credential sharing flow` |
| `feat:` | `feat: add security alerts dashboard` |
| `feat:` | `feat: add fraud risk visualization` |
| `feat:` | `feat: add blockchain transaction details` |
| `fix:` | `fix: correct credential status rendering` |
| `fix:` | `fix: resolve mobile wallet layout issue` |
| `style:` | `style: improve verification result layout` |
| `style:` | `style: refine admin dashboard spacing` |
| `test:` | `test: add verification page coverage` |
| `docs:` | `docs: update frontend development guide` |
| `refactor:` | `refactor: simplify credential card state handling` |

## Pull Request Rules

Every frontend PR should:

- **Target `main`**
- Clearly describe the UI changes
- Include screenshots for significant UI changes
- Pass TypeScript checks
- Pass tests
- Pass the production build
- Avoid unrelated files
- Avoid backend changes unless explicitly coordinated with Savan
- Avoid secrets or credentials

Savan performs the **final integration review** on every PR.

Each PR should include:

- **Title** — a clear description, e.g. `feat: add credential verification experience`.
- **Description** — what changed, why it changed, screens/pages affected, tests performed, build/lint status, any backend/API dependency, and screenshots for major UI changes.

### PR checklist (required to confirm)

- [ ] I worked only within my assigned scope.
- [ ] I did not introduce backend logic or parallel backend architecture.
- [ ] I did not commit secrets.
- [ ] I tested the affected UI.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] TypeScript passes.
- [ ] No unnecessary dependencies were added.
- [ ] No unrelated files were modified.
- [ ] UI is responsive where applicable.
- [ ] Mock data is clearly treated as demo data.

## Merge Conflicts

If `main` has changed:

```bash
git switch main
git pull origin main
git switch <assigned-branch>
git merge main
```

Resolve conflicts carefully. **Never use `git push --force`.**

If the conflict involves backend/API/shared architecture and you are unsure how to resolve it, **stop and coordinate with Savan**.

## Main Branch Safety

`main` is the **stable integration branch**. Frontend contributors must not intentionally push directly to `main`.

Frontend engineers must always merge into `main` via Pull Requests (see [Pull Request Rules](#pull-request-rules)). They do not push directly to `main`.

**Expected workflow:**

```
git checkout assigned-branch
        ↓
Develop
        ↓
Run tests
        ↓
Commit
        ↓
Push assigned branch
        ↓
Open Pull Request
        ↓
Savan reviews
        ↓
Savan merges
```

**Never:**

- Force push
- Rewrite history
- Amend shared commits
- Make direct production changes

**Recommended GitHub branch protection for `main`** (to be enabled once the GitHub plan permits repository rules — private repos on the GitHub Free plan do not support branch protection via API; enables the checkbox in the repository **Settings → Branches** page if available):

- Prevent force pushes
- Prevent branch deletion
- Require Pull Requests for frontend contributors
- Require successful CI checks once CI is available
- Require review for frontend PRs

**Important:** Savan must retain direct push access to `main` for backend/integration work. Do not enable a protection rule that prevents Savan from performing the agreed backend workflow. Configure any rule with an admin bypass (Savan is a repository admin) or otherwise exempt Savan.

Until branch protection is enabled, the workflow **relies on team discipline**: frontend engineers merge to `main` only via Pull Requests, and only Savan pushes to `main` directly.

## Team Responsibilities

| Role | Responsibility |
| --- | --- |
| **Savan** | Backend + Blockchain + Database + APIs + Security + AI + Integration |
| **Engineer 1** | Public Website + Verification |
| **Engineer 2** | Institution + Employer |
| **Engineer 3** | Holder + Admin |
| **Engineer 4** | Security Center (frontend UI) |
| **Engineer 5** | Fraud + Tampering (frontend UI) |
| **Engineer 6** | Explorer + Attack Simulation (frontend UI) |

## Backend Change Notification

Whenever Savan makes a breaking API change, he should communicate to frontend engineers:

- Endpoint
- HTTP method
- Request shape
- Response shape
- Authentication requirements
- Error format
- Example response
- Frontend impact
- Migration instructions

Frontend engineers should then update their branches from `main` (see [Development Workflow](#development-workflow)).

## Security Rules

**Never commit:**

- Passwords
- API keys
- Access tokens
- Private keys
- `.env` files containing real secrets
- Database credentials
- Cloud credentials
- Blockchain private keys
- Production credentials

Use `.env.example` with placeholders only.

### If a secret is accidentally committed

1. **Stop**.
2. Do **not** simply delete it from the latest file.
3. **Inform Savan** immediately.
4. Rotate/revoke the exposed credential.
5. Remove it from history using an appropriate repository-maintenance process.

## Frontend / Backend API Boundary

Frontend communication is strictly isolated through the existing service layer:

- Real API communication → `services/api/`
- Isolated demo / mock behavior → `services/mock/`

Do **not** place raw backend implementation inside frontend feature folders. Do not create duplicate API clients. Do not bypass the existing service abstraction unless explicitly approved by Savan.

Flow when the backend contract is not ready:

```
UI → existing API service abstraction → mock implementation
```

Flow when the real backend is available:

```
UI → existing API service abstraction → real SecureX API
```

The UI should **not** need to be rewritten merely because mock services are replaced with real services.

## Shared Component Rules

The existing shared UI system is the canonical UI foundation:

- `components/ui/`
- `components/layout/`
- `components/shared/`

**Before creating a component**, check these directories to avoid duplicates. If a genuinely reusable component is needed, coordinate before adding it to shared components. Feature-specific components should remain inside their respective feature area. **Avoid modifying shared components casually** — changes can affect all six workstreams.

## Code Standards

- **TypeScript strict mode** — all code must pass `tsc --noEmit` with no errors.
- **Functional components** — React function components and hooks only.
- **Tailwind CSS** — all styling via Tailwind utility classes; avoid inline styles.
- **Component tests required** — new components should include corresponding test files.
- **No secrets in code** — never commit API keys, passwords, or tokens; use environment variables.

## Testing

- Run the full test suite: `npm run test`
- Run tests in watch mode during development: `npm run test:watch`
- View coverage: `npm run test:coverage`
- Place test files next to the source they test (e.g., `Button.test.tsx` beside `Button.tsx`)
- Use React Testing Library for component tests; prefer `userEvent` over `fireEvent`

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
| `components/shared/` | Shared page-level components |
| `services/api/` | API service modules (one per domain) |
| `services/mock/` | Mock data and mock API handlers |
| `types/` | TypeScript interfaces and type definitions |
| `constants/` | Route paths, navigation maps, role constants |
| `hooks/` | Shared custom React hooks |
| `utils/` | Pure utility functions (no React dependencies) |

## Definition of Done

A frontend feature is complete when:

- UI is implemented
- Responsive behavior is verified
- Loading state exists where required
- Empty state exists where required
- Error state exists where required
- Accessibility basics are handled
- Mock/API boundary is preserved
- Tests pass
- Build passes
- PR is pushed to the assigned branch
- PR is reviewed and merged by Savan

## Core Rule

**One repository, one responsibility.**

- Frontend developers work in: `securex-platform`
- Blockchain engineers / backend work belongs to: `securex-blockchain`, `securex-fraud-engine`
- Documentation belongs to: `securex-docs`

This separation keeps SecureX modular, secure and manageable while allowing the six-person team to work in parallel.

## Questions

Open a GitHub issue or reach out to the maintainers (Savan) if anything in this guide is unclear.
