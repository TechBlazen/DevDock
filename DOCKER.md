# Docker Setup Guide

This guide covers running Forge Portal in development containers and production Docker environments.

## 🚀 Quick Start

### Option 1: Dev Container (VS Code, Cursor, etc.)

The easiest way to get started is using a dev container:

1. **Prerequisites:**
   - Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Install [VS Code](https://code.visualstudio.com/) or [Cursor](https://cursor.sh/)
   - Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

2. **Open in Dev Container:**
   ```bash
   # In VS Code or Cursor
   # Press: Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)
   # Type: "Dev Containers: Reopen in Container"
   # Or click the prompt that appears
   ```

3. **Start Development:**
   ```bash
   npm run dev
   ```
   Visit http://localhost:5173

### Option 2: Production Docker Build

Build and run the production-ready Docker image:

```bash
# Build the image
docker build -t forge-portal .

# Run the container
docker run -p 8080:80 forge-portal

# Or use docker-compose
docker-compose up
```

Visit http://localhost:8080

## 📦 Dev Container Details

### What's Included

The dev container comes pre-configured with:

- **Node.js 22** (latest LTS)
- **Zsh** with Oh-My-Zsh for a better terminal experience
- **Git**
- **pnpm** and **yarn** package managers
- **VS Code extensions:**
  - ESLint, Prettier, Tailwind CSS IntelliSense
  - React snippets, Auto Rename Tag
  - GitLens, Docker, Error Lens
  - GitHub Copilot (if you have access)

### Features

- ✅ **Automatic dependency installation** on container creation
- ✅ **Port forwarding** for Vite dev server (5173) and preview (4173)
- ✅ **SSH keys mounted** from your host (read-only) for git operations
- ✅ **Git config synced** from your host
- ✅ **Format on save** with Prettier
- ✅ **ESLint auto-fix** on save
- ✅ **Host network mode** for easy port access

### Custom Commands

Inside the dev container, you can run:

```bash
# Development
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks

# Package managers
npm install          # NPM (default)
pnpm install         # PNPM (faster)
yarn install         # Yarn
```

## 🐳 Production Docker

### Multi-Stage Build

The production Dockerfile uses a multi-stage build for optimal image size:

1. **Builder stage:** Compiles the React/Vite app
2. **Production stage:** Serves static files with nginx

### Features

- ✅ **Small image size** (~30MB) using Alpine Linux
- ✅ **Nginx** web server with optimized configuration
- ✅ **Gzip compression** for faster load times
- ✅ **SPA routing** with fallback to index.html
- ✅ **Static asset caching** (1 year)
- ✅ **Security headers** (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ **Health checks** for container orchestration

### Environment Variables

You can customize the build with environment variables:

```bash
# Build with custom settings
docker build \
  --build-arg NODE_ENV=production \
  -t forge-portal .
```

### Docker Compose

The `docker-compose.yml` file provides:

- Health checks every 30 seconds
- Automatic restart on failure
- Container labels for metadata
- Port mapping (8080:80)

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Rebuild and restart
docker-compose up --build -d
```

## 🔧 Customization

### Modifying the Dev Container

Edit `.devcontainer/devcontainer.json` to:

- Add VS Code extensions
- Change editor settings
- Add additional features
- Modify post-create commands

### Modifying the Dockerfile

Edit `Dockerfile` to:

- Change base images
- Add build arguments
- Customize nginx configuration
- Add additional dependencies

### Modifying Docker Compose

Edit `docker-compose.yml` to:

- Add environment variables
- Configure volumes
- Add additional services (database, cache, etc.)
- Change port mappings

## 🛠️ Troubleshooting

### Dev Container Issues

**Problem:** Container fails to start
```bash
# Rebuild the container
# In VS Code: Cmd+Shift+P > "Dev Containers: Rebuild Container"
```

**Problem:** Node modules not found
```bash
# Inside the container, reinstall dependencies
npm install
```

**Problem:** Port already in use
```bash
# On your host, find and kill the process
lsof -ti :5173 | xargs kill -9
```

### Production Docker Issues

**Problem:** Build fails
```bash
# Clear Docker build cache
docker builder prune

# Rebuild without cache
docker build --no-cache -t forge-portal .
```

**Problem:** Container exits immediately
```bash
# Check logs
docker logs <container-id>

# Run interactively for debugging
docker run -it forge-portal sh
```

**Problem:** Can't access the app
```bash
# Check if container is running
docker ps

# Check port mapping
docker port <container-id>

# Test from inside container
docker exec <container-id> wget -O- http://localhost/
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [Vite Docker Guide](https://vitejs.dev/guide/static-deploy.html)
- [Nginx Documentation](https://nginx.org/en/docs/)

## 🤝 Contributing

When contributing Docker-related changes:

1. Test in both dev container and production builds
2. Update this documentation if you add new features
3. Keep the images small and secure
4. Follow Docker best practices

## 📝 Notes

- The dev container uses **host networking** for simplicity in development
- Production builds use **multi-stage builds** to minimize image size
- **SSH keys** are mounted read-only for security
- **node_modules** are persisted in a volume for better performance
