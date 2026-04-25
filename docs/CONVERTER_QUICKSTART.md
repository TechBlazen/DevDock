# API Converter - Quick Start Guide

## 🎯 What Is This?

The API Converter allows you to convert API specifications between different formats:
- **Swagger 2.0** → **OpenAPI 3.0**
- **OpenAPI 3.0** → **Swagger 2.0**

With support for both JSON and YAML output formats.

## 🚀 Getting Started

### Step 1: Access the Converter

1. Start your development environment:
   ```bash
   npm run dev
   ```

2. Navigate to the **APIs** page in your application

3. Look for the **"Converter"** button in the toolbar (with a ⟲ icon)

4. Click it to open the converter interface

### Step 2: Try a Sample

**Option A: Weather API (Swagger 2.0 Example)**
- Click **"Weather API (Swagger 2.0)"** button
- The spec will load automatically
- Format is detected: Swagger 2.0
- Target format is auto-set to: OpenAPI 3.0
- Click **"Convert"** button
- See the converted OpenAPI 3.0 spec on the right

**Option B: Petstore API (OpenAPI 3.0 Example)**
- Click **"Petstore API (OpenAPI 3.0)"** button
- The spec will load automatically
- Format is detected: OpenAPI 3.0
- Target format is auto-set to: Swagger 2.0
- Click **"Convert"** button
- See the converted Swagger 2.0 spec on the right

### Step 3: Work with Results

After conversion, you can:
- **Copy** the result to clipboard (📋 button)
- **Download** as a file (⬇️ button)
- Choose output format: **JSON** or **YAML**

## 🔄 Converting Your Own Specs

### From the UI

1. Open the converter
2. Paste your API spec in the left textarea
3. Select the source format (Swagger 2.0 or OpenAPI 3.0)
4. Select the target format
5. Choose output syntax (JSON or YAML)
6. Click "Convert"
7. Copy or download the result

### From the API

```bash
# Example: Convert Swagger 2.0 to OpenAPI 3.0
curl -X POST http://localhost:3000/api/convert/spec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "spec": "...your swagger 2.0 spec as string...",
    "from": "swagger_2",
    "to": "openapi_3",
    "syntax": "json"
  }'
```

## 📝 What's Included

### Sample Files

Located in `public/data/samples/`:

1. **weather-api-swagger2.json**
   - Weather and forecast endpoints
   - Demonstrates Swagger 2.0 features
   - Query parameters, responses, definitions

2. **petstore-openapi3.json**
   - Pet management CRUD operations
   - Demonstrates OpenAPI 3.0 features
   - Request bodies, path parameters, components

### UI Features

- ✅ Side-by-side input/output view
- ✅ Automatic format detection
- ✅ One-click sample loading
- ✅ Copy to clipboard
- ✅ Download as file
- ✅ JSON and YAML output
- ✅ Real-time error messages
- ✅ Format information display

### API Endpoints

- `POST /api/convert/spec` - Convert specifications
- `POST /api/convert/detect` - Auto-detect format
- `GET /api/convert/formats` - List available formats

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  API Spec Converter                                     │
│  Convert between OpenAPI 3.0 and Swagger 2.0 formats   │
├─────────────────────────────────────────────────────────┤
│  Load sample: [Weather API] [Petstore API]             │
├────────────────────────┬────────────────────────────────┤
│  Input Specification   │  Converted Specification       │
│  [Format: Swagger 2.0] │  [Format: OpenAPI 3.0] [JSON]  │
│  ┌──────────────────┐  │  ┌──────────────────┐         │
│  │                  │  │  │                  │         │
│  │  Paste or load   │  │  │  Result appears  │         │
│  │  your spec here  │  │  │  here            │         │
│  │                  │  │  │                  │         │
│  └──────────────────┘  │  └──────────────────┘         │
│         [📋 Copy]       │     [📋 Copy] [⬇️ Download]   │
└────────────────────────┴────────────────────────────────┘
                    [Convert →]
```

## 🔍 Understanding the Conversion

### What Changes: Swagger 2.0 → OpenAPI 3.0

**Before (Swagger 2.0):**
```json
{
  "swagger": "2.0",
  "host": "api.example.com",
  "basePath": "/v1",
  "schemes": ["https"],
  "paths": {
    "/users": {
      "get": {
        "produces": ["application/json"],
        ...
      }
    }
  }
}
```

**After (OpenAPI 3.0):**
```json
{
  "openapi": "3.0.0",
  "servers": [
    {
      "url": "https://api.example.com/v1"
    }
  ],
  "paths": {
    "/users": {
      "get": {
        "responses": {
          "200": {
            "content": {
              "application/json": { ... }
            }
          }
        }
      }
    }
  }
}
```

### Key Differences

| Aspect | Swagger 2.0 | OpenAPI 3.0 |
|--------|-------------|-------------|
| Version field | `swagger: "2.0"` | `openapi: "3.x.x"` |
| Server info | `host`, `basePath`, `schemes` | `servers[]` array |
| Media types | `produces`, `consumes` | `content` per response |
| Definitions | `definitions` section | `components.schemas` |
| Request bodies | Inline parameters | Separate `requestBody` |

## 🛠️ Troubleshooting

### Conversion Fails
- **Check format**: Ensure source format selection matches your spec
- **Validate spec**: Make sure your spec is valid JSON/YAML
- **Check version**: Swagger 2.0 and OpenAPI 3.x only (not 2.x)

### Sample Won't Load
- **Check server**: Ensure development server is running
- **Check path**: Files should be in `public/data/samples/`
- **Check auth**: Ensure you're logged in

### Can't Copy/Download
- **Browser permissions**: Allow clipboard access
- **Result exists**: Make sure conversion completed successfully

## 📚 Learn More

- **Full API Documentation**: `docs/API_CONVERSION.md`
- **Sample Documentation**: `public/data/samples/README.md`
- **Implementation Details**: `CONVERTER_IMPLEMENTATION.md`

## 💡 Tips

1. **Use auto-detect**: Let the system detect your spec format automatically
2. **Try samples first**: Get familiar with the UI using provided samples
3. **YAML output**: Great for human-readable specs and documentation
4. **JSON output**: Best for programmatic use and API consumption
5. **Download results**: Save converted specs for later use or version control

## 🤝 Need Help?

If you encounter issues:
1. Check the error message displayed in the UI
2. Verify your input spec is valid
3. Review the API documentation
4. Check browser console for detailed errors

---

**Happy Converting! 🎉**
