# Finance Wizz - Personal Finance Dashboard

A complete personal finance dashboard with an interactive mind map, purchase tracker, bank statement import with AI categorization, and spending insights.

## Tech Stack

- **Frontend**: React 19 + TypeScript, D3.js (mind map), Recharts (charts), Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **AI**: Claude API (claude-sonnet-4-6) for transaction categorization

## Prerequisites

- Node.js 18+
- PostgreSQL running locally
- Anthropic API key

## Setup

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE finance_wizz;"
```

### 2. Configure environment

```bash
cp .env.example backend/.env
# Edit backend/.env with your DATABASE_URL and ANTHROPIC_API_KEY
```

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Start development servers

```bash
npm run dev
```

This starts:
- Backend on http://localhost:3001
- Frontend on http://localhost:5173

## Features

### Finance Mind Map
- Interactive radial D3.js tree visualization
- Click nodes to edit name and value inline
- Hover to see node details
- Values automatically roll up to parent nodes
- Zoom and pan support

### Purchase Tracker
- Track wishlist items across 4 categories: Sports, Clothing, Accessories, Supplements
- Set estimated and target prices
- Price refresh simulation (idealo.de format)
- Filter by category, status, and priority
- Mark items as Wishlist → Planned → Purchased

### Bank Statement Import
- Drag & drop PDF upload
- Parses German bank statement formats
- AI-powered transaction categorization using Claude
- Review and override category suggestions before importing
- Confidence scores for AI suggestions

### Insights & Analytics
- Financial health score (0-100)
- Spending breakdown pie chart
- Income vs expenses area chart (6-month history)
- Top spending merchants
- Recurring expense detection
- Wishlist affordability checker

## Project Structure

```
finance-wizz/
├── backend/          # Express + TypeScript API
│   └── src/
│       ├── index.ts
│       ├── db/       # PostgreSQL client + schema
│       ├── routes/   # API endpoints
│       ├── services/ # AI, PDF parsing, price refresh
│       └── types.ts
├── frontend/         # React + Vite app
│   └── src/
│       ├── api/      # Axios API client
│       ├── components/
│       │   ├── Layout/
│       │   ├── MindMap/
│       │   ├── Purchases/
│       │   ├── BankUpload/
│       │   └── Insights/
│       └── types.ts
└── package.json      # Root scripts
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/finance/nodes | Get full finance tree |
| POST | /api/finance/nodes | Create a node |
| PUT | /api/finance/nodes/:id | Update node (recalculates parents) |
| DELETE | /api/finance/nodes/:id | Delete node (cascades) |
| GET | /api/purchases | List purchase items |
| POST | /api/purchases | Create purchase item |
| PUT | /api/purchases/:id | Update purchase item |
| DELETE | /api/purchases/:id | Delete purchase item |
| POST | /api/purchases/:id/refresh-price | Refresh best price |
| POST | /api/bank/upload | Upload PDF, get categorized transactions |
| POST | /api/bank/import | Save confirmed transactions |
| GET | /api/bank/transactions | List all transactions |
| GET | /api/insights | Full analytics summary |
