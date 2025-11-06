# Nostradamus

Modern project management and data visualization tool for Gantt charts and Burndown charts.

## Features

- **CSV Import**: Upload project data from CSV files
- **Gantt Chart**: Visualize project timelines and task dependencies
- **Burndown Chart**: Track project progress over time
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode Support**: Automatic dark/light theme switching
- **Client-Side Processing**: All data processing happens in your browser - no backend needed
- **Local Storage**: Your data is saved locally and never leaves your device

## Tech Stack

- **React 18** with TypeScript
- **Vite** for lightning-fast builds
- **Tailwind CSS** for modern, responsive styling
- **Apache ECharts** for interactive, performant charts
- **Zustand** for state management
- **PapaParse** for CSV parsing
- **localforage** for persistent storage

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## CSV Format

Your CSV file should include the following columns:

### Required Columns
- `id`: Unique task identifier
- `name`: Task name
- `startDate`: Start date (YYYY-MM-DD or MM/DD/YYYY)
- `endDate`: End date (YYYY-MM-DD or MM/DD/YYYY)
- `progress`: Progress percentage (0-100)
- `status`: Task status (not-started, in-progress, completed, blocked)

### Optional Columns
- `assignee`: Person assigned to the task
- `profile_type`: Role or profile type (e.g., Senior Developer, QA Engineer)
- `remaining_estimate_hours`: Estimated hours remaining to complete the task
- `dependency`: Task ID this task depends on (single dependency)

### Example CSV

See `sample-project.csv` for a complete example.

## Project Structure

```
nostradamus/
├── src/
│   ├── components/
│   │   ├── charts/          # Chart components
│   │   ├── controls/        # UI controls
│   │   ├── layout/          # Layout components
│   │   └── upload/          # CSV uploader
│   ├── hooks/               # Custom React hooks
│   ├── stores/              # Zustand stores
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── public/                  # Static assets
└── package.json
```

## License

All Rights Reserved
