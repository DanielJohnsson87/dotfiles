---
name: product-playbook
description: >
  Reference guide and standalone tool for accessing and interacting with the product
  under development. Covers: environment/credential discovery, browser login flows,
  API endpoint testing, and product navigation patterns. Used by the product-qa agent
  and available to any agent or conversation that needs to interact with the running
  application. Trigger with /playbook to run interactive discovery, or read as a
  reference document.
allowed-tools:
  - Bash
  - Read
---

# Product Playbook

> **Requires:** gstack browse binary for browser interactions. Run `/browse` once to set up.

Reference guide for interacting with the product. Teaches HOW to discover and use
credentials, login, browse, and test APIs. Project-specific details (which URLs,
which env vars, which endpoints) belong in agent memory, not here.

When invoked as `/playbook`, run the discovery workflow interactively and report findings.
When read as a reference, follow the relevant section for your task.

## 1. Environment & Credential Discovery

### Finding Credentials

Before interacting with the product, discover how to authenticate:

```bash
# 1. Check for .env files
ls -la .env* 2>/dev/null

# 2. Check for config directories
ls config/ settings/ 2>/dev/null

# 3. Check for docker-compose environment definitions
grep -A5 'environment:' docker-compose*.yml 2>/dev/null

# 4. Check appsettings / application config
ls appsettings*.json application*.yml application*.properties 2>/dev/null

# 5. Check shell environment for relevant vars
env | grep -i -E '(api|key|secret|token|pass|url|host|port|base)' | sed 's/=.*/=[REDACTED]/'
```

### Reading Env Vars

```bash
# From .env files (show keys only, not values)
grep -E '^[A-Z_]+=.' .env* 2>/dev/null | sed 's/=.*//'

# From shell environment (filtered, redacted)
env | grep -i -E '(api_|app_|db_|auth_|base_|login)' | sed 's/=.*/=[REDACTED]/' | head -20

# From docker-compose
grep -A2 'environment:' docker-compose*.yml 2>/dev/null
```

### Security Rules

- **NEVER** log, print, or include raw credential values in output or reports
- Reference credentials by env var NAME, not value (e.g., `$APP_PASSWORD`)
- Use `$VAR_NAME` syntax in curl/browse commands so values resolve at runtime
- If showing a credential to the user, redact it: `sk-...abc123`
- Never write credential values to memory files

## 2. Browser Login Flow

### Prerequisites

Find the browse binary first:

```bash
B=$(browse/bin/find-browse 2>/dev/null || ~/.claude/skills/gstack/browse/bin/find-browse 2>/dev/null)
if [ -n "$B" ]; then
  echo "READY: $B"
else
  echo "NEEDS_SETUP — run /browse first to set up the browser"
fi
```

### Discovery (First Time)

When you don't know the login flow yet:

```bash
# 1. Navigate to the app's main URL
$B goto "$APP_URL"

# 2. Check if we landed on a login page or were redirected
$B url
$B snapshot -i

# 3. If there's a login form, map its fields
$B forms

# 4. Take an annotated screenshot for reference
$B snapshot -i -a -o /tmp/login-discovery.png
```

Record what you find (login URL, form field refs, submit button ref) in agent memory.

### Standard Login Pattern

```bash
# Navigate to known login URL
$B goto "$LOGIN_URL"
$B snapshot -i

# Fill credentials from env vars
$B fill @username_ref "$USERNAME_VAR"
$B fill @password_ref "$PASSWORD_VAR"

# Submit
$B click @submit_ref

# Verify login succeeded
$B snapshot -D
$B url
```

### Handling Special Cases

**MFA/2FA:** If a second factor is required, ask the user:
"Login requires a verification code. Please provide it or complete the step manually."

**CAPTCHA:** If a CAPTCHA blocks login:
"CAPTCHA detected. Please complete it in the browser, then tell me to continue."

**OAuth/SSO:** If login redirects to an external provider:
"This app uses external authentication. Use cookie import instead: `$B cookie-import-browser`"

### Session Persistence

