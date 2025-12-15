# Things I Would Do Differently or Improve

This document outlines improvements and changes I would make if given more time to work on this project.

## If I Had More Time

# Authorization and Authentication
* Currently we have no authentication or authorization, so any one can create or update any one elses application.  We can use our `middleware` directory here and utiilize JWT here.

# DELETE endpoint
* This doesn't really delete the application, but just modifies it.  Instead we can create or handle via our PATCH endpoint.  If we were to create a new one we can use `/applications/:id/delete`

# Handle migrations better
* Right now we're using our own migration.  We can use typeorm or something else more mature to handle migrations (or rewrite it make it better for the long term).  It works for this simple exercise, but I'm not sure what we will run into in the long term

# Quotes don't have a window
* Quotes are infinite and that doesn't seem realistic as a car quote can change depending on many factors like # of claims, accidents, etc...  So we need a window that they are valid for

# Documentation
* Didnt really add much documentation here , but can be useful.  Maybe even use POSTMAN to save our endpoints.  Also, if we ever open up we need to show what is expected input and also output

# Tracing/Metrics/Logging
* We don't really have any way to see what happens when something goes wrong other than our console.logs.  Would be good to have a stack trace and a way to view those via datadog, etc...

# No e2e's but then again this is just the api side of things

# No caching
* Currently every request hits the database. For frequently accessed applications, we could implement Redis caching to reduce database load and improve response times.

# Rate Limiting
* No protection against abuse or DDoS attacks. Should implement rate limiting per IP/user to prevent excessive requests.

# Health Check Endpoint
* No way to monitor if the server and database are healthy. Should add a `/health` endpoint that checks database connectivity and returns service status.

# Input Sanitization
* While we validate with Zod, we should also sanitize inputs to prevent XSS attacks and ensure data integrity.

# Environment Variable Validation
* Environment variables are loaded but not validated. Should validate required env vars at startup and fail fast if missing.

# Graceful Shutdown
* Server doesn't handle shutdown signals gracefully. Should close database connections and finish in-flight requests before exiting.

# Request Size Limits
* No limits on request body size. Could allow malicious users to send extremely large payloads, causing memory issues.

# Database Indexes
* Currently only have basic indexes. Should analyze query patterns and add indexes for common lookups (e.g., status, submitted_at for filtering).

# Error Monitoring
* Only using console.log for errors. Should integrate with error monitoring service (Sentry, Rollbar) for production error tracking and alerting.

# API Versioning
* No versioning strategy. If we need to make breaking changes, we should support `/v1/applications`, `/v2/applications`, etc.

# Security Headers
* Missing security headers (CORS, CSP, etc.). Should add middleware to set appropriate security headers for production.