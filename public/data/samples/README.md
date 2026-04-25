# Sample API Specifications

This directory contains sample OpenAPI and Swagger specifications for demonstration purposes.

## Available Samples

### 1. Weather API (Swagger 2.0)
**File:** `weather-api-swagger2.json`

A simple weather API demonstrating Swagger 2.0 format with:
- Current weather endpoint
- 5-day forecast endpoint
- Query parameters
- Standard response schemas

**Use this to test:** Swagger 2.0 → OpenAPI 3.0 conversion

### 2. Petstore API (OpenAPI 3.0)
**File:** `petstore-openapi3.json`

A pet store management API demonstrating OpenAPI 3.0 features with:
- Full CRUD operations for pets
- Request body validation
- Path parameters
- Modern content negotiation using `content` blocks

**Use this to test:** OpenAPI 3.0 → Swagger 2.0 conversion

## Using These Samples

### In the UI
1. Navigate to the APIs page
2. Click the "Converter" button
3. Click one of the "Load sample" buttons
4. The format will be auto-detected
5. Click "Convert" to see the result

### Programmatically
```bash
# Load the sample
curl http://localhost:5173/data/samples/weather-api-swagger2.json

# Use the conversion API
curl -X POST http://localhost:3000/api/convert/spec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @request.json
```

## Key Differences Between Formats

### Swagger 2.0
- Uses `swagger: "2.0"` field
- Single server defined with `host`, `basePath`, `schemes`
- Uses `produces` and `consumes` for media types
- Schema definitions in `definitions` section

### OpenAPI 3.0
- Uses `openapi: "3.x.x"` field
- Multiple servers in `servers` array with full URLs
- Uses `content` with explicit media types per operation
- Schema definitions in `components.schemas` section
- Request bodies are separate objects with their own `content` blocks

## Adding Your Own Samples

To add more sample specifications:

1. Create a new `.json` file in this directory
2. Ensure it's a valid OpenAPI 3.x or Swagger 2.0 specification
3. Update the `ApiConverter` component to add a load button (optional)

The converter supports both JSON and YAML formats for input and output.
