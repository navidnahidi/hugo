# Implementation Notes

This document outlines the specific assumptions, design decisions, and implementation details that influenced the development of this API.

## Architecture Overview

The codebase is structured using a **Model-Controller-Router** architecture pattern to enforce clear separation of concerns and improve maintainability:

- **`router/`**: Handles HTTP routing, extracts request parameters and body data, and delegates to controllers. This layer is responsible for mapping HTTP requests to controller functions and managing route-specific middleware.

- **`controllers/`**: Contains business logic, input validation (using Zod schemas), orchestrating model operations, and enforcing business rules (e.g., preventing updates to submitted applications). Controllers are decoupled from direct database access and HTTP concerns.

- **`models/`**: Contains all database operations, SQL queries, and data persistence logic. This layer abstracts database implementation details and provides a clean interface for data access.

- **`errors/`**: Custom error classes for consistent error handling across the application.

- **`middleware/`**: Shared middleware functions, such as error handling, that can be applied across routes.

- **`controllers/schemas/`**: Zod validation schemas that define the structure and validation rules for request data.

This separation ensures that:
- Database queries are isolated in models, making it easier to test and potentially swap database implementations
- Business logic is centralized in controllers, independent of HTTP routing details
- Routes remain thin and focused solely on HTTP request/response handling
- Each layer has a single, well-defined responsibility, improving code readability and testability

## Assumptions About Requirements

### Data Storage

**Assumption:** Application data is stored as JSON in a single column rather than normalized across multiple tables.

**Rationale:**
- Don't need to worry about how to handle transactions cause the entire logic will be to create or update in a single query
- The requirement allows for partial data storage, which is easier to manage with a flexible JSON structure
- SQLite's has built-in JSON functions (`json_patch`, `json_remove`) provide efficient ways to update nested data
- This approach simplifies the schema and makes it easier to add new fields without migrations
- The application data structure is naturally hierarchical and fits well in a JSON document

**Trade-offs:**
- Less normalized than traditional relational design. This also means the id is more arbitrary for things like the vehicles and additional drivers
- Querying specific fields requires JSON functions
- No foreign key constraints on nested data
- Searching for nested json fields is not efficient
- However, this aligns with the requirement for flexible, partial data storage

### Multiple Applications

**Assumption:** Users can create multiple applications without duplicate prevention.

**Rationale:**
- The requirements don't specify preventing duplicate applications
- In a real-world scenario, customers might want to compare quotes or restart an application
- Each application has a unique ID and status (`draft` or `submitted`)
- Business logic can be added later if duplicate prevention is needed

### Validation Strategy

**Assumption:** Validation is performed at the application layer using Zod schemas, not at the database level.

**Rationale:**
- The requirement states "Partial data can be stored, but never invalid data"
- This means we need flexible validation that allows partial data but rejects invalid values
- Database constraints are too rigid for this use case
- Zod provides excellent error messages and type safety
- Application-level validation allows for complex rules (e.g., age calculations, date ranges)

### Vehicle and Driver Limits

**Assumption:** The constraints "1-3 vehicles" and "max 3 additional drivers" are enforced in the application layer, not database constraints.

**Rationale:**
- These are business rules that may need to change
- Database constraints would require triggers or application-level checks anyway
- Zod's `.refine()` method provides clear validation errors
- Easier to test and modify business rules

### Quote Price Calculation

**Assumption:** Quote prices are randomly generated for this exercise, as specified in the requirements.

**Rationale:**
- The README explicitly states "For this exercise, a random number can be returned"
- No pricing algorithm was specified
- The focus is on API functionality, not pricing logic
- In production, this would be replaced with actual pricing calculations


## Implementation Details

### Schema Design

**Zod Schema Structure:**
- Base schemas for reusable components (state, zip code, names, etc.)
- Single comprehensive `applicationSchema` that allows partial updates
- Separate `applicationSubmissionSchema` for strict validation on submission
- Custom refinements for business rules (vehicle count, driver count, age validation)

**Rationale:**
- Reduces code duplication
- Ensures consistency across validation
- Clear separation between draft (partial) and submission (strict) validation

### Error Handling

**Centralized Error System:**
- Custom error classes (`ApplicationError`, `ValidationError`, `NotFoundError`, `ForbiddenError`, `ServerError`)
- Koa middleware for consistent error formatting
- Human-readable error messages from Zod validation issues

**Rationale:**
- Consistent error responses across all endpoints
- Easy to extend with new error types
- Better developer experience with clear error messages

### Database Operations

**SQLite JSON Functions:**
- `json_patch()` for merging partial updates (RFC 7396 JSON Merge Patch)
- `json_remove()` for deleting nested paths
- `json_extract()` for checking path existence

**Rationale:**
- More efficient than fetching, modifying in JavaScript, and updating
- Atomic operations at the database level
- Leverages SQLite's native JSON capabilities


## Technical Decisions

### Why Koa over Express?

- Koa's async/await support is more natural
- Better error handling with try/catch
- More modern middleware pattern
- Smaller, more focused API
- I'm slightly biased towards using it

### Why better-sqlite3 over other SQLite libraries?

- Synchronous API is simpler for this use case
- Better performance for read-heavy workloads
- Native module with good TypeScript support
- Active maintenance and good documentation

### Why Zod for Validation?

- Excellent TypeScript integration
- Great error messages out of the box
- Supports complex validation rules
- Type inference from schemas
- Active development and community

### Why JSON Storage?

- Flexible schema for partial data
- Easy to update nested structures
- SQLite JSON functions are efficient and has built-in functions to remove or update
- Simpler than managing multiple related tables
- Aligns with requirement for partial data storage

## Testing Strategy

### Test Organization

- Tests are organized by endpoint/functionality
- Each test file focuses on a specific aspect (validation, POST, GET, PATCH, DELETE)
- Shared test utilities for common operations
- Centralized test setup for database management

### Test Coverage

- Comprehensive validation tests for all field types
- Edge case testing (empty data, invalid formats, boundary values)
- Error scenario testing (not found, forbidden, validation errors)
- Integration tests for full API workflows

### Test Database

- Separate test database (`test.db`) to avoid conflicts
- Database is truncated (not deleted) between runs for reliability
- Migrations run automatically before tests
- Test server runs on different port (3001) to avoid conflicts

