# OAuth2 Proxy

## Introduction

OAuth2-Proxy is a flexible, open-source reverse proxy and authentication middleware that provides OAuth2/OIDC authentication for web applications. It acts as a gatekeeper between clients and upstream services, intercepting HTTP requests and redirecting unauthenticated users to OAuth2 providers (Google, GitHub, Microsoft Entra ID, Keycloak, generic OIDC, and many others) for authentication. The proxy validates sessions, manages cookies, and forwards authenticated requests to backend applications with user identity information in HTTP headers.

The project supports both standalone deployment as a reverse proxy and integration as middleware into existing infrastructure. It offers extensive session management capabilities including cookie-based and Redis-backed storage, JWT bearer token validation, group-based authorization, and flexible request routing with skip-auth patterns. OAuth2-Proxy handles token refresh, PKCE for enhanced security, and provides health check endpoints, Prometheus metrics, and comprehensive logging for production environments.

## API Reference and Key Functions

### Starting the OAuth2 Proxy Server

Run the OAuth2-Proxy binary with configuration file or command-line flags to start the authentication proxy server.

```bash
# Basic startup with config file
oauth2-proxy --config=/etc/oauth2-proxy.cfg

# Startup with command-line flags
oauth2-proxy \
  --http-address="0.0.0.0:4180" \
  --provider="oidc" \
  --client-id="your-client-id" \
  --client-secret="your-client-secret" \
  --cookie-secret="$(python -c 'import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())')" \
  --oidc-issuer-url="https://your-provider.com" \
  --redirect-url="https://app.example.com/oauth2/callback" \
  --email-domain="*" \
  --upstream="http://localhost:8080"

# Check version
oauth2-proxy --version
```

### Configuration File Setup

Create a configuration file with OAuth provider settings and upstream backend configuration.

```toml
# /etc/oauth2-proxy.cfg

# Server settings
http_address="0.0.0.0:4180"
upstreams=["http://backend-app:8080"]
proxy_prefix="/oauth2"

# Cookie configuration
cookie_secret="OQINaROshtE9TcZkNAm-5Zs2Pv3xaWytBmc5W7sPX7w="
cookie_secure=true
cookie_domains=[".example.com"]
cookie_name="_oauth2_proxy"
cookie_expire="168h"
cookie_refresh="60m"
cookie_httponly=true
cookie_samesite="lax"

# Email domain restrictions
email_domains=["example.com", "trusted-domain.com"]

# Whitelist domains for post-auth redirects
whitelist_domains=[".example.com", ".trusted-domain.com"]

# OIDC Provider Configuration
provider="oidc"
provider_display_name="Company SSO"
client_id="your-oauth2-client-id"
client_secret="your-oauth2-client-secret"
oidc_issuer_url="https://auth.example.com"
redirect_url="https://app.example.com/oauth2/callback"

# OIDC Claims
oidc_email_claim="email"
oidc_groups_claim="groups"
allowed_groups=["admins", "developers"]

# PKCE for enhanced security
code_challenge_method="S256"

# Skip authentication for specific routes
skip_auth_route=["GET=^/health$", "GET=^/public/.*"]
skip_auth_preflight=true

# API routes (return 401 instead of redirect)
api_routes=["^/api/.*"]

# Request headers to inject
set_xauthrequest=true
```

### Docker Deployment

Deploy OAuth2-Proxy using Docker with volume-mounted configuration.

```yaml
# docker-compose.yaml
version: '3.0'
services:
  oauth2-proxy:
    image: quay.io/oauth2-proxy/oauth2-proxy:latest
    container_name: oauth2-proxy
    command: --config /oauth2-proxy.cfg
    ports:
      - "4180:4180"
    volumes:
      - ./oauth2-proxy.cfg:/oauth2-proxy.cfg
    restart: unless-stopped
    environment:
      OAUTH2_PROXY_CLIENT_SECRET: "${OAUTH2_PROXY_CLIENT_SECRET}"
      OAUTH2_PROXY_COOKIE_SECRET: "${OAUTH2_PROXY_COOKIE_SECRET}"
    networks:
      - app-network
    depends_on:
      - backend-app

  backend-app:
    image: your-app:latest
    container_name: backend-app
    expose:
      - "8080"
    networks:
      - app-network

networks:
  app-network:
```

