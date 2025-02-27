# Soundcraft Project Guide

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run lint` - Lint codebase

## Code Style Guidelines
- **Imports**: Group imports (React, components, types, utils) with blank line between groups
- **Components**: Use functional components with TypeScript interfaces for props
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Types**: Explicit type definitions in separate files (types/*.ts)
- **State Management**: Use Zustand store with slices for domain separation
- **Styling**: Tailwind with class-variance-authority for component variants
- **Class Names**: Use cn() utility for merging Tailwind classes
- **Error Handling**: Use try/catch blocks with meaningful error messages
- **UI Components**: 
  - Follow existing patterns in components/ui
  - Use TypeScript interfaces for props with React.forwardRef when needed
  - Use displayName for debugging
- **Icons**: Use react-icons library (FaIcon naming pattern)