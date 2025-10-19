import Ajv, { ValidateFunction } from "ajv";

const ajv = new Ajv({ allErrors: true });

const hexColorPattern = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$";

export const validateTokens: ValidateFunction = ajv.compile({
  type: "object",
  properties: {
    meta: {
      type: "object",
      properties: {
        brand: { type: "string" },
        version: { type: "string" },
      },
      additionalProperties: true,
    },
    theme: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["light", "dark"] },
        primary: { type: "string", pattern: hexColorPattern },
        onPrimary: { type: "string", pattern: hexColorPattern },
        bg: { type: "string", pattern: hexColorPattern },
        surface: { type: "string", pattern: hexColorPattern },
        text: { type: "string", pattern: hexColorPattern },
        muted: { type: "string", pattern: hexColorPattern },
        success: { type: "string", pattern: hexColorPattern },
        warning: { type: "string", pattern: hexColorPattern },
        danger: { type: "string", pattern: hexColorPattern },
      },
      required: ["primary", "bg", "text"],
      additionalProperties: true,
    },
    typography: {
      type: "object",
      properties: {
        fontFamily: { type: "string" },
        scale: {
          type: "array",
          items: { type: "number" },
        },
        lineHeight: { type: "number" },
      },
      additionalProperties: true,
    },
    radius: {
      type: "object",
      properties: {
        sm: { type: "number" },
        md: { type: "number" },
        lg: { type: "number" },
        xl: { type: "number" },
        full: { type: "number" },
      },
      additionalProperties: true,
    },
    spacing: {
      type: "object",
      properties: {
        base: { type: "number" },
      },
      required: ["base"],
      additionalProperties: true,
    },
    shadow: {
      type: "object",
      properties: {
        sm: { type: "string" },
        md: { type: "string" },
        lg: { type: "string" },
      },
      additionalProperties: true,
    },
    motion: {
      type: "object",
      properties: {
        duration: {
          type: "object",
          properties: {
            sm: { type: "number" },
            md: { type: "number" },
            lg: { type: "number" },
          },
          additionalProperties: true,
        },
        easing: { type: "string" },
      },
      additionalProperties: true,
    },
  },
  required: ["theme"],
  additionalProperties: true,
});
