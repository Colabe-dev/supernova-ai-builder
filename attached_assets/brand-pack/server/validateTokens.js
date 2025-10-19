import Ajv from "ajv";
const ajv = new Ajv({ allErrors: true });
const hex = { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" };
const schema = {
  type: "object",
  properties: {
    theme: { type: "object", properties: {
      primary: hex, onPrimary: hex, bg: hex, surface: hex, text: hex, muted: hex, success: hex, warning: hex, danger: hex
    }, required: ["primary","bg","text"], additionalProperties: true },
    radius: { type: "object" }, spacing: { type: "object" }, shadow: { type: "object" },
    typography: { type: "object" }, motion: { type: "object" }, meta: { type: "object" }
  },
  required: ["theme"], additionalProperties: true
};
export const validateTokens = ajv.compile(schema);