```bash
# Start with Docker Compose
docker-compose up -d

# Access application through proxy
curl -L http://localhost:4180/
# User is redirected to OAuth provider for authentication
```

### Nginx Integration

Configure Nginx to use OAuth2-Proxy for authentication via auth_request directive.

```nginx
# /etc/nginx/conf.d/app.conf

upstream oauth2-proxy {
    server localhost:4180;
}

upstream backend {
    server localhost:8080;
}

server {
    listen 80;
    server_name app.example.com;

    location /oauth2/ {
        proxy_pass http://oauth2-proxy;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        auth_request /oauth2/auth;
        error_page 401 = /oauth2/sign_in;

        # Pass authentication info to backend
        auth_request_set $user $upstream_http_x_auth_request_user;
        auth_request_set $email $upstream_http_x_auth_request_email;
        auth_request_set $groups $upstream_http_x_auth_request_groups;

        proxy_set_header X-User $user;
        proxy_set_header X-Email $email;
        proxy_set_header X-Groups $groups;

        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Test Nginx configuration
nginx -t

# Reload Nginx
nginx -s reload

# OAuth2-Proxy configuration for Nginx integration
cat > /etc/oauth2-proxy.cfg <<EOF
http_address="127.0.0.1:4180"
upstreams=["http://127.0.0.1:8080"]
set_xauthrequest=true
pass_authorization_header=true
pass_access_token=false
pass_user_headers=true
EOF
```

### Provider Configuration - Google

Configure OAuth2-Proxy to use Google as the identity provider.

```toml
# Google OAuth Configuration
provider="google"
client_id="123456789.apps.googleusercontent.com"
client_secret="your-google-client-secret"
redirect_url="https://app.example.com/oauth2/callback"

# Restrict to specific Google Workspace domain
email_domains=["company.com"]

# Google-specific options
google_group=["admins@company.com", "developers@company.com"]
google_admin_email="admin@company.com"
google_service_account_json="/path/to/service-account.json"
```

```bash
# Create Google OAuth credentials at:
# https://console.cloud.google.com/apis/credentials

# Set authorized redirect URIs:
# https://app.example.com/oauth2/callback

# Start OAuth2-Proxy with Google provider
oauth2-proxy \
  --provider="google" \
  --client-id="123456789.apps.googleusercontent.com" \
  --client-secret="${GOOGLE_CLIENT_SECRET}" \
  --cookie-secret="${COOKIE_SECRET}" \
  --redirect-url="https://app.example.com/oauth2/callback" \
  --email-domain="company.com" \
  --upstream="http://localhost:8080"
```

### Provider Configuration - GitHub

Configure OAuth2-Proxy with GitHub as the authentication provider.

```toml
# GitHub OAuth Configuration
provider="github"
client_id="github-oauth-app-client-id"
client_secret="github-oauth-app-client-secret"
redirect_url="https://app.example.com/oauth2/callback"

# Restrict by GitHub organization
github_org="your-organization"
github_team="engineering,product"

# Or restrict by email domain
email_domains=["users.noreply.github.com"]

# GitHub API endpoint (for GitHub Enterprise)
# login_url="https://github.company.com/login/oauth/authorize"
# redeem_url="https://github.company.com/login/oauth/access_token"
# validate_url="https://github.company.com/api/v3"
```

```bash
# Register OAuth App at: https://github.com/settings/developers
# Set Authorization callback URL: https://app.example.com/oauth2/callback

# Start with GitHub provider
oauth2-proxy \
  --provider="github" \
  --client-id="${GITHUB_CLIENT_ID}" \
  --client-secret="${GITHUB_CLIENT_SECRET}" \
  --cookie-secret="${COOKIE_SECRET}" \
  --redirect-url="https://app.example.com/oauth2/callback" \
  --github-org="your-organization" \
  --github-team="engineering" \
  --upstream="http://localhost:8080"
```

### Provider Configuration - Generic OIDC

Configure OAuth2-Proxy with a generic OpenID Connect provider (works with Keycloak, Okta, Auth0, etc.).

