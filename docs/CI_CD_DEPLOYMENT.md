# CI/CD Pipeline & Deployment Guide

## Overview

The Travel Expense Tracker uses GitHub Actions for automated testing, linting, and deployment safety checks.

## Pipeline Stages

### 1. Setup & Dependencies
- Node.js 18.x installation
- npm dependencies caching
- Runs on every push/PR

### 2. Linting & Type Checking
- ESLint for code quality
- TypeScript type checking
- Catches issues early

### 3. Backend Tests
- Unit and integration tests
- PostgreSQL test database
- Coverage reporting to Codecov

### 4. Database Migration Safety
- Validates Prisma schema
- Dry-run migrations
- Checks for migration conflicts

### 5. Frontend Build
- Vite build process
- Bundle size optimization
- Artifact upload for deployment

### 6. Security Scan
- npm audit for vulnerabilities
- Prisma schema validation
- Moderate severity threshold

### 7. Pre-Deployment Safety Check
- Runs only on main branch
- Requires all prior checks to pass
- Manual deployment gate

## GitHub Actions Workflow

Located in `.github/workflows/ci.yml`

### Trigger Events

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### Job Dependencies

```
setup ─────────┬──→ lint ─────┐
               ├──→ backend-tests ──┐
               ├──→ db-migration-check ──┐
               ├──→ frontend-linting ──┬──→ deployment-safety-check
               └──→ security-check ────┘
```

## Local Development

### Run Linting

```bash
npm run lint
```

### Type Check

```bash
npm run type-check
```

### Run Tests

```bash
# All tests
npm test

# Backend only
npm run test:backend -- --coverage

# Watch mode
npm run test:backend -- --watch
```

### Build Frontend

```bash
npm run build:frontend
```

### Build Backend

```bash
npm run build:backend
```

## CI/CD Environment Variables

GitHub Actions needs these secrets configured:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each:

```
DATABASE_URL=postgresql://...
GOOGLE_VISION_KEY_PATH=./secrets/google-vision-key.json
GOOGLE_VISION_PROJECT_ID=your-project
GOOGLE_MAPS_API_KEY=your-key
NODE_ENV=test
LOG_LEVEL=error
```

### GitHub Secrets vs Variables

- **Secrets:** Sensitive data (API keys, passwords)
- **Variables:** Non-sensitive config (URLs, project names)

Add under:
- Secrets: **Settings** → **Secrets and variables** → **Actions** → **Secrets**
- Variables: Same location → **Variables**

## Deployment

### Manual Deployment to Production

1. Ensure main branch passes all checks (green checkmark on commit)
2. Choose deployment target:

#### Option A: Deploy to Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Option B: Deploy to Heroku (Backend + Database)

```bash
# Install Heroku CLI
npm i -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set -a your-app-name DATABASE_URL="..."
heroku config:set -a your-app-name GOOGLE_MAPS_API_KEY="..."

# Deploy
git push heroku main

# Run migrations
heroku run npm run db:migrate -a your-app-name

# View logs
heroku logs -a your-app-name --tail
```

#### Option C: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Build stage
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Start
CMD ["npm", "start"]

EXPOSE 3000
```

Build and deploy:

```bash
docker build -t travel-expense-tracker .
docker run -p 3000:3000 travel-expense-tracker
```

### Automated Deployments (Optional)

To automatically deploy on main branch merge:

1. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_run:
    workflows: [CI/CD Pipeline]
    types: [completed]
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: vercel --prod --token $VERCEL_TOKEN
```

2. Get tokens:
   - Vercel: https://vercel.com/account/tokens
   - Store as GitHub Secrets

## Monitoring & Logs

### GitHub Actions Logs

1. Go to **Actions** tab on GitHub
2. Click the workflow run
3. Click the job to view logs
4. Search for errors/warnings

### Application Logs

**Production:**
```bash
# Heroku
heroku logs -a your-app-name --tail

# AWS CloudWatch
aws logs tail /aws/lambda/travel-expense-tracker --follow
```

**Local:**
```bash
npm run dev:backend
# Logs to console
```

