# API Specification Conversion Feature

This feature provides endpoints to convert between different OpenAPI/Swagger specification formats.

## Overview

The conversion service allows you to:
- Convert **Swagger 2.0** specifications to **OpenAPI 3.0**
- Convert **OpenAPI 3.0** specifications to **Swagger 2.0**
- Output in either **JSON** or **YAML** format
- Automatically detect the format of a specification

## API Endpoints

All endpoints require authentication via JWT token.

### 1. Convert Specification

**Endpoint:** `POST /api/convert/spec`

Converts an API specification from one format to another.

**Request Body:**
```json
{
  "spec": "string",              // The specification to convert (JSON or YAML string)
  "from": "swagger_2 | openapi_3",
  "to": "swagger_2 | openapi_3",
  "syntax": "json | yaml"        // Optional, defaults to "json"
}
```

**Response:**
```json
{
  "spec": "string",              // The converted specification
  "format": "swagger_2 | openapi_3",
  "syntax": "json | yaml"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/convert/spec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "spec": "{\"swagger\":\"2.0\",\"info\":{\"title\":\"My API\",\"version\":\"1.0.0\"},\"paths\":{}}",
    "from": "swagger_2",
    "to": "openapi_3",
    "syntax": "json"
  }'
```

**Example Response:**
```json
{
  "spec": "{\n  \"openapi\": \"3.0.0\",\n  \"info\": {\n    \"title\": \"My API\",\n    \"version\": \"1.0.0\"\n  },\n  \"paths\": {}\n}",
  "format": "openapi_3",
  "syntax": "json"
}
```

### 2. Detect Specification Format

**Endpoint:** `POST /api/convert/detect`

Automatically detects the format of an API specification.

**Request Body:**
```json
{
  "spec": "string"  // The specification to analyze
}
```

**Response:**
```json
{
  "format": "swagger_2 | openapi_3 | null",
  "detected": true | false
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/convert/detect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "spec": "{\"swagger\":\"2.0\",\"info\":{\"title\":\"Test\"}}"
  }'
```

**Example Response:**
```json
{
  "format": "swagger_2",
  "detected": true
}
```

### 3. List Available Formats

**Endpoint:** `GET /api/convert/formats`

Returns information about available conversion formats and options.

**Response:**
```json
{
  "formats": ["openapi_3", "swagger_2"],
  "syntaxes": ["json", "yaml"],
  "conversions": [
    {
      "from": "swagger_2",
      "to": "openapi_3",
      "description": "Convert Swagger 2.0 to OpenAPI 3.0"
    },
    {
      "from": "openapi_3",
      "to": "swagger_2",
      "description": "Convert OpenAPI 3.0 to Swagger 2.0"
    }
  ]
}
```

**Example Request:**
```bash
curl http://localhost:3000/api/convert/formats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Implementation Details

### Architecture

The conversion feature consists of three main components:

1. **Service Layer** (`server/services/spec-converter.ts`)
   - Core conversion logic using `api-spec-converter` package
   - Format detection
   - Error handling

2. **Route Layer** (`server/routes/api-converter.ts`)
   - HTTP endpoint definitions
   - Request validation
   - Response formatting

3. **Integration** (`server/index.ts`)
   - Routes registered in main server configuration

### Dependencies

- **api-spec-converter**: NPM package for converting between OpenAPI/Swagger formats
  - Supports Swagger 2.0 ↔ OpenAPI 3.0 conversion
  - Handles both JSON and YAML formats

### Format Support

#### Swagger 2.0
- Uses `swagger: "2.0"` field
- Has `host`, `basePath`, `schemes` fields
- Uses `produces`, `consumes` for content types

#### OpenAPI 3.0
- Uses `openapi: "3.0.x"` field
- Has `servers` array instead of `host`/`basePath`
- Uses `content` with media types instead of `produces`/`consumes`

## Error Handling

The API returns appropriate HTTP status codes:

- **200 OK**: Successful conversion
- **400 Bad Request**: Invalid input (missing fields, same source/target format, invalid spec)
- **401 Unauthorized**: Missing or invalid JWT token
- **500 Internal Server Error**: Unexpected conversion errors

Error responses include a descriptive message:
```json
{
  "error": "Conversion failed: Invalid OpenAPI specification"
}
```

## Testing

A test script is provided to verify the conversion functionality:

```bash
node test-conversion.js
```

This script tests:
- Swagger 2.0 to OpenAPI 3.0 conversion
- JSON output formatting
- YAML output formatting
- Validation of converted specification structure

## Future Enhancements

Possible additions to this feature:

1. **Batch Conversion**: Convert multiple specifications at once
2. **Validation**: Validate specifications before/after conversion
3. **Version Detection**: Auto-detect source format
4. **Database Integration**: Store and manage converted specifications
5. **Diff View**: Show differences between original and converted specs
6. **Additional Formats**: Support for other API specification formats (RAML, API Blueprint, etc.)

## Credits

Based on tools from [api-openapi-samples](https://github.com/teamdigitale/api-openapi-samples) repository.
