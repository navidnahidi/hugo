# API Spec Changes and Additions

This document describes the changes and additions made to the API specification beyond the original requirements.

## Error Response Format

### Addition: Standardized Error Response Structure

**Original Spec:** No specific error format was defined.

**Implementation:**
All error responses follow a consistent structure:

```json
{
  "error": "Validation error",
  "message": "Validation error: primaryDriver.gender - Invalid option: expected one of 'male', 'female', 'non-binary'",
  "details": [
    {
      "code": "invalid_enum_value",
      "path": ["primaryDriver", "gender"],
      "message": "Invalid option: expected one of 'male', 'female', 'non-binary'"
    }
  ]
}
```

**Error Types:**
- `Validation error` (400) - Invalid input data with detailed validation messages
- `Not found` (404) - Resource not found
- `Forbidden` (403) - Operation not allowed (e.g., updating submitted application)
- `Internal server error` (500) - Unexpected server errors

**Rationale:**
- Provides clear, actionable error messages for frontend developers
- Includes both human-readable messages and structured error details
- Consistent error format across all endpoints
- Helps with debugging and user experience


** Can ignore the following as t

## GET /applications/:id Enhancements

### Addition: Dynamic Validation Errors and Quote Price

**Original Spec:** Returns application data. Must include calculated price if valid, or validation errors if incomplete.

**Implementation:**
The GET endpoint now provides real-time validation feedback:

**Response when application is complete and valid:**
```json
{
  "id": "application-id",
  "status": "draft",
  "primaryDriver": { ... },
  "vehicles": { ... },
  "quotePrice": 1234.56,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Response when application is incomplete:**
```json
{
  "id": "application-id",
  "status": "draft",
  "primaryDriver": { ... },
  "validationErrors": [
    {
      "code": "invalid_type",
      "path": ["primaryDriver", "gender"],
      "message": "Required"
    },
    {
      "code": "invalid_type",
      "path": ["vehicles"],
      "message": "Expected object, received undefined"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Response when application is submitted:**
```json
{
  "id": "application-id",
  "status": "submitted",
  "primaryDriver": { ... },
  "quotePrice": 1234.56,
  "submittedAt": "2024-01-01T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Rationale:**
- Provides real-time feedback on application completeness
- Allows frontend to show what's missing before submission
- Aligns with the requirement to show validation errors
- Quote price is calculated on-the-fly for valid draft applications

## POST /applications/:id/submit Enhancements

### Addition: Detailed Validation Error Messages

**Original Spec:** Submits application and returns quote price, or validation errors if incomplete.

**Implementation:**
When submission fails due to incomplete data, the response includes:

```json
{
  "error": "Validation error",
  "message": "Validation failed for 5 field(s): primaryDriver.gender: Required; primaryDriver.maritalStatus: Required; mailingAddress: Required; garagingAddress: Required; vehicles: Expected object, received undefined",
  "details": [
    {
      "code": "invalid_type",
      "path": ["primaryDriver", "gender"],
      "message": "Required"
    },
    // ... more errors
  ]
}
```

**Rationale:**
- Clear indication of what needs to be fixed
- Structured error details for programmatic handling
- Human-readable summary message

## Response Metadata

### Addition: Timestamps in GET Responses

**Implementation:**
All GET responses include metadata:

```json
{
  "id": "application-id",
  "status": "draft",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "submittedAt": "2024-01-01T00:00:00Z", // Only if submitted
  // ... application data
}
```

**Rationale:**
- Provides audit trail information
- Helps with debugging and support
- Standard practice for REST APIs

## Health Check Endpoint

### Addition: GET /

**Implementation:**
Added a basic health check endpoint:

```json
{
  "message": "Hugo Backend API"
}
```

**Rationale:**
- Useful for monitoring and load balancer health checks
- Simple way to verify server is running
- Standard practice for APIs

## No Changes to Core Endpoints

The following endpoints were implemented exactly as specified:
- `POST /applications` - Creates application with partial data
- `PATCH /applications/:id` - Updates with partial data merging
- `DELETE /applications/:id/data` - Deletes data by path
- `POST /applications/:id/submit` - Submits and returns quote price

All core functionality matches the original specification. The additions are primarily around error handling, response formatting, and metadata.

