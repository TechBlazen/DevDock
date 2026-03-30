# Dev Container Setup

This project includes a Dev Container configuration for VS Code and Cursor IDE.

## Prerequisites

- **VS Code** or **Cursor** installed
- **Docker Desktop** installed and running
- **Dev Containers extension** for VS Code (or built-in support in Cursor)

## Features

### Included Tools
- Node.js 22.x
- npm, pnpm, yarn
- Git & GitHub CLI
- Zsh with Oh My Zsh

### VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Auto Rename Tag
- React/ES7 Snippets
- Path IntelliSense
- Docker
- GitLens

### Port Forwarding
- **5173**: Vite Dev Server (auto-forwarded)
- **4173**: Vite Preview Server (auto-forwarded)

## How to Use

### VS Code
1. Open the project folder in VS Code
2. When prompted, click **"Reopen in Container"**
   - Or use Command Palette: `Dev Containers: Reopen in Container`
3. Wait for the container to build and start
4. Run `npm run dev` in the integrated terminal

### Cursor
1. Open the project folder in Cursor
2. Cursor will automatically detect the dev container configuration
3. Click **"Reopen in Container"** when prompted
4. Run `npm run dev` in the integrated terminal

## First Time Setup

The dev container will automatically:
1. Pull the Node.js 22 base image
2. Install additional tools (git, zsh, etc.)
3. Run `npm install` to install dependencies
4. Configure git safe directory

## SSH Key Forwarding

Your local `~/.ssh` directory is mounted read-only into the container, so you can:
- Push/pull from GitHub
- Use SSH keys for authentication

## Customization

Edit `.devcontainer/devcontainer.json` to:
- Add more VS Code extensions
- Change port forwarding
- Modify environment variables
- Add more features

## Troubleshooting

### Container won't start
- Make sure Docker Desktop is running
- Try rebuilding: `Dev Containers: Rebuild Container`

### npm install fails
- Rebuild the container: `Dev Containers: Rebuild Container`
- Check Docker has enough disk space

### Port already in use
- Stop any local processes using ports 5173 or 4173
- Or change the ports in `devcontainer.json`

## Running the App

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Linting
npm run lint
```

## Benefits

✅ Consistent development environment across all machines
✅ No need to install Node.js locally
✅ Pre-configured extensions and settings
✅ Isolated from your host machine
✅ Easy onboarding for new developers
