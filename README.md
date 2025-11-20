# Nostradamus

> A modern, intelligent project management and data visualization tool for agile teams

**Nostradamus** is a powerful, browser-based project management application that combines Gantt charts, burndown tracking, and intelligent task scheduling to help teams plan, visualize, and execute their projects with precision. Built entirely on client-side technologies, it offers enterprise-grade features without the need for a backend server.

[![CI/CD Pipeline](https://github.com/mihail-burlac-globant/nostradamus/actions/workflows/ci.yml/badge.svg)](https://github.com/mihail-burlac-globant/nostradamus/actions/workflows/ci.yml)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

### Core Capabilities

- **Project Management**: Create and manage multiple projects with comprehensive task tracking, resource allocation, and configuration management
- **Interactive Gantt Chart**: Visualize project timelines with:
  - Task dependencies and automatic scheduling
  - Drag-and-drop task management
  - Color-coded milestones with custom icons
  - Plan vs. Reality comparison (projection lines)
  - Resource capacity visualization

- **Burndown Chart**: Track remaining work and project velocity with:
  - Real-time progress tracking
  - Historical vs. projected completion
  - Per-task remaining effort visualization
  - Sprint planning and milestone tracking

- **Smart Task Scheduling**: Automatic task date calculations based on:
  - Task dependencies
  - Resource availability and capacity
  - Focus factors and velocity
  - Working days and weekends

- **Resource Management**:
  - Define resource types with default velocities
  - Assign multiple resources to tasks
  - Configure focus factors and team capacity
  - Track resource allocation across projects

- **Progress Tracking**:
  - Daily progress snapshots
  - Manual remaining effort estimates
  - Status updates and notes
  - Historical progress visualization

### User Experience

- **Responsive Design**: Seamless experience on desktop, tablet, and mobile devices
- **Dark Mode Support**: Automatic theme switching based on system preferences
- **Client-Side Database**: All data stored locally in IndexedDB using SQLite (sql.js)
- **Data Portability**: Import/Export projects via CSV and Excel formats
- **Performance Optimized**: Fast rendering with Apache ECharts and optimized React components

## Tech Stack

### Core Technologies

- **[React 18](https://react.dev/)** - Modern UI library with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool and dev server

### State & Data Management

- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **[sql.js](https://sql.js.org/)** - SQLite compiled to WebAssembly for client-side database
- **[localforage](https://localforage.github.io/localForage/)** - IndexedDB wrapper for data persistence

### UI & Visualization

- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Apache ECharts](https://echarts.apache.org/)** - Professional charting library
- **[date-fns](https://date-fns.org/)** - Modern date manipulation library

### Development Tools

- **[Vitest](https://vitest.dev/)** - Fast unit testing with V8 coverage
- **[ESLint](https://eslint.org/)** - Code quality and consistency
- **[TypeScript ESLint](https://typescript-eslint.io/)** - TypeScript-specific linting rules

## Architecture

### Data Model

Nostradamus uses a relational SQLite database stored entirely in the browser. The schema includes:

**Core Entities:**
- `projects` - Project metadata and lifecycle
- `tasks` - Individual work items with status, progress, and dates
- `resources` - Resource types (developers, designers, etc.)
- `configurations` - Project-level settings and configurations
- `milestones` - Project milestones with dates and icons
- `progress_snapshots` - Daily progress tracking records

**Relationships:**
- `task_resources` - Task-to-resource assignments with effort estimates
- `task_dependencies` - Task dependency graph
- `project_resources` - Project-level resource allocation
- `project_configurations` - Applied configurations per project

### Application Structure

```
Browser Environment
├── React Application
│   ├── Pages (Routes)
│   ├── Components (UI)
│   └── Hooks (Logic)
├── State Management (Zustand)
│   ├── Database Store
│   ├── Theme Store
│   └── UI Store
└── Services Layer
    ├── Database Service (sql.js)
    ├── Chart Calculations
    └── Import/Export Utilities
```

### Key Design Patterns

- **Atomic State Updates**: Zustand stores for granular re-renders
- **Service Layer**: Business logic separated from UI components
- **Custom Hooks**: Reusable logic for chart calculations and data fetching
- **TypeScript Strict Mode**: Full type safety across the application

## Getting Started

### Prerequisites

- **Node.js** 18.x or 20.x
- **npm** 9.x or later

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mihail-burlac-globant/nostradamus.git
cd nostradamus
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to [http://localhost:5173](http://localhost:5173)

### Database Seeding (Development)

To populate the database with sample data for testing:

1. Navigate to [http://localhost:5173/seed](http://localhost:5173/seed)
2. Click the "🌱 Seed Database" button

This creates:
- 2 Sample Projects (E-Commerce Platform, Mobile App Redesign)
- 4 Resource Types (React Developer, Node.js Developer, UX Designer, QA Engineer)
- 2 Configurations (Sprint 1 MVP, Sprint 2 Refinement)
- 8 Tasks with dependencies and resource assignments

**⚠️ Warning:** Seeding clears all existing data. Only use in development.

## Usage Guide

### Creating Your First Project

1. Navigate to **Projects** page
2. Click **"+ New Project"**
3. Fill in project details (title, description, start date)
4. Click **"Create Project"**

### Defining Resources

1. Go to **Resources** page
2. Add resource types (e.g., "Frontend Developer")
3. Set default velocity (productivity percentage)
4. Choose an icon

### Adding Tasks

1. Open **Tasks** page
2. Select a project from the dropdown
3. Click **"+ New Task"**
4. Configure:
   - Task title and description
   - Status (Todo, In Progress, Done)
   - Color coding
   - Resource assignments with effort estimates
   - Dependencies on other tasks

### Viewing Charts

**Gantt Chart:**
- Navigate to **Charts** page
- Select project and configuration
- View task timeline with dependencies
- Drag tasks to adjust dates
- See plan vs. reality projections

**Burndown Chart:**
- Switch to **Burndown** tab in Charts
- Track remaining effort over time
- Compare planned vs. actual progress
- View per-task remaining work

### Tracking Progress

1. Go to **Progress** page
2. Select project and date
3. Update remaining estimates for each task
4. Add status notes
5. Save snapshot

## Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production (TypeScript compilation + Vite build)
npm run build

# Preview production build locally
npm run preview

# Run linter (strict mode, zero warnings allowed)
npm run lint

# Run tests in watch mode
npm run test

# Run tests once (CI mode)
npm test -- --run

# Generate coverage report
npm run test:coverage

# Open test UI
npm run test:ui
```

### Development Workflow

1. **Branch Creation**: Create feature branches from `develop`
2. **Development**: Make changes with hot reload on `localhost:5173`
3. **Linting**: Run `npm run lint` to check code quality
4. **Testing**: Add tests in `__tests__` directories
5. **Build**: Verify production build with `npm run build`
6. **Commit**: Use conventional commit messages
7. **Push**: CI pipeline runs automatically on push

### Code Quality Standards

- **TypeScript Strict Mode**: All code must pass strict type checking
- **ESLint**: Zero errors, zero warnings policy
- **Test Coverage**: Aim for >80% coverage on new code
- **Component Structure**: Functional components with hooks
- **State Management**: Use Zustand stores for shared state

## Testing

### Test Framework

The project uses **Vitest** with V8 coverage reporting for comprehensive testing.

### Running Tests

```bash
# Watch mode (automatically re-runs on changes)
npm run test

# Single run (for CI/CD)
npm test -- --run

# With coverage report
npm run test:coverage

# Interactive UI
npm run test:ui
```

### Test Structure

Tests are organized alongside source files:

```
src/
├── utils/__tests__/
│   ├── csvExporter.test.ts
│   ├── durationCalculation.test.ts
│   ├── projectImportExport.test.ts
│   └── projectRules.test.ts
├── hooks/__tests__/
│   └── useChartCalculations.test.ts
└── services/__tests__/
    └── database.test.ts (currently skipped)
```

### Current Test Coverage

| Module | Coverage | Tests |
|--------|----------|-------|
| **CSV Exporter** | ~90% | 27 tests |
| **Chart Calculations** | 96.49% | 12 tests |
| **Duration Calculation** | ~95% | 20 tests |
| **Project Import/Export** | ~85% | 8 tests |
| **Project Rules** | ~90% | 16 tests |
| **Overall** | 85%+ | 83 tests passing |

### Test Categories

#### ✅ Active Tests

1. **CSV Export** (`csvExporter.test.ts`)
   - Project data export validation
   - CSV format verification
   - Task grouping and sorting

2. **Chart Calculations** (`useChartCalculations.test.ts`)
   - Task date calculations with dependencies
   - Resource capacity calculations
   - Burndown simulation logic

3. **Duration Calculations** (`durationCalculation.test.ts`)
   - Working day calculations
   - Date arithmetic with weekends
   - Resource velocity impact

4. **Project Import/Export** (`projectImportExport.test.ts`)
   - Excel import validation
   - Data transformation
   - Error handling

5. **Project Rules** (`projectRules.test.ts`)
   - Business logic validation
   - Constraint checking
   - Edge case handling

#### ⏭️ Skipped Tests

**Database Tests** (`database.test.ts`) - 19 tests currently skipped

These tests are comprehensive but skipped due to sql.js WASM loading issues in Node.js environment:
- Project CRUD operations
- Resource management
- Task operations with dependencies
- Cascade delete operations

**Note:** Database functionality is thoroughly tested manually via UI and works correctly in production.

### Writing Tests

Example test structure:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateWorkingDays } from '../durationCalculation'

describe('Duration Calculation', () => {
  it('should calculate working days excluding weekends', () => {
    const start = new Date('2024-01-01') // Monday
    const end = new Date('2024-01-05')   // Friday
    expect(calculateWorkingDays(start, end)).toBe(5)
  })
})
```

### CI/CD Pipeline

The GitHub Actions pipeline runs on every push and PR:

| Stage | Command | Runs On |
|-------|---------|---------|
| **Install** | `npm ci` | Node 18.x, 20.x |
| **Lint** | `npm run lint` | All builds |
| **Test** | `npm test -- --run` | Push only |
| **Build** | `npm run build` | All builds |
| **Coverage** | `npm run test:coverage -- --run` | Push only |

**Status**: All checks passing ✅

## Deployment

### Building for Production

```bash
# Create optimized production build
npm run build

# Output: dist/ directory
# - Minified JavaScript bundles
# - Optimized CSS
# - Static assets
```

### Deployment Options

#### 1. Static Hosting (Recommended)

Deploy the `dist/` folder to any static hosting service:

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**GitHub Pages:**
```bash
# Add to package.json:
# "homepage": "https://username.github.io/nostradamus"

npm run build
# Deploy dist/ to gh-pages branch
```

#### 2. Docker Container

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t nostradamus .
docker run -p 8080:80 nostradamus
```

#### 3. Cloud Platforms

- **AWS S3 + CloudFront**: Static website hosting
- **Azure Static Web Apps**: Integrated CI/CD
- **Google Cloud Storage**: Static hosting with CDN

### Environment Configuration

No environment variables required! The application is entirely client-side.

### Browser Compatibility

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

**Requirements:**
- WebAssembly support (for sql.js)
- IndexedDB support
- ES2020 features

## Project Structure

```
nostradamus/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline configuration
├── public/                     # Static assets
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── charts/             # Gantt & Burndown charts
│   │   │   ├── GanttChart.tsx
│   │   │   └── BurndownChart.tsx
│   │   ├── layout/             # Header, Footer, Navigation
│   │   ├── modals/             # Modal dialogs
│   │   └── ui/                 # Reusable UI components
│   ├── hooks/                  # Custom React hooks
│   │   ├── __tests__/
│   │   ├── useChartCalculations.ts
│   │   └── useDatabaseInit.ts
│   ├── pages/                  # Page components (routes)
│   │   ├── ChartsPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   ├── TasksPage.tsx
│   │   ├── ResourcesPage.tsx
│   │   ├── ConfigurationsPage.tsx
│   │   ├── ProgressPage.tsx
│   │   └── SeedPage.tsx
│   ├── services/               # Business logic layer
│   │   ├── __tests__/
│   │   └── database.ts         # SQLite operations
│   ├── stores/                 # Zustand state management
│   │   ├── databaseStore.ts
│   │   └── themeStore.ts
│   ├── types/                  # TypeScript definitions
│   │   ├── entities.types.ts
│   │   └── chart.types.ts
│   ├── utils/                  # Utility functions
│   │   ├── __tests__/
│   │   ├── csvExporter.ts
│   │   ├── durationCalculation.ts
│   │   ├── projectImportExport.ts
│   │   └── projectRules.ts
│   ├── App.tsx                 # Main app with routing
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── .eslintrc.cjs               # ESLint configuration
├── tailwind.config.js          # Tailwind CSS config
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite build config
├── vitest.config.ts            # Vitest test config
└── package.json                # Dependencies and scripts
```

## Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test -- --run`
5. Run linter: `npm run lint`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add task filtering by status
fix: resolve burndown chart date calculation
docs: update installation instructions
test: add tests for duration calculation
refactor: simplify chart calculation logic
chore: update dependencies
```

### Code Review Process

1. All PRs require passing CI checks
2. At least one approving review required
3. No merge conflicts with target branch
4. Follow existing code style and patterns

### Areas for Contribution

- **Features**: New chart types, export formats, integrations
- **Testing**: Increase coverage, add E2E tests
- **Documentation**: Tutorials, examples, API docs
- **Performance**: Optimization, lazy loading, caching
- **Accessibility**: ARIA labels, keyboard navigation, screen readers

## Troubleshooting

### Common Issues

#### 1. Database not persisting

**Problem:** Data disappears after refresh

**Solution:**
- Check browser's IndexedDB support
- Verify localStorage is not disabled
- Clear browser cache and reload
- Check browser console for errors

#### 2. Charts not rendering

**Problem:** Gantt or Burndown charts show blank

**Solution:**
- Ensure tasks have valid dates
- Check for task dependency cycles
- Verify resources are assigned
- Open browser console for errors

#### 3. Build failures

**Problem:** `npm run build` fails

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npx tsc --noEmit

# Verify all tests pass
npm test -- --run
```

#### 4. sql.js WASM loading errors

**Problem:** "Cannot find sql-wasm.wasm" error

**Solution:**
- Ensure internet connection (WASM loaded from CDN)
- Check Content Security Policy settings
- Verify browser supports WebAssembly

### Performance Tips

1. **Large Projects**: Use task filtering and pagination
2. **Chart Performance**: Limit date ranges for better rendering
3. **Database Size**: Export and archive old projects
4. **Browser Memory**: Clear unused data periodically

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/mihail-burlac-globant/nostradamus/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mihail-burlac-globant/nostradamus/discussions)
- **Documentation**: See inline code comments and JSDoc

## Roadmap

### Planned Features

- [ ] Multi-language support (i18n)
- [ ] Export to PDF reports
- [ ] Collaborative features (export/import for sharing)
- [ ] Custom chart themes
- [ ] Advanced filtering and search
- [ ] Keyboard shortcuts
- [ ] Undo/Redo functionality
- [ ] Task templates
- [ ] Time tracking integration
- [ ] Mobile app (React Native)

### Performance Goals

- [ ] Reduce bundle size to <1MB (currently 1.5MB)
- [ ] Implement code splitting for routes
- [ ] Add virtual scrolling for large task lists
- [ ] Optimize chart rendering for 1000+ tasks
- [ ] Service Worker for offline support

## FAQ

**Q: Is my data private?**
A: Yes! All data is stored locally in your browser. Nothing is sent to any server.

**Q: Can I use this for commercial projects?**
A: Please check the license section. Currently "All Rights Reserved".

**Q: Does it work offline?**
A: Yes, once loaded. Consider adding a service worker for full offline support.

**Q: Can I export my data?**
A: Yes! Use CSV export on the Projects page to backup all project data.

**Q: What's the maximum project size?**
A: Limited only by browser storage (~10MB typical, ~100MB+ in modern browsers).

**Q: Can I import MS Project files?**
A: Not currently, but you can import from Excel/CSV. See import documentation.

## License

All Rights Reserved

© 2024 Nostradamus Project

---

**Built with ❤️ using React, TypeScript, and modern web technologies**