## Troubleshooting

### Tests Failing in CI

**Check locally first:**
```bash
npm run test:backend
```

**Common issues:**
- Missing test database
- Stale node_modules
- Environment variables not set

**Fix:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests
npm test
```

### Build Fails with "Out of Memory"

**GitHub Actions has 7GB RAM.** If build fails:

```yaml
# In .github/workflows/ci.yml
- name: Run tests
  run: npm test
  env:
    NODE_OPTIONS: --max-old-space-size=6144
```

### Migration Fails

Check migration history:

```bash
npx prisma migrate status
```

Resolve stuck migrations (development only):

```bash
npx prisma migrate resolve --rolled-back migration_name
```

### Coverage Not Uploaded

Codecov requires:
1. Coverage reports generated: `coverage/coverage-final.json`
2. Public repo OR Codecov token in secrets

Add token:
```bash
# Get from https://codecov.io/
# Add to GitHub Secrets as CODECOV_TOKEN
```

## Best Practices

### 1. Commit Messages

Use conventional commits:

```
feat: add OCR receipt processing
fix: resolve rate limiting bug
docs: update deployment guide
ci: optimize pipeline performance
```

### 2. Branch Strategy

```
main (production)
  ↑
  └─ develop (staging)
       ↑
       └─ feature/user-name (features)
```

### 3. Pull Request Checks

Before merging to main:
- All CI checks pass ✅
- Code review approved
- No merge conflicts
- Test coverage maintained (>80%)

### 4. Database Migrations

**Always** test migrations locally first:

```bash
# Create test migration
npm run db:migrate:dev --name test_change

# Verify SQL
cat prisma/migrations/*/migration.sql

# Rollback if needed
git checkout prisma/
```

### 5. Environment Secrets

**Never** commit secrets:

```bash
# ❌ WRONG
echo "DATABASE_URL=postgresql://user:pass@..." >> .env
git add .env

# ✅ RIGHT
echo "DATABASE_URL=..." >> .env.local
echo ".env.local" >> .gitignore
git add .gitignore
```

## Performance Optimization

### Cache Strategies

```yaml
# In ci.yml - already implemented
- uses: actions/setup-node@v4
  with:
    node-version: '18.x'
    cache: 'npm'  # Cache node_modules
```

This saves 2-3 minutes per run.

### Parallel Jobs

```yaml
# Jobs run in parallel (faster)
jobs:
  lint:
    runs-on: ubuntu-latest
  backend-tests:
    runs-on: ubuntu-latest
  frontend-linting:
    runs-on: ubuntu-latest

# Deployment only runs if all above pass
deployment-safety-check:
  needs: [lint, backend-tests, frontend-linting]
```

## Cost Optimization

### GitHub Actions Pricing

- **Free tier:** 2,000 minutes/month on free accounts
- **Pro/Team:** 3,000 minutes/month
- After: $0.24 per additional minute

### Reduce CI Costs

```yaml
# Run expensive tests only on main/develop
- if: github.event_name == 'pull_request'
  run: npm test
  
# Skip tests on documentation changes
- if: "!contains(github.event.head_commit.message, '[skip ci]')"
  run: npm test
```

## Deployment Checklist

Before deploying to production:

- [ ] All GitHub Actions tests pass (green checkmark)
- [ ] Code review approved
- [ ] Database migrations tested locally
- [ ] Environment variables configured in secrets
- [ ] Backend and frontend builds successful
- [ ] No security vulnerabilities (npm audit clean)
- [ ] Monitoring/logging configured
- [ ] Backup of production database exists
- [ ] Team notified of deployment
- [ ] Rollback plan documented

## Rollback Procedure

If deployment breaks production:

```bash
# Revert to last working commit
git revert HEAD

# Or reset to specific commit
git reset --hard <commit-hash>

# Push and re-deploy
git push origin main

# Monitor deployment
heroku logs -a your-app --tail
```

## Additional Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Deployment Strategies](https://martinfowler.com/bliki/BlueGreenDeployment.html)