- Browser state (cookies, sessions) persists between `$B` calls
- After successful login, navigate freely until the session expires
- If a page returns 401 or redirects to login, re-run the login sequence
- For long sessions, consider cookie import: `$B cookie-import-browser`

## 3. API Endpoint Testing

### Discovering Endpoints

```bash
# Check for API docs
ls docs/api* openapi* swagger* 2>/dev/null
find . -maxdepth 3 -name "openapi*" -o -name "swagger*" 2>/dev/null

# Check for route definitions
grep -rl "router\.\|app\.\(get\|post\|put\|delete\)\|@app\.route\|@Controller\|MapGet\|MapPost" \
  --include="*.ts" --include="*.js" --include="*.py" --include="*.rb" --include="*.cs" \
  2>/dev/null | head -10

# Check for RPC/proto definitions
find . -maxdepth 4 -name "*.proto" -o -name "*rpc*" -o -name "*api*" 2>/dev/null | head -10

# Check for Postman/Insomnia collections
find . -maxdepth 2 -name "*.postman_collection*" -o -name "*.insomnia*" 2>/dev/null
```

### Curl Patterns

```bash
# Health check — quick connectivity test
curl -sf "$API_BASE_URL/health" > /dev/null && echo "API OK" || echo "API DOWN"

# Authenticated GET (Bearer token)
curl -s -H "Authorization: Bearer $API_TOKEN" "$API_BASE_URL/endpoint"

# Authenticated GET (API key header)
curl -s -H "X-API-Key: $API_KEY" "$API_BASE_URL/endpoint"

# POST with JSON body
curl -s -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}' \
  "$API_BASE_URL/endpoint"

# Check response status only
curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/endpoint"

# With cookie auth (session-based)
curl -s -b "$COOKIE_FILE" "$API_BASE_URL/endpoint"

# Verbose mode for debugging
curl -v -H "Authorization: Bearer $API_TOKEN" "$API_BASE_URL/endpoint" 2>&1
```

### RPC Patterns

```bash
# JSON-RPC
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"MethodName","params":[],"id":1}' \
  "$API_BASE_URL/rpc"

# gRPC (if grpcurl available)
grpcurl -plaintext "$API_HOST:$API_PORT" list
grpcurl -plaintext -d '{}' "$API_HOST:$API_PORT" service.Method
```

## 4. Product Navigation

### First Visit Workflow

1. Login (see section 2)
2. Take annotated screenshot of landing page:
   ```bash
   $B snapshot -i -a -o /tmp/landing.png
   ```
3. Map navigation structure:
   ```bash
   $B links
   $B snapshot -i
   ```
4. Visit key areas and screenshot each
5. Record the product map in agent memory

### Verifying a Feature

1. Navigate to the feature
2. `$B snapshot -i -a -o /tmp/feature-before.png`
3. Interact (fill forms, click buttons, trigger actions)
4. `$B snapshot -D` — what changed?
5. `$B console --errors` — any JS errors?
6. If the feature has API backing, test with curl too
7. Document findings

### Checking After a Deploy

```bash
# Quick health check
curl -sf "$API_BASE_URL/health"
$B goto "$APP_URL"
$B console --errors
$B snapshot -i -a -o /tmp/post-deploy.png
```

## 5. What to Record

If you have persistent memory, record the following after each session:

- **Access details**: login URL, form field refs, env var names for credentials, API base URL
- **Product map**: navigation structure, key pages, important features
- **API endpoints**: discovered endpoints, their purpose, expected responses
- **Gotchas**: things that break, edge cases, confusing UX, flaky behaviors
- **Domain knowledge**: business rules observed, data relationships, user flows

This section is a guide for what's worth capturing. The agent using this playbook
decides where and how to persist it.

## 6. Standalone Discovery Mode (/playbook)

When invoked as `/playbook`, run this interactive discovery:

1. **Environment scan** — find all credential sources, report env var names (redacted values)
2. **App URL discovery** — find the app URL from env vars, config, or docker-compose
3. **Login flow mapping** — navigate to app, document the login process
4. **API discovery** — find route definitions, API docs, key endpoints
5. **Navigation mapping** — login and map the product's main areas
6. **Report** — summarize all findings, suggest what to record in agent memory
