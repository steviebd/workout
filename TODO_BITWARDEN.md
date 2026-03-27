# Bitwarden Secrets Manager Migration Plan

## Overview

Migrate from Infisical to Bitwarden Secrets Manager for secrets management across all environments (dev, staging, prod).

**Status:** Pending Review

---

## Current State (Infisical)

- **Workspace:** `workout-wm-0-u`
- **Environments:** dev, staging, prod
- **CLI:** `infisical run --env <environment> -- <command>`
- **CI/CD:** `Infisical/secrets-action@v1.0.15`
- **Machine Identity:** Client ID + Client Secret per environment

---

## Target State (Bitwarden)

### Architecture Comparison

| Concept | Infisical | Bitwarden |
|---------|-----------|-----------|
| Organization | Workspace | Organization |
| Environment isolation | Built-in environments | **Projects** (one per env) |
| Machine identity | Client ID + Secret | **Machine Accounts** + **Access Tokens** |
| CLI | `infisical` | `bws` (Bitwarden Secrets Manager CLI) |
| CI Integration | `Infisical/secrets-action` | `bitwarden/sm-action@v2` |

### Bitwarden Structure

| Project | Machine Account | GitHub Secret |
|---------|----------------|---------------|
| `workout-dev` | `workout-dev-machine` | `BW_DEV_ACCESS_TOKEN` |
| `workout-staging` | `workout-staging-machine` | `BW_STAGING_ACCESS_TOKEN` |
| `workout-prod` | `workout-prod-machine` | `BW_PROD_ACCESS_TOKEN` |

---

## Migration Steps

### Phase 1: Bitwarden Setup

#### 1.1 Create Organization (if not exists)

1. Create or use existing Bitwarden organization for the project
2. Enable Secrets Manager add-on

#### 1.2 Create Projects

Create three projects in Bitwarden Secrets Manager:

- [ ] `workout-dev` - Local development secrets
- [ ] `workout-staging` - Staging/branch deploy secrets
- [ ] `workout-prod` - Production secrets

#### 1.3 Create Machine Accounts

Create one machine account per environment for isolation:

- [ ] `workout-dev-machine` - Access to `workout-dev` project only
- [ ] `workout-staging-machine` - Access to `workout-staging` project only
- [ ] `workout-prod-machine` - Access to `workout-prod` project only

#### 1.4 Generate Access Tokens

For each machine account, generate an access token:

- [ ] Save `BW_DEV_ACCESS_TOKEN` to GitHub Secrets
- [ ] Save `BW_STAGING_ACCESS_TOKEN` to GitHub Secrets
- [ ] Save `BW_PROD_ACCESS_TOKEN` to GitHub Secrets

**Note:** Access tokens are shown only once. Store securely in GitHub Secrets immediately.

---

### Phase 2: Migrate Secrets

### Secrets to Migrate (per environment)

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Workers + D1 permissions) |
| `CLOUDFLARE_D1_DATABASE_ID` | D1 database ID for the environment |
| `WORKOS_API_KEY` | WorkOS authentication |
| `WORKOS_CLIENT_ID` | WorkOS OAuth client ID |
| `POSTHOG_API_KEY` | Analytics |
| `POSTHOG_PROJECT_URL` | Posthog server URL |
| `WHOOP_CLIENT_ID` | WHOOP OAuth client ID |
| `WHOOP_CLIENT_SECRET` | WHOOP OAuth client secret |
| `WHOOP_API_URL` | WHOOP API endpoint |
| `WHOOP_TOKEN_ENCRYPTION_KEY` | Encryption key for token storage |

**Dev-only secrets:**
| Secret | Purpose |
|--------|---------|
| `TEST_USERNAME` | Playwright E2E test email |
| `TEST_PASSWORD` | Playwright E2E test password |

#### Migration Actions

- [ ] Export all secrets from Infisical (dev environment)
- [ ] Import secrets to Bitwarden `workout-dev` project
- [ ] Export all secrets from Infisical (staging environment)
- [ ] Import secrets to Bitwarden `workout-staging` project
- [ ] Export all secrets from Infisical (prod environment)
- [ ] Import secrets to Bitwarden `workout-prod` project

---

### Phase 3: GitHub Actions Updates

#### 3.1 Update `.github/workflows/deploy.yml`

Replace the Infisical step with Bitwarden for each environment:

**OLD (Infisical):**
```yaml
- name: Setup Infisical
  uses: Infisical/secrets-action@v1.0.15
  with:
    method: "universal"
    client-id: ${{ secrets.INFISICAL_MACHINE_IDENTITY_ID }}
    client-secret: ${{ secrets.INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET }}
    project-slug: "workout-wm-0-u"
    env-slug: "staging"
    export-type: "env"
```

**NEW (Bitwarden):**
```yaml
# For staging (non-main branches):
- name: Get Staging Secrets
  uses: bitwarden/sm-action@v2
  with:
    access_token: ${{ secrets.BW_STAGING_ACCESS_TOKEN }}
    secrets: |
      <secret-id> > CLOUDFLARE_ACCOUNT_ID
      <secret-id> > CLOUDFLARE_API_TOKEN
      <secret-id> > CLOUDFLARE_D1_DATABASE_ID
      <secret-id> > WORKOS_API_KEY
      <secret-id> > WORKOS_CLIENT_ID
      <secret-id> > POSTHOG_API_KEY
      <secret-id> > POSTHOG_PROJECT_URL
      <secret-id> > WHOOP_CLIENT_ID
      <secret-id> > WHOOP_CLIENT_SECRET
      <secret-id> > WHOOP_API_URL
      <secret-id> > WHOOP_TOKEN_ENCRYPTION_KEY

# For prod (main branch):
- name: Get Prod Secrets
  uses: bitwarden/sm-action@v2
  with:
    access_token: ${{ secrets.BW_PROD_ACCESS_TOKEN }}
    secrets: |
      # ... same structure with prod secret IDs
```

