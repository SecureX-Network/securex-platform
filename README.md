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

## Requirements

- Node.js 18+
- npm 9+

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

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build (TypeScript + Vite) |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |

## Environment Variables

Copy `.env.example` to `.env` and configure as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8080/api/v1` | Main API endpoint |
| `VITE_BLOCKCHAIN_API_URL` | `http://localhost:8081/api/v1` | Blockchain API endpoint |
| `VITE_FRAUD_ENGINE_URL` | `http://localhost:8082/api/v1` | Fraud detection API endpoint |
| `VITE_IS_MOCK` | `true` | Enable mock data (set `false` when backend is connected) |

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
├── features/              # Feature-oriented modules
│   ├── auth/
│   │   ├── components/    # AuthLayout
│   │   └── pages/         # LoginPage, RegisterPage, ForgotPasswordPage, MfaPage
│   ├── public/
│   │   └── pages/         # HomePage, AboutPage, HowItWorksPage, ContactPage
│   ├── verification/
│   │   └── pages/         # VerifyPage, VerifyCredentialPage
│   ├── institution/
│   │   └── pages/         # Dashboard, Credentials, Issuers, Templates, Issue
│   ├── holder/
│   │   └── pages/         # Dashboard, Credentials, CredentialDetail, Share, Notifications, Settings
│   ├── employer/
│   │   └── pages/         # Dashboard, Verify, History
│   ├── admin/
│   │   └── pages/         # Dashboard, Institutions, Issuers, Users, Security, Alerts, Audit, Settings
│   └── explorer/
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

| Branch | Owner | Scope |
| --- | --- | --- |
| `frontend/public-verification` | Engineer 1 | Public website + credential verification |
| `frontend/institution-employer` | Engineer 2 | Institution / Issuer panel + Employer / Verifier panel |
| `frontend/holder-admin` | Engineer 3 | Holder wallet + Super Admin panel |
| `frontend/security-center` | Security/AI Engineer 1 | Security Center frontend |
| `frontend/fraud-tampering` | Security/AI Engineer 2 | Fraud/risk, tampering, fingerprint frontend |
| `frontend/explorer-simulation` | Security/AI Engineer 3 | Blockchain Explorer + Attack Simulation frontend |

The Security/AI engineers implement **frontend UI only**; the underlying fraud, AI, tampering, fingerprint, blockchain, and attack-simulation logic is Savan's backend work.

All six branches originate from the verified V1 foundation commit (`889c300`). Work in progress stays on the team's branch until ready. Frontend PRs are reviewed and merged by Savan. See `CONTRIBUTING.md` for the complete governance and workflow.

## Architecture Notes

- **Feature-oriented structure** - Code is organized by domain (`features/auth`, `features/institution`, etc.) rather than file type, making it easy to locate all code related to a feature.
- **API abstraction layer** - All API calls go through `services/api/`, which switches between real HTTP clients and mock data based on the `VITE_IS_MOCK` environment variable.
- **Mock data strategy** - `services/mock/data.ts` contains a complete set of realistic mock data (users, institutions, issuers, credentials, blocks, transactions, alerts, audit events, templates) enabling full offline development with zero backend dependency.
- **Lazy loading** - All feature pages are lazy-loaded via `React.lazy()` and wrapped in `Suspense` for optimal bundle splitting.
- **Role-based routing** - `ProtectedRoute` enforces role-based access at the router level, with each dashboard area locked to its designated roles.
- **Shared UI components** - A consistent component library in `components/ui/` provides buttons, inputs, modals, tables, badges, and more, all styled with Tailwind CSS.

## License

MIT
