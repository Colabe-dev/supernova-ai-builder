import Ajv, { ValidateFunction } from "ajv";

const ajv = new Ajv({ allErrors: true });

export const validateTokens: ValidateFunction = ajv.compile({
  type: "object",
  properties: {
    theme: {
      type: "object",
      properties: {
        primary: {
          type: "string",
          pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        },
        background: {
          type: "string",
          pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        },
        text: {
          type: "string",
          pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        },
        accent: {
          type: "string",
          pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        },
        success: {
          type: "string",
          pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        },
        warning: {
          type: "string",
          pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        },
        error: {
          type: "string",
          pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        },
      },
      required: ["primary", "background", "text"],
      additionalProperties: true,
    },
    typography: {
      type: "object",
      properties: {
        fontFamily: { type: "string" },
        fontFamilyMono: { type: "string" },
      },
      additionalProperties: true,
    },
    spacing: {
      type: "object",
      additionalProperties: true,
    },
  },
  required: ["theme"],
  additionalProperties: true,
});