```toml
# Generic OIDC Configuration
provider="oidc"
provider_display_name="Corporate SSO"
client_id="oauth2-proxy"
client_secret="super-secret-client-secret"
redirect_url="https://app.example.com/oauth2/callback"

# OIDC Discovery URL
oidc_issuer_url="https://auth.company.com/realms/master"

# OIDC Claims Configuration
oidc_email_claim="email"
oidc_groups_claim="groups"
oidc_user_id_claim="sub"

# Audience validation
oidc_extra_audiences=["additional-audience"]

# Group-based access control
allowed_groups=["admins", "developers", "operators"]

# PKCE support
code_challenge_method="S256"

# Skip email verification (use cautiously)
# insecure_oidc_allow_unverified_email=true
```

```bash
# OIDC Discovery will auto-configure endpoints from:
# https://auth.company.com/realms/master/.well-known/openid-configuration

# Manual endpoint configuration (if discovery is disabled)
oauth2-proxy \
  --provider="oidc" \
  --client-id="oauth2-proxy" \
  --client-secret="${CLIENT_SECRET}" \
  --cookie-secret="${COOKIE_SECRET}" \
  --oidc-issuer-url="https://auth.company.com/realms/master" \
  --redirect-url="https://app.example.com/oauth2/callback" \
  --email-domain="*" \
  --oidc-groups-claim="groups" \
  --allowed-group="developers" \
  --code-challenge-method="S256" \
  --upstream="http://localhost:8080"
```

### Session Store - Redis Backend

Configure Redis-backed session storage for scalability and session sharing across multiple OAuth2-Proxy instances.

```toml
# Redis Session Store Configuration
session_store_type="redis"

# Redis connection
redis_connection_url="redis://localhost:6379"
# Or with authentication:
# redis_connection_url="redis://user:password@localhost:6379/0"
# Redis Sentinel:
# redis_connection_url="redis://localhost:26379/0?master_name=mymaster"
# Redis Cluster:
# redis_use_cluster=true
# redis_cluster_connection_urls=["redis://node1:6379", "redis://node2:6379"]

# Session TTL
cookie_expire="168h"
redis_expiration="169h"

# Optional: use minimal cookies (store tokens only in Redis)
session_cookie_minimal=true
```

```bash
# Start Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# Start OAuth2-Proxy with Redis sessions
oauth2-proxy \
  --config=/etc/oauth2-proxy.cfg \
  --session-store-type="redis" \
  --redis-connection-url="redis://localhost:6379"

# Verify session in Redis
redis-cli KEYS "_oauth2_proxy_*"
redis-cli GET "_oauth2_proxy_SESSION_ID"
```

### Skip Authentication Routes

Configure routes that bypass authentication for public endpoints, health checks, or specific paths.

```toml
# Skip authentication for specific routes
# Format: METHOD=REGEX or just REGEX for all methods

skip_auth_route=[
    "GET=^/health$",
    "GET=^/metrics$",
    "GET=^/public/.*",
    "POST=^/webhooks/.*",
    "^/static/.*",
    "!=^/admin/.*"  # Negate: skip all routes EXCEPT /admin/*
]

# Skip OPTIONS requests (CORS preflight)
skip_auth_preflight=true

# API routes return 401 instead of redirect
api_routes=[
    "^/api/.*",
    "^/v1/.*"
]

# Skip JWT bearer token authentication
skip_jwt_bearer_tokens=true
extra_jwt_issuers=["https://another-issuer.com=api-audience"]
```

```bash
# Test skip-auth routes
curl http://localhost:4180/health
# Returns without authentication redirect

curl http://localhost:4180/protected
# Redirects to OAuth provider

curl -H "Authorization: Bearer valid-jwt-token" \
     http://localhost:4180/api/data
# JWT validated, no cookie session needed
```

### Trusted IP Bypass

Allow specific IP addresses or CIDR ranges to bypass authentication (use with caution in production).

```toml
# Trust specific IPs or ranges
reverse_proxy=true
real_client_ip_header="X-Real-IP"

trusted_ips=[
    "10.0.0.0/8",        # Internal network
    "192.168.1.100",      # Specific monitoring server
    "172.16.0.0/12"       # Docker network
]

# Skip authentication for requests from trusted IPs
skip_auth_route=[]  # Combine with route-based skipping if needed
```

