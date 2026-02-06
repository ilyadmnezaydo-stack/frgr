# 🐳 Docker Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- `.env.local` file configured with Supabase credentials

### 1. Build and Run

```bash
# Build the Docker image
docker-compose build

# Start the application
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 2. Environment Configuration

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OLLAMA_API_URL=http://host.docker.internal:11434
```

### 3. Access the Application

- **Application**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/users

### 4. Production Deployment

```bash
# Build for production
docker-compose -f docker-compose.yml build

# Run in production mode
docker-compose -f docker-compose.yml up -d --force-recreate

# Stop the application
docker-compose down
```

## Docker Configuration

### Health Checks
- Application health check every 30 seconds
- Automatic restart on failure
- Graceful shutdown with 40s startup period

### Volumes
- `./uploads:/app/uploads` - Persistent file uploads
- `.env.local` - Environment variables

### Networks
- Custom bridge network `frgr-network` for container isolation
- Optional Redis service available (commented in docker-compose.yml)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `OLLAMA_API_URL` | Ollama API URL (optional) | ❌ |
| `NODE_ENV` | Environment (auto-set) | ❌ |
| `NEXT_TELEMETRY_DISABLED` | Disable telemetry (auto-set) | ❌ |

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs app

# Check environment file
cat .env.local

# Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Health Check Failing
```bash
# Check if API is accessible
curl http://localhost:3000/api/users

# Check container status
docker-compose ps

# Restart container
docker-compose restart app
```

### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check container logs for errors
docker-compose logs -f app | grep ERROR
```

## Development with Docker

### Hot Reload
```bash
# Mount source code for development
docker-compose -f docker-compose.dev.yml up
```

### Development Docker Compose
Create `docker-compose.dev.yml`:
```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    command: npm run dev
```

## Security Notes

- **Never commit** `.env.local` to version control
- **Use secrets management** for production credentials
- **Enable HTTPS** in production environments
- **Regular updates** of base Docker image
- **Resource limits** can be set in docker-compose.yml

## Monitoring

### Health Endpoints
- `/api/users` - Basic connectivity check
- `/api/health` - Detailed health status (if implemented)

### Logs
```bash
# Real-time logs
docker-compose logs -f app

# Historical logs
docker-compose logs --tail=100 app
```

### Metrics
Consider adding monitoring tools:
- Prometheus + Grafana
- Docker stats
- Application performance monitoring
