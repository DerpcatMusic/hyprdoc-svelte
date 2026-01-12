/**
 * Zod to Convex Validator Converter
 *
 * Converts Zod schemas to Convex validators for backend validation.
 * This enables a single source of truth for block schemas.
 *
 * Compatible with Zod 4.x which uses ._zod.def instead of ._def
 */
import { type Validator, v } from "convex/values";
import type { z } from "zod";

type ConvexValidator = Validator<any, any, any>;

/**
 * Get the Zod type name from a schema.
 * Zod 4 uses ._zod.def.typeName or ._zod.def.type for type identification.
 */
function getZodTypeName(zodType: z.ZodTypeAny): string {
  // Zod 4: Access via ._zod.def
  const zodDef = (zodType as any)._zod?.def;
  if (zodDef) {
    // typeName is the standard property for Zod 4
    return zodDef.typeName || zodDef.type || "unknown";
  }

  // Fallback: try Zod 3 style (shouldn't be needed for Zod 4)
  const legacyDef = (zodType as any)._def;
  if (legacyDef) {
    return legacyDef.typeName || "unknown";
  }

  return zodType.constructor.name;
}

/**
 * Get the inner type from wrapper types like optional, nullable, default
 */
function getInnerType(zodType: z.ZodTypeAny): z.ZodTypeAny | undefined {
  const zodDef = (zodType as any)._zod?.def;
  if (zodDef?.innerType) {
    return zodDef.innerType;
  }
  // Zod 4 might use 'schema' for some wrapper types
  if (zodDef?.schema) {
    return zodDef.schema;
  }
  return undefined;
}

/**
 * Convert a Zod type to a Convex validator
 */