```bash
# IMPORTANT: Use behind a trusted reverse proxy
# Set real_client_ip_header correctly to prevent IP spoofing

# Nginx configuration
location / {
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://oauth2-proxy;
}

# Test from trusted IP
curl --interface 10.0.0.50 http://localhost:4180/
# Access granted without authentication
```

### Authentication Endpoint - Verify Session

Use the /oauth2/auth endpoint to verify if a request has a valid authenticated session.

```bash
# Check authentication status
curl -i -H "Cookie: _oauth2_proxy=SESSION_COOKIE" \
     http://localhost:4180/oauth2/auth

# Successful authentication returns:
# HTTP/1.1 202 Accepted
# X-Auth-Request-User: user@example.com
# X-Auth-Request-Email: user@example.com
# X-Auth-Request-Groups: admins,developers

# Failed authentication returns:
# HTTP/1.1 401 Unauthorized

# Use with Nginx auth_request
location /protected {
    auth_request /oauth2/auth;
    error_page 401 = /oauth2/sign_in;

    auth_request_set $user $upstream_http_x_auth_request_user;
    proxy_set_header X-User $user;
    proxy_pass http://backend;
}
```

### User Info Endpoint

Retrieve authenticated user information in JSON format.

```bash
# Get current user info
curl -H "Cookie: _oauth2_proxy=SESSION_COOKIE" \
     http://localhost:4180/oauth2/userinfo

# Response:
# {
#   "user": "john.doe",
#   "email": "john.doe@example.com",
#   "groups": ["developers", "admins"],
#   "preferredUsername": "jdoe"
# }

# Unauthenticated request returns:
# HTTP/1.1 401 Unauthorized
```

### Sign In and Sign Out Flows

Manually trigger authentication or logout flows.

```bash
# Initiate sign-in (typically triggered by redirect)
curl -L http://localhost:4180/oauth2/sign_in?rd=/protected/page

# This redirects to OAuth provider, then back to /oauth2/callback,
# then finally to /protected/page

# Sign out and clear session
curl -L -b cookies.txt http://localhost:4180/oauth2/sign_out?rd=/

# Backend logout (sends request to provider's logout endpoint)
# Configuration:
backend_logout_url="https://auth.provider.com/logout?id_token_hint={id_token}"

# The {id_token} placeholder is replaced with the user's actual ID token
```

### Health and Readiness Checks

Configure and use health check endpoints for monitoring and orchestration.

```toml
# Health check endpoints
ping_path="/ping"
ping_user_agent="kube-probe/1.0"
ready_path="/ready"
```

```bash
# Liveness probe - basic health check
curl http://localhost:4180/ping
# Returns: OK

# Readiness probe - checks if proxy can serve traffic
curl http://localhost:4180/ready
# Returns: OK (or 503 if not ready)

# Kubernetes probe configuration
livenessProbe:
  httpGet:
    path: /ping
    port: 4180
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 4180
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Prometheus Metrics

Enable and configure Prometheus metrics for monitoring.

```toml
# Enable metrics on separate port
metrics_address="0.0.0.0:9090"
metrics_path="/metrics"
```

```bash
# Scrape metrics
curl http://localhost:9090/metrics

# Key metrics exposed:
# oauth2_proxy_requests_total{method="GET",path="/"}
# oauth2_proxy_authentication_attempts_total{result="success"}
# oauth2_proxy_authentication_attempts_total{result="failure"}
# oauth2_proxy_cookie_refresh_total
# oauth2_proxy_upstream_requests_total{upstream="http://backend"}

# Prometheus scrape configuration
scrape_configs:
  - job_name: 'oauth2-proxy'
    static_configs:
      - targets: ['oauth2-proxy:9090']
```

### Request Header Injection

Configure headers to inject authenticated user information into upstream requests.

```toml
# Inject headers with user information
set_xauthrequest=true
pass_authorization_header=true
pass_access_token=false
pass_user_headers=true
set_authorization_header=false

