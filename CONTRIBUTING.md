# Contributing to Forge Portal

Thank you for your interest in contributing to Forge Portal! This document provides guidelines and standards for contributing to this project.

## Branch Naming Convention

All branches must follow this naming convention: `<type>/<description>`

### Valid Branch Types

| Type | Purpose | Example |
|------|---------|---------|
| `feature/` | New features or enhancements | `feature/add-user-dashboard` |
| `bugfix/` | Bug fixes | `bugfix/fix-login-error` |
| `hotfix/` | Urgent production fixes | `hotfix/security-patch` |
| `release/` | Release preparation | `release/v1.2.0` |
| `chore/` | Maintenance tasks, dependencies | `chore/update-dependencies` |
| `docs/` | Documentation updates | `docs/update-readme` |

### Branch Name Requirements

- **Format**: `<type>/<description>`
- **Description**: Lowercase letters, numbers, hyphens, and underscores only
- **Examples**:
  - ✅ `feature/user-authentication`
  - ✅ `bugfix/fix-api-timeout`
  - ✅ `docs/api-documentation`
  - ❌ `Feature/UserAuth` (wrong case)
  - ❌ `fix-bug` (missing type prefix)
  - ❌ `feature/Add User Auth` (spaces not allowed)

### Protected Branches

- `main` - Production branch
- `develop` - Development integration branch (if used)

## Development Workflow

1. **Create a branch** following the naming convention:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit frequently with clear messages:
   ```bash
   git commit -m "feat: add user authentication"
   ```

3. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request** against `main`:
   - Use a descriptive title
   - Reference any related issues
   - Provide a clear description of changes
   - Ensure CI checks pass

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

**Example:**
```
feat: add user profile page

- Created profile component
- Added user settings
- Integrated with API
```

## Pull Request Process

1. **Branch naming**: Ensure your branch follows the naming convention
2. **CI/CD**: All GitHub Actions checks must pass
3. **Code review**: At least one approval required
4. **Testing**: Build must succeed and pass all checks
5. **Conflicts**: Resolve any merge conflicts with `main`

### CI/CD Pipeline

Our automated pipeline includes:

- ✅ Branch name validation
- ✅ Dependency installation
- ✅ Code linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Build verification
- ✅ Lighthouse performance checks (PRs only)

## Local Development

### Prerequisites

- Node.js 20.x or higher
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Git Hooks

Pre-commit hooks automatically validate:
- Branch naming convention
- Code formatting
- Commit message format

If you encounter issues with git hooks, ensure they are executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Configuration in `eslint.config.js`
- **Formatting**: Follow existing code patterns
- **Components**: Use functional components with TypeScript
- **CSS**: Tailwind CSS utility classes

## Questions?

If you have questions about contributing, please:
- Review existing issues and pull requests
- Check the documentation
- Open a new issue with the `question` label

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