export function zodToConvex(zodType: z.ZodTypeAny): ConvexValidator {
  const typeName = getZodTypeName(zodType);
  const zodDef = (zodType as any)._zod?.def;

  // Handle ZodDefault - unwrap and process inner type
  if (typeName === "ZodDefault" || typeName === "default") {
    const inner = getInnerType(zodType);
    if (inner) {
      return v.optional(zodToConvex(inner));
    }
    return v.any();
  }

  // Handle ZodOptional
  if (typeName === "ZodOptional" || typeName === "optional") {
    const inner = getInnerType(zodType);
    if (inner) {
      return v.optional(zodToConvex(inner));
    }
    return v.any();
  }

  // Handle ZodNullable
  if (typeName === "ZodNullable" || typeName === "nullable") {
    const inner = getInnerType(zodType);
    if (inner) {
      // Convex doesn't have a direct nullable, use optional
      return v.optional(zodToConvex(inner));
    }
    return v.any();
  }

  // Handle ZodString
  if (typeName === "ZodString" || typeName === "string") {
    return v.string();
  }

  // Handle ZodNumber
  if (typeName === "ZodNumber" || typeName === "number") {
    return v.number();
  }

  // Handle ZodBoolean
  if (typeName === "ZodBoolean" || typeName === "boolean") {
    return v.boolean();
  }

  // Handle ZodArray
  if (typeName === "ZodArray" || typeName === "array") {
    const elementType = zodDef?.element || zodDef?.type;
    if (elementType) {
      return v.array(zodToConvex(elementType));
    }
    return v.array(v.any());
  }

  // Handle ZodEnum
  if (typeName === "ZodEnum" || typeName === "enum") {
    // Zod 4: enum values are in .values or direct on the schema via .enum
    const enumValues: string[] =
      zodDef?.entries || zodDef?.values || Object.values((zodType as any).enum || {});

    if (enumValues && enumValues.length > 0) {
      if (enumValues.length === 1) {
        return v.literal(enumValues[0]);
      }
      return v.union(...enumValues.map((val: string) => v.literal(val)));
    }
    return v.string();
  }

  // Handle ZodLiteral
  if (typeName === "ZodLiteral" || typeName === "literal") {
    // Zod 4: uses 'values' (array) instead of 'value' (single)
    const literalValues = zodDef?.values;

    if (Array.isArray(literalValues)) {
      // Filter out null, undefined, AND empty strings - Convex v.literal() doesn't accept these
      const validValues = literalValues.filter(
        (val: any) => val !== null && val !== undefined && val !== ""
      );
      const hasNull = literalValues.includes(null);
      const hasEmptyString = literalValues.includes("");

      // If only empty string/null was in the literal, use v.string() or v.null()
      if (validValues.length === 0) {
        if (hasEmptyString) {
          return v.string(); // Empty string means any string is valid
        }
        return v.null();
      }

      if (validValues.length === 1) {
        const result = v.literal(validValues[0]);
        // If empty string was an option, make it string union
        if (hasEmptyString) {
          return v.union(result, v.string());
        }
        return hasNull ? v.optional(result) : result;
      }

      const union = v.union(...validValues.map((val: string | number | boolean) => v.literal(val)));
      return hasNull ? v.optional(union) : union;
    }

    // Single value (shouldn't happen in Zod 4, but fallback)
    const singleValue = zodDef?.value;
    if (singleValue === null) {
      return v.null();
    }
    // Skip empty string literals - use v.string() instead
    if (singleValue === "") {
      return v.string();
    }
    if (singleValue !== undefined) {
      return v.literal(singleValue);
    }

    return v.any();
  }

  // Handle ZodObject
  if (typeName === "ZodObject" || typeName === "object") {
    const shape: Record<string, ConvexValidator> = {};
    const zodShape = (zodType as any).shape || zodDef?.shape;

    if (zodShape) {
      for (const [key, value] of Object.entries(zodShape)) {
        shape[key] = zodToConvex(value as z.ZodTypeAny);
      }
    }
    return v.object(shape);
  }

  // Handle ZodUnion
  if (typeName === "ZodUnion" || typeName === "union") {
    const options: z.ZodTypeAny[] = zodDef?.options || [];

    // Check if null or empty string is one of the options (from .nullable() or .or(z.literal("")))
    const hasNull = options.some((opt) => {
      const optTypeName = getZodTypeName(opt);
      if (optTypeName === "ZodLiteral" || optTypeName === "literal") {
        const optDef = (opt as any)._zod?.def;
        const values = optDef?.values;
        if (Array.isArray(values)) {
          return values.includes(null);
        }
        return optDef?.value === null;
      }
      return false;
    });

    const hasEmptyStringLiteral = options.some((opt) => {
      const optTypeName = getZodTypeName(opt);
      if (optTypeName === "ZodLiteral" || optTypeName === "literal") {
        const optDef = (opt as any)._zod?.def;
        const values = optDef?.values;
        if (Array.isArray(values)) {
          return values.includes("");
        }
        return optDef?.value === "";
      }
      return false;
    });

    // Filter out null and empty string literal options
    const validOptions = options.filter((opt) => {
      const optTypeName = getZodTypeName(opt);
      if (optTypeName === "ZodLiteral" || optTypeName === "literal") {
        const optDef = (opt as any)._zod?.def;
        const values = optDef?.values;
        if (Array.isArray(values)) {
          // Keep if has any valid non-null, non-empty values
          return values.some((v: unknown) => v !== null && v !== "");
        }
        return optDef?.value !== null && optDef?.value !== "";
      }
      return true;
    });

    // If only null/empty string was in the union, return appropriate type
    if (validOptions.length === 0) {
      if (hasEmptyStringLiteral) {
        return v.string(); // z.string().or(z.literal("")) => v.string()
      }
      return v.null();
    }

    // Convert non-null options
    const converted =
      validOptions.length === 1
        ? zodToConvex(validOptions[0])
        : v.union(...validOptions.map(zodToConvex));

    // If null was present, make the result optional (nullable in Convex)
    return hasNull ? v.optional(converted) : converted;
  }

  // Handle ZodAny
  if (typeName === "ZodAny" || typeName === "any") {
    return v.any();
  }

  // Handle ZodNull
  if (typeName === "ZodNull" || typeName === "null") {
    return v.null();
  }

  // Handle ZodUndefined
  if (typeName === "ZodUndefined" || typeName === "undefined") {
    return v.optional(v.any());
  }

  // Handle ZodNativeEnum
  if (typeName === "ZodNativeEnum" || typeName === "nativeEnum") {
    // Native enums - just use string as Convex equivalent
    return v.string();
  }

  // Handle ZodRecord (dynamic key-value objects)
  if (typeName === "ZodRecord" || typeName === "record") {
    // Convex doesn't have a direct record type
    // Use v.any() for dynamic key-value stores
    return v.any();
  }

  // Fallback: use v.any() for unsupported types
  console.warn(`Unsupported Zod type: ${typeName}, using v.any()`);
  return v.any();
}

/**
 * Convert a Zod object schema to a Convex object validator
 */
export function zodSchemaToConvexValidator<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): ConvexValidator {
  const shape: Record<string, ConvexValidator> = {};
  const zodShape = (schema as any).shape;

  if (!zodShape) {
    console.warn("zodSchemaToConvexValidator received non-object schema, returning v.any()");
    return v.any();
  }

  for (const [key, value] of Object.entries(zodShape)) {
    shape[key] = zodToConvex(value as z.ZodTypeAny);
  }

  return v.object(shape);
}

/**
 * Merge multiple Zod schemas into one
 */
export function mergeZodSchemas(
  baseSchema: z.ZodObject<any>,
  ...extensions: z.ZodObject<any>[]
): z.ZodObject<any> {
  let merged = baseSchema;
  for (const ext of extensions) {
    merged = merged.merge(ext);
  }
  return merged;
}
