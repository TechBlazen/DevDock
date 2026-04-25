// @ts-expect-error - api-spec-converter lacks TypeScript declarations
import Converter from 'api-spec-converter';

export type SpecFormat = 'openapi_3' | 'swagger_2';
export type SpecSyntax = 'json' | 'yaml';

export interface ConvertOptions {
  from: SpecFormat;
  to: SpecFormat;
  syntax?: SpecSyntax;
}

export interface ConversionResult {
  spec: string;
  format: SpecFormat;
  syntax: SpecSyntax;
}

/**
 * Convert between OpenAPI/Swagger specification formats
 * @param inputSpec - The specification to convert (string format)
 * @param options - Conversion options
 * @returns Converted specification
 */
export async function convertSpec(
  inputSpec: string,
  options: ConvertOptions
): Promise<ConversionResult> {
  const { from, to, syntax = 'json' } = options;

  // Validate format options
  if (from === to) {
    throw new Error(`Source and target formats are the same: ${from}`);
  }

  const validFormats: SpecFormat[] = ['openapi_3', 'swagger_2'];
  if (!validFormats.includes(from)) {
    throw new Error(`Invalid source format: ${from}. Must be one of: ${validFormats.join(', ')}`);
  }
  if (!validFormats.includes(to)) {
    throw new Error(`Invalid target format: ${to}. Must be one of: ${validFormats.join(', ')}`);
  }

  try {
    // Parse the input spec (detect if it's JSON or YAML)
    let parsedSpec: string | Record<string, unknown>;
    try {
      parsedSpec = JSON.parse(inputSpec);
    } catch {
      // If not JSON, assume YAML and let api-spec-converter handle it
      parsedSpec = inputSpec;
    }

    // Create converter instance
    const converter = await Converter.convert({
      from,
      to,
      source: parsedSpec,
    });

    // Get the converted spec in the desired format
    let outputSpec: string;
    if (syntax === 'yaml') {
      outputSpec = converter.stringify({ syntax: 'yaml' });
    } else {
      // Default to JSON with pretty formatting
      outputSpec = JSON.stringify(converter.spec, null, 2);
    }

    return {
      spec: outputSpec,
      format: to,
      syntax,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Conversion failed: ${message}`);
  }
}

/**
 * Detect the format of an OpenAPI/Swagger spec
 * @param spec - The specification to analyze
 * @returns Detected format or null if unable to determine
 */
export function detectSpecFormat(spec: string): SpecFormat | null {
  try {
    const parsed = JSON.parse(spec);
    
    // Check for OpenAPI 3.x
    if (parsed.openapi && parsed.openapi.startsWith('3.')) {
      return 'openapi_3';
    }
    
    // Check for Swagger 2.0
    if (parsed.swagger && parsed.swagger === '2.0') {
      return 'swagger_2';
    }
    
    return null;
  } catch {
    // If parsing fails, return null
    return null;
  }
}
