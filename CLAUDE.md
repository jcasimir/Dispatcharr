## PR Workflow

- Target `dev` branch for PRs to Dispatcharr/Dispatcharr (not `main`)
- Run tests in Docker before committing
- Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` in commits

---

## Development Environment

### Running the Dev Container

The dev container mounts the local source code, allowing live code changes and frontend hot-reload.

**Important:** Stop any conflicting containers first (they use the same ports):
```bash
docker stop dispatcharr-test 2>/dev/null
```

**Start the dev container:**
```bash
cd docker
docker compose -f docker-compose.dev.yml up -d dispatcharr
```

**Or run directly with docker run:**
```bash
docker run --rm -d \
  --name dispatcharr_dev \
  -p 5656:5656 \
  -p 9191:9191 \
  -v /path/to/dispatcharr:/app \
  -v /path/to/dispatcharr/docker/data:/data \
  -e DISPATCHARR_ENV=dev \
  -e REDIS_HOST=localhost \
  -e CELERY_BROKER_URL=redis://localhost:6379/0 \
  -e DISPATCHARR_LOG_LEVEL=debug \
  ghcr.io/dispatcharr/dispatcharr:base
```

**Access points:**
- Main app: http://localhost:5656
- Vite dev server (frontend): http://localhost:9191

**Notes:**
- First startup takes time (~60s) as it installs Node.js and npm dependencies
- The container runs the init scripts in `docker/init/` which set up the dev environment
- Frontend changes trigger hot-reload via Vite
- Backend Python changes require restarting uwsgi (or the container)

### Container Types

| Container | Mounts Local Code | Use Case |
|-----------|-------------------|----------|
| `dispatcharr-test` | No (pre-built) | Quick testing, CI |
| `dispatcharr_dev` | Yes (`../:/app`) | Development, live editing |

---

## Testing

Tests must be run inside the Docker container. The local environment does not have Django or other dependencies installed.

### Running Tests

1. Check which container is running:
   ```bash
   docker ps --filter "name=dispatcharr" --format "{{.Names}}: {{.Status}}"
   ```

2. If the container doesn't mount local files (like `dispatcharr-test`), copy updated files first:
   ```bash
   docker cp path/to/file.py dispatcharr-test:/app/path/to/file.py
   ```

3. Run tests with Python's unittest:
   ```bash
   docker exec dispatcharr-test bash -c "cd /app && python -c '
   import sys
   sys.path.insert(0, \"/app\")
   import unittest
   from apps.plugins.tests.test_version import TestCheckCompatibility
   # ... import more test classes
   suite = unittest.TestSuite()
   suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestCheckCompatibility))
   runner = unittest.TextTestRunner(verbosity=2)
   runner.run(suite)
   '"
   ```

### Notes

- The `dispatcharr-test` container uses a pre-built image and does NOT mount the local source directory
- The `dispatcharr_dev` container (from docker-compose.dev.yml) DOES mount `../:/app` but may have port conflicts
- Tests that import Django models (like `test_loader.py`) must configure Django first:
  ```python
  import os
  os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dispatcharr.settings")
  import django
  django.setup()
  ```

---

## Recommended Development Workflow

### Using dispatcharr-test Container (Most Reliable)

The dev container (`dispatcharr_dev`) can experience segfaults with uWSGI workers due to gevent/greenlet issues. The test container is more stable for iterative development.

**Start the test container:**
```bash
docker run --rm -d \
  --name dispatcharr-test \
  -p 5656:5656 \
  -p 9191:9191 \
  -v $(pwd)/docker/data:/data \
  ghcr.io/dispatcharr/dispatcharr:test
```

**Workflow for backend changes:**
```bash
# Copy updated Python files
docker cp apps/plugins/loader.py dispatcharr-test:/app/apps/plugins/

# Restart to pick up changes
docker restart dispatcharr-test

# Wait for startup (~5-10 seconds)
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:9191/
```

**Workflow for frontend changes:**
```bash
# Build frontend in a Node container (local Node may have version issues)
docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20 sh -c "npm install && npm run build"

# Copy built assets to container
docker cp frontend/dist/. dispatcharr-test:/app/frontend/dist/

# Restart to serve new assets
docker restart dispatcharr-test
```

**Running tests:**
```bash
# Copy test files if needed
docker cp apps/plugins/tests/ dispatcharr-test:/app/apps/plugins/

# Run with unittest discover
docker exec dispatcharr-test python -m unittest discover -s apps/plugins/tests -v
```

### Known Issues

1. **Dev container segfaults:** The dev container using `docker-compose.dev.yml` may crash with signal 11 in gevent/greenlet. Workaround: use `dispatcharr-test` container.

2. **Port conflicts:** Both test and dev containers use ports 5656 and 9191. Stop one before starting the other:
   ```bash
   docker stop dispatcharr-test dispatcharr_dev 2>/dev/null
   ```

3. **Login hanging:** If login hangs indefinitely, check for worker segfaults:
   ```bash
   docker logs dispatcharr-test --tail 50
   ```
   If workers are crashing, try clearing users and restarting:
   ```bash
   docker exec dispatcharr-test python /app/manage.py shell -c "from apps.accounts.models import User; User.objects.all().delete()"
   docker restart dispatcharr-test
   ```

4. **Local Node.js incompatibility:** Building frontend locally may fail with module resolution errors. Always build in a Node container:
   ```bash
   docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20 sh -c "npm run build"
   ```

5. **Plugin files location:** Test plugins go in `/data/plugins/` inside the container. Copy with:
   ```bash
   docker cp docker/data/plugins/my_plugin dispatcharr-test:/data/plugins/
   ```

---

## Quick Reference Commands

```bash
# Check running containers
docker ps --filter "name=dispatcharr" --format "table {{.Names}}\t{{.Status}}"

# View container logs
docker logs dispatcharr-test --tail 50

# Shell into container
docker exec -it dispatcharr-test bash

# Check if web server is responding
curl -s -o /dev/null -w "%{http_code}" http://localhost:9191/

# Full backend + frontend update cycle
docker cp apps/plugins/. dispatcharr-test:/app/apps/plugins/ && \
docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20 npm run build && \
docker cp frontend/dist/. dispatcharr-test:/app/frontend/dist/ && \
docker restart dispatcharr-test
```