# Basic auth passthrough
pass_basic_auth=true
basic_auth_password="secret"
```

```bash
# Headers automatically added to upstream requests:
# X-Auth-Request-User: user@example.com
# X-Auth-Request-Email: user@example.com
# X-Auth-Request-Groups: admins,developers
# X-Auth-Request-Preferred-Username: johndoe

# Backend application can read headers:
# Go example:
user := r.Header.Get("X-Auth-Request-User")
email := r.Header.Get("X-Auth-Request-Email")
groups := strings.Split(r.Header.Get("X-Auth-Request-Groups"), ",")

# Python Flask example:
from flask import request
user = request.headers.get('X-Auth-Request-User')
email = request.headers.get('X-Auth-Request-Email')
```

### Htpasswd File Authentication

Add basic authentication as a fallback or additional authentication layer.

```bash
# Create htpasswd file with bcrypt encryption
htpasswd -cB /etc/oauth2-proxy.htpasswd user1
htpasswd -B /etc/oauth2-proxy.htpasswd user2

# Configuration
htpasswd_file="/etc/oauth2-proxy.htpasswd"
htpasswd_user_groups=["htpasswd-users", "basic-auth"]
display_htpasswd_form=true
```

```toml
# Full configuration with htpasswd
provider="oidc"
oidc_issuer_url="https://auth.example.com"
client_id="client-id"
client_secret="client-secret"

# Basic auth fallback
htpasswd_file="/etc/oauth2-proxy.htpasswd"
htpasswd_user_groups=["local-users"]
display_htpasswd_form=true
```

### Alpha Configuration Format

Use the new alpha YAML configuration format for advanced features.

```yaml
# alpha-config.yaml
injectRequestHeaders:
  - name: X-Auth-User
    values:
      - claim: email
  - name: X-Auth-Groups
    values:
      - claim: groups
  - name: X-Custom-Header
    values:
      - value: "static-value"

injectResponseHeaders:
  - name: X-Frame-Options
    values:
      - value: "DENY"

upstreamConfig:
  upstreams:
    - id: backend
      path: /
      uri: http://backend-service:8080
      rewriteTarget: "/"

    - id: api
      path: /api
      uri: http://api-service:8081
      rewriteTarget: "/v1"
      flushInterval: 1s

  proxyRawPath: false

metricsServer:
  bindAddress: "0.0.0.0:9090"
  secureBindAddress: ""

server:
  bindAddress: "0.0.0.0:4180"
  timeouts:
    read: 30s
    write: 30s
```

```bash
# Use alpha config
oauth2-proxy \
  --config=/etc/oauth2-proxy.cfg \
  --alpha-config=/etc/alpha-config.yaml

# Convert legacy config to alpha format
oauth2-proxy \
  --config=/etc/oauth2-proxy.cfg \
  --convert-config-to-alpha > alpha-config.yaml
```

## Use Cases and Integration Patterns

OAuth2-Proxy serves as a versatile authentication gateway for various deployment scenarios. The primary use case is protecting internal applications and dashboards that lack built-in authentication by placing OAuth2-Proxy in front of them as a reverse proxy. This is ideal for tools like Grafana, Prometheus, Kibana, or custom internal applications where you want to leverage corporate SSO (Google Workspace, Azure AD, Okta) instead of managing separate credentials. The proxy handles all OAuth2/OIDC flows transparently, setting cookies and forwarding authenticated requests to backends with user information in headers. Another common pattern is microservices authentication where OAuth2-Proxy runs as a sidecar container or API gateway component, validating JWT bearer tokens for service-to-service communication while also supporting browser-based OAuth flows for human users.

For production deployments, OAuth2-Proxy integrates seamlessly with existing infrastructure as middleware rather than a standalone proxy. The auth_request pattern with Nginx or Traefik is widely used: the reverse proxy delegates authentication decisions to OAuth2-Proxy via internal subrequests, caching results and only prompting users to re-authenticate when sessions expire. Redis-backed session storage enables horizontal scaling across multiple proxy instances with shared session state, critical for high-availability setups. Multi-upstream configurations route different URL paths to different backend services through a single authentication layer. Group-based authorization with OIDC claims or GitHub teams provides fine-grained access control, while skip-auth routes and trusted IP ranges accommodate public endpoints, health checks, and internal monitoring tools without requiring authentication.