#### 3.2 Remove Infisical Secrets

- [ ] Remove `INFISICAL_MACHINE_IDENTITY_ID` from GitHub Secrets
- [ ] Remove `INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET` from GitHub Secrets

---

### Phase 4: Local Development Updates

#### 4.1 Install bws CLI

```bash
npm install -g @bitwarden/sdk-sm
# Or via official installer: https://bitwarden.com/help/secrets-manager-cli/
```

#### 4.2 Update `package.json`

Replace all `infisical run --env <env> --` commands with `bws run --project <project> --`:

| Current | New |
|---------|-----|
| `infisical run --env dev -- <cmd>` | `bws run --project workout-dev -- <cmd>` |
| `infisical run --env staging -- <cmd>` | `bws run --project workout-staging -- <cmd>` |
| `infisical run --env prod -- <cmd>` | `bws run --project workout-prod -- <cmd>` |

**Scripts to update:**
- [ ] `dev` - `infisical run --env dev -- sh -c 'bun run dev:wrangler'`
- [ ] `dev:wrangler` - `infisical run --env dev -- sh -c '...`
- [ ] `test:e2e` - `infisical run --env dev -- ...`
- [ ] `test:e2e:ui` - `infisical run --env dev -- ...`
- [ ] `db:push:dev` - `infisical run --env dev -- ...`
- [ ] `db:deploy:wrangler` - `infisical run --env dev -- ...`
- [ ] `db:deploy:staging` - `infisical run --env staging -- ...`
- [ ] `db:deploy:prod` - `infisical run --env prod -- ...`

#### 4.3 Local Environment Setup

Create `.env` file or set environment variable:

```bash
# Option A: Environment variable
export BW_ACCESS_TOKEN=<your-dev-access-token>

# Option B: .env file (add to .gitignore)
BW_ACCESS_TOKEN=<your-dev-access-token>
```

**Note:** For local development, you may want a separate machine account or use the dev access token.

#### 4.4 Update Playwright Setup

File: `playwright/global-setup.ts`

Update to use bws CLI instead of infisical:

**OLD:**
```typescript
const secret = await execSync(
  `infisical --env dev secrets get ${secretName} --plain`,
  { encoding: 'utf8' }
).trim();
```

**NEW:**
```typescript
const secret = await execSync(
  `bws secret get <secret-id> --access-token ${process.env.BW_ACCESS_TOKEN}`,
  { encoding: 'utf8' }
).trim();
```

---

### Phase 5: Documentation Updates

#### 5.1 Update Files

- [ ] `.env.example` - Update to show Bitwarden env var format
- [ ] `docs/OFFLINE.md` - Update secrets section
- [ ] `AGENTS.md` - Change "Never hardcode secrets - Use Infisical" to "Never hardcode secrets - Use Bitwarden"

#### 5.2 Remove Infisical Files

- [ ] Delete `.infisical.json`
- [ ] Remove any Infisical-related documentation

---

## Rollback Plan

If issues occur during migration:

1. **Keep Infisical workspace active** until Bitwarden is fully validated
2. **Do not delete Infisical secrets** until successful deployment
3. If Bitwarden fails in CI/CD:
   - Revert GitHub Actions workflow to use Infisical
   - Keep both systems running in parallel temporarily

---

## Verification Checklist

After migration, verify:

- [ ] `bun run dev` works with Bitwarden secrets locally
- [ ] Staging deployment works (branch deploy)
- [ ] Production deployment works (main branch)
- [ ] E2E tests pass with Bitwarden secrets
- [ ] Database deployments work for all environments
- [ ] Secrets are correctly masked in GitHub Actions logs

---

## File Changes Summary

| File | Action |
|------|--------|
| `.github/workflows/deploy.yml` | Modify - Replace Infisical with Bitwarden |
| `package.json` | Modify - Update all infisical run commands |
| `playwright/global-setup.ts` | Modify - Update to bws CLI |
| `.env.example` | Modify - Update env var format |
| `docs/OFFLINE.md` | Modify - Update secrets section |
| `AGENTS.md` | Modify - Update Infisical reference to Bitwarden |
| `.infisical.json` | Delete |

---

## Security Considerations

1. **Access Token Storage:** Store Bitwarden access tokens in GitHub Secrets, never in code
2. **Machine Account Isolation:** Each environment has its own machine account with minimal permissions
3. **Token Expiration:** Consider setting expiration on access tokens for additional security
4. **Audit Logs:** Bitwarden provides event logs for machine account access - review periodically
5. **Secret Rotation:** Update secrets in Bitwarden; CI/CD will automatically get latest values on next run

---

## References

- [Bitwarden Secrets Manager Overview](https://bitwarden.com/help/secrets-manager-overview/)
- [GitHub Actions Integration](https://bitwarden.com/help/github-actions-integration/)
- [Machine Accounts](https://bitwarden.com/help/machine-accounts/)
- [Access Tokens](https://bitwarden.com/help/access-tokens/)
- [Projects](https://bitwarden.com/help/projects/)
- [Secrets Manager CLI](https://bitwarden.com/help/secrets-manager-cli/)
- [bws CLI GitHub](https://github.com/bitwarden/sdk-sm/tree/main/crates/bws)

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Review | | | |
| Approve | | | |
| Implement | | | |
