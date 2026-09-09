# SecureX Platform

> Blockchain-Powered Digital Credential Trust Network

SecureX is a decentralized platform for issuing, managing, verifying, and sharing digital credentials on a blockchain ledger. Institutions issue tamper-proof credentials, holders store them in a digital wallet, employers verify them instantly, and anyone can audit the chain through the block explorer.

## Features

- **Public Website** - Marketing pages explaining the platform, how it works, and contact information
- **Credential Verification** - Public credential lookup and verification by credential ID or QR code
- **Institution/Issuer Management** - Issue credentials from templates, manage issuers, track issuance metrics
- **Holder Digital Wallet** - Store, view, share, and manage credentials with real-time notifications
- **Employer Verification Tools** - Verify candidate credentials, track verification history and risk scores
- **Admin Management Console** - Manage institutions, issuers, users, security alerts, audit logs, and platform settings
- **Blockchain Explorer** - Browse blocks, transactions, and on-chain credential activity in real time

## Tech Stack

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router v6](https://reactrouter.com/)
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)
- [Lucide React](https://lucide.dev/) (icons)
- Backend: [Express 5](https://expressjs.com/) + [node-postgres](https://node-postgres.com/) with a [PostgreSQL](https://www.postgresql.org/) database

## Requirements

- Node.js 20+ (Node 22.5+ only to run the optional SQLite → PostgreSQL import utility)
- npm 9+
- PostgreSQL 14+ (local dev; Render Managed PostgreSQL in production)

## Installation

```bash
git clone https://github.com/SecureX-Network/securex-platform.git
cd securex-platform
npm install
```

## Development

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000)

### 1. Start PostgreSQL

The Platform API persists to PostgreSQL (Render Managed PostgreSQL in
production). Locally, any PostgreSQL 14+ listening on TCP works. On macOS with
Homebrew:

```bash
brew install postgresql@17           # if not already installed
brew services start postgresql@17
createdb securex                      # development database
createdb securex_test                 # integration-test database (dedicated)
```

### 2. Run the API

```bash
npm run server        # tsx dev runner on http://localhost:4000
```

On a fresh database the server applies the schema and seeds the canonical demo
domain data automatically (`SEED_ON_BOOT=true`), then never reseeds. The
default connection strings are:

- Development: `postgres://localhost:5432/securex`
- Tests: `postgres://localhost:5432/securex_test` (overridable via
  `TEST_DATABASE_URL` or `DATABASE_URL`)

Override with the same `DATABASE_URL` / backend variables documented below.

### 3. Tests (backend needs the test database)

```bash
npm run test:server   # Express API integration tests against securex_test
npm run test:all      # lint + typecheck + unit + server tests + builds
```

The test suite refuses to run against any database whose name does not contain
`test`, so it can never wipe development or production data.

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start development server (Vite, port 3000) |
| `npm run build` | Production build (TypeScript + Vite) |
| `npm run build:server` | Compile the API server to `dist-server/` |
| `npm start` | Run the compiled API server (`node dist-server/index.js`) |
| `npm run server` | Run the API server via tsx (development) |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run unit tests once |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with coverage report |
| `npm run test:server` | Run Express API integration tests (PostgreSQL) |
| `npm run test:all` | Lint + typecheck + all tests + builds |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run import:sqlite` | Migrate an existing SQLite database into PostgreSQL |

## Environment Variables

Copy `.env.example` to `.env` and configure as needed:

```bash
cp .env.example .env
```

Frontend variables (prefix `VITE_`, inlined at build time by Vite — never put
secrets in these):

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | Platform API endpoint |
| `VITE_BLOCKCHAIN_API_URL` | `http://localhost:3001` | SecureX Blockchain endpoint |
| `VITE_FRAUD_ENGINE_URL` | `http://localhost:4002/fraud` | Fraud engine endpoint |
| `VITE_USE_MOCK` | `true` | `true` = demo/mock mode, `false` = real services |

Backend variables (read from the process environment at server runtime):

| Variable | Default | Description |
| --- | --- | --- |
| `APP_ENV` | `development` | `production` enables fail-closed rules |
| `PORT` | `4000` | HTTP port |
| `HOST` | `localhost` | Bind host (`0.0.0.0` on Render) |
| `DATABASE_URL` | `postgres://localhost:5432/securex` | PostgreSQL connection (required in production) |
| `DATABASE_POOL_MAX` | `10` | Connection pool size |
| `TEST_DATABASE_URL` | `postgres://localhost:5432/securex_test` | Integration-test database |
| `DATA_MODE` | `demo` | `real` or `demo`; `demo` is forbidden in production |
| `JWT_SECRET` | dev fallback | JWT signing secret (required in production) |
| `CORS_ORIGINS` | `http://localhost:3000` | Exact allowed browser origins, comma-separated |
| `SEED_ON_BOOT` | `true` | Seed canonical demo data on a **fresh** database only |
| `BLOCKCHAIN_API_URL` | `http://localhost:3001` | Blockchain service health probe target |
| `FRAUD_ENGINE_URL` | `http://localhost:4002/fraud` | Fraud engine health probe target |

## PostgreSQL Deployment (Render)

The repository ships a [Render Blueprint](render.yaml): a managed PostgreSQL
database plus a Node Web Service for the API, which also provisions the custom
domain `api-securex.sp-net.in`.

```bash
render blueprint launch
```

Required production environment (also validated by `render.yaml`):

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `DATA_MODE` | `real` |
| `DATABASE_URL` | Inject from the Render database (`property: connectionString`) |
| `JWT_SECRET` | Generate once in the dashboard (Render persists it) |
| `CORS_ORIGINS` | `https://app-securex.sp-net.in` (the Vercel frontend) |
| `HOST` | `0.0.0.0` (Render sets `PORT`) |
| `SEED_ON_BOOT` | `true` (seed happens only on the very first fresh database) |
| `BLOCKCHAIN_API_URL` | Deployed Blockchain service URL |
| `FRAUD_ENGINE_URL` | Deployed Fraud Engine service URL |

Production behavior (fail closed):

- Startup refuses if `DATABASE_URL`, `JWT_SECRET`, or `CORS_ORIGINS` are
  unset, if `JWT_SECRET` is the dev fallback, if `CORS_ORIGINS` contains `*`,
  or if `DATA_MODE` is `demo`.
- CORS is an exact allowlist; requests from other origins get no
  `Access-Control-Allow-Origin` header and are rejected by browsers.
- Seeding is idempotent and insert-only: the schema tracks a
  `schema_meta.seeded` marker and never overwrites existing rows on redeploys.
- Public demo verification IDs are preserved exactly
  (`SX-2F9C-A41B-8D7E`, `SX-7A31-C0E4-19F6`, `SX-4B8D-6A2F-C701`,
  `SX-9C4E-2D80-5A31`, `SX-3A17-B9F2-6D48`, `SX-8E50-1C73-A9B4`,
  `SX-6D29-B8E5-0F4C`, `SX-5A40-9F61-D2B7`).

## Migrating From SQLite

Previous instances of the Platform API persisted to `node:sqlite` files. The
API now runs on PostgreSQL, and a one-shot importer copies an existing SQLite
database into PostgreSQL while preserving row identities, timestamps, and
public credential IDs:

```bash
DATABASE_URL=postgres://user:pass@host:5432/securex \
  npm run import:sqlite -- ./path/to/securex.db
```

The importer refuses to run over a target that already has users unless
`--force` is passed (use only against a known-empty database).

## Project Structure

```
src/
├── app/
│   ├── config/            # Application configuration
│   ├── providers/         # React context providers
│   └── router/
│       ├── AppRoutes.tsx  # Route definitions and lazy loading
│       └── ProtectedRoute.tsx
├── components/
│   ├── layout/            # Shared layout components
│   │   ├── Navbar.tsx
│   │   ├── PublicLayout.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── HolderLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── shared/            # Shared page-level components
│   │   ├── PageLoader.tsx
│   │   ├── PagePlaceholder.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── UnauthorizedPage.tsx
│   └── ui/                # Reusable UI primitives
│       ├── Alert.tsx
│       ├── Avatar.tsx
│       ├── Badge.tsx
│       ├── Breadcrumb.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Checkbox.tsx
│       ├── CredentialCard.tsx
│       ├── Dialog.tsx
│       ├── Dropdown.tsx
│       ├── EmptyState.tsx
│       ├── ErrorState.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Pagination.tsx
│       ├── Select.tsx
│       ├── Skeleton.tsx
│       ├── Spinner.tsx
│       ├── StatusIndicator.tsx
│       ├── Table.tsx
│       ├── Tabs.tsx
│       ├── Tooltip.tsx
│       └── VerificationResult.tsx
├── config/                # App-wide configuration constants
├── constants/             # Route paths, navigation items, role maps
├── features/              # Feature workspaces, one per frontend branch
│   ├── auth/              # SHARED application infrastructure (authentication flows)
│   │   ├── components/    # AuthLayout
│   │   └── pages/         # LoginPage, RegisterPage, ForgotPasswordPage, MfaPage
│   ├── public-verification/   # frontend/public-verification
│   │   ├── __tests__/
│   │   └── pages/         # HomePage, AboutPage, HowItWorksPage, ContactPage, VerifyPage, VerifyCredentialPage
│   ├── institution-employer/  # frontend/institution-employer
│   │   └── pages/         # Institution: Dashboard, Credentials, Issuers, IssuerDetail, Templates, Issue
│   │                      # Employer: Dashboard, Verify, History
│   ├── holder-admin/      # frontend/holder-admin
│   │   └── pages/         # Holder: Dashboard, Credentials, CredentialDetail, Share, Notifications, Settings
│   │                      # Admin: Dashboard, Institutions, Issuers, Users, Security, Alerts, Audit, Settings
│   ├── security-center/   # frontend/security-center (reserved — no routes yet)
│   ├── fraud-tampering/   # frontend/fraud-tampering (reserved — no routes yet)
│   └── explorer-simulation/   # frontend/explorer-simulation
│       ├── components/    # ExplorerLayout
│       └── pages/         # Overview, Blocks, BlockDetail, Transactions, TransactionDetail
├── hooks/                 # Custom React hooks
│   ├── useApi.ts
│   ├── useAuth.ts
│   └── useDebounce.ts
├── services/
│   ├── api/               # API service modules (auth, credential, institution, admin, verification, blockchain, client)
│   ├── auth/              # Auth service
│   ├── blockchain/        # Blockchain service
│   ├── fraud/             # Fraud detection service
│   └── mock/              # Mock data and mock API layer
├── styles/
│   └── globals.css        # Global Tailwind styles
├── types/                 # TypeScript interfaces and type definitions
├── utils/                 # Utility functions (classNames, format, index)
├── App.tsx                # Root component
└── main.tsx               # Entry point
```

## Available Routes

### Public

| Route | Page | Description |
| --- | --- | --- |
| `/` | HomePage | Landing page |
| `/about` | AboutPage | About SecureX |
| `/how-it-works` | HowItWorksPage | Platform walkthrough |
| `/contact` | ContactPage | Contact information |

### Authentication

| Route | Page | Description |
| --- | --- | --- |
| `/auth/login` | LoginPage | User login |
| `/auth/register` | RegisterPage | New account registration |
| `/auth/forgot-password` | ForgotPasswordPage | Password reset |
| `/auth/mfa` | MfaPage | Multi-factor authentication |

### Verification (Public)

| Route | Page | Description |
| --- | --- | --- |
| `/verify` | VerifyPage | Credential verification lookup |
| `/verify/:credentialId` | VerifyCredentialPage | Verification result for a specific credential |

### Institution

| Route | Page | Description |
| --- | --- | --- |
| `/institution/dashboard` | InstitutionDashboardPage | Institution overview and metrics |
| `/institution/credentials` | InstitutionCredentialsPage | Manage issued credentials |
| `/institution/issuers` | InstitutionIssuersPage | Manage issuer accounts |
| `/institution/issuers/:issuerId` | InstitutionIssuerDetailPage | Individual issuer profile |
| `/institution/issue` | InstitutionIssuePage | Issue a new credential |
| `/institution/templates` | InstitutionTemplatesPage | Credential template management |

### Holder

| Route | Page | Description |
| --- | --- | --- |
| `/holder/dashboard` | HolderDashboardPage | Holder wallet overview |
| `/holder/credentials` | HolderCredentialsPage | List of held credentials |
| `/holder/credentials/:credentialId` | HolderCredentialDetailPage | Credential detail view |
| `/holder/share` | HolderSharePage | Share credentials with third parties |
| `/holder/notifications` | HolderNotificationsPage | Notification center |
| `/holder/settings` | HolderSettingsPage | Account and wallet settings |

### Employer

| Route | Page | Description |
| --- | --- | --- |
| `/employer/dashboard` | EmployerDashboardPage | Employer overview and stats |
| `/employer/verify` | EmployerVerifyPage | Verify a candidate credential |
| `/employer/history` | EmployerHistoryPage | Verification audit trail |

### Admin

| Route | Page | Description |
| --- | --- | --- |
| `/admin/dashboard` | AdminDashboardPage | Platform-wide metrics |
| `/admin/institutions` | AdminInstitutionsPage | Manage registered institutions |
| `/admin/issuers` | AdminIssuersPage | Manage all issuers |
| `/admin/users` | AdminUsersPage | User management |
| `/admin/security` | AdminSecurityPage | Security overview |
| `/admin/security/alerts` | AdminSecurityAlertsPage | Active security alerts |
| `/admin/security/audit` | AdminSecurityAuditPage | Audit event log |
| `/admin/settings` | AdminSettingsPage | Platform configuration |

### Explorer

| Route | Page | Description |
| --- | --- | --- |
| `/explorer` | ExplorerOverviewPage | Chain statistics overview |
| `/explorer/blocks` | ExplorerBlocksPage | Browse all blocks |
| `/explorer/blocks/:blockHash` | ExplorerBlockDetailPage | Individual block detail |
| `/explorer/transactions` | ExplorerTransactionsPage | Browse all transactions |
| `/explorer/transactions/:txId` | ExplorerTransactionDetailPage | Individual transaction detail |

### Other

| Route | Page | Description |
| --- | --- | --- |
| `/unauthorized` | UnauthorizedPage | Unauthorized access |
| `*` | NotFoundPage | 404 page |

## Demo Credentials

All demo users share the password `Password123!`.

| Email | Name | Role |
| --- | --- | --- |
| `admin@securex.io` | Alex Morgan | Administrator |
| `security@securex.io` | Jamie Rivers | Security Admin |
| `network@securex.io` | Taylor Brooks | Network Admin |
| `auditor@securex.io` | Casey Lin | Auditor |
| `s.chen@stanford.edu` | Sarah Chen | Institution (Stanford University) |
| `marcus.johnson@acme.com` | Marcus Johnson | Employer |
| `emily.rodriguez@example.com` | Emily Rodriguez | Holder |
| `daniel.kim@example.com` | Daniel Kim | Holder |
| `priya.sharma@example.com` | Priya Sharma | Holder |

## Git Workflow

`main` is the integrated, production-oriented development branch. **Savan Patel** (repository owner / backend & integration) commits backend work directly to `main`; six frontend engineers work on their assigned branches and merge into `main` via Pull Requests.

```
main
├── frontend/public-verification
├── frontend/institution-employer
├── frontend/holder-admin
├── frontend/security-center
├── frontend/fraud-tampering
└── frontend/explorer-simulation
```

Frontend contributors hold **Write access only to this repository** (least privilege). They do not have access to `securex-blockchain`, `securex-fraud-engine`, or other private SecureX repositories unless Savan explicitly assigns them.

### Branch ownership

| Branch | Owner | Workspace | Scope |
| --- | --- | --- | --- |
| `frontend/public-verification` | Engineer 1 | `src/features/public-verification/` | Public website + credential verification |
| `frontend/institution-employer` | Engineer 2 | `src/features/institution-employer/` | Institution / Issuer panel + Employer / Verifier panel |
| `frontend/holder-admin` | Engineer 3 | `src/features/holder-admin/` | Holder wallet + Super Admin panel |
| `frontend/security-center` | Security/AI Engineer 1 | `src/features/security-center/` | Security Center frontend |
| `frontend/fraud-tampering` | Security/AI Engineer 2 | `src/features/fraud-tampering/` | Fraud/risk, tampering, fingerprint frontend |
| `frontend/explorer-simulation` | Security/AI Engineer 3 | `src/features/explorer-simulation/` | Blockchain Explorer + Attack Simulation frontend |

The Security/AI engineers implement **frontend UI only**; the underlying fraud, AI, tampering, fingerprint, blockchain, and attack-simulation logic is Savan's backend work.

### Workspace ownership model

Each frontend branch maps to exactly one feature workspace. Work for a workstream lives
primarily inside its workspace:

- `frontend/public-verification` → `src/features/public-verification/`
- `frontend/institution-employer` → `src/features/institution-employer/`
- `frontend/holder-admin` → `src/features/holder-admin/`
- `frontend/security-center` → `src/features/security-center/`
- `frontend/fraud-tampering` → `src/features/fraud-tampering/`
- `frontend/explorer-simulation` → `src/features/explorer-simulation/`

Shared infrastructure stays outside all workspaces (do not fork it into a workspace):
- `src/features/auth/` — shared application infrastructure (authentication flows).
- `src/components/` — shared UI / layout infrastructure (`ui/` is the canonical component library).
- `src/services/` — shared API / mock integration boundary.
- `src/hooks/`, `src/types/`, `src/utils/`, `src/constants/`, `src/config/`, `src/styles/` — shared infrastructure.
- `src/app/router/AppRoutes.tsx` — the application composition / root routing layer (lazy-loads every workspace page).

Each workspace contains a `README.md` describing its owner branch, purpose, primary routes,
allowed scope, shared-code reuse, and OpenCode safety guidance.

All six branches originate from the verified V1 foundation commit (`889c300`). Work in progress stays on the team's branch until ready. Frontend PRs are reviewed and merged by Savan. See `CONTRIBUTING.md` for the complete governance and workflow.

## Architecture Notes

- **Feature-oriented structure** - Code is organized by domain into per-branch workspaces (`features/public-verification`, `features/institution-employer`, `features/holder-admin`, `features/security-center`, `features/fraud-tampering`, `features/explorer-simulation`, plus shared `features/auth`) rather than by file type, making it easy to locate all code owned by a workstream.
- **API abstraction layer** - All API calls go through `services/api/`, which switches between real HTTP clients and mock data based on the `VITE_IS_MOCK` environment variable.
- **Mock data strategy** - `services/mock/data.ts` contains a complete set of realistic mock data (users, institutions, issuers, credentials, blocks, transactions, alerts, audit events, templates) enabling full offline development with zero backend dependency.
- **Lazy loading** - All feature pages are lazy-loaded via `React.lazy()` and wrapped in `Suspense` for optimal bundle splitting.
- **Role-based routing** - `ProtectedRoute` enforces role-based access at the router level, with each dashboard area locked to its designated roles.
- **Shared UI components** - A consistent component library in `components/ui/` provides buttons, inputs, modals, tables, badges, and more, all styled with Tailwind CSS.

## License

MIT
