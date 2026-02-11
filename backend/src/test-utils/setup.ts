/**
 * Per-file setup for integration tests.
 * Sets environment variables needed by the app.
 */

// NODE_ENV=development disables rate limiting in the app
process.env.NODE_ENV = 'development';
process.env.ADMIN_EMAILS = 'admin@ssaandco.com';
process.env.AUTH_EMAIL_DOMAIN = 'ssaandco.com';
process.env.ANTHROPIC_API_KEY = 'test-key';
