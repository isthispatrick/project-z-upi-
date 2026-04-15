import { readFile } from "node:fs/promises";
import OpenAI from "openai";
import { z } from "zod";
import type { LedgerItem } from "../types.js";
import { loadEnv } from "../../config/env.js";

const extractionResponseSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1),
      pricePaise: z.number().int().nonnegative(),
    }),
  ).max(8),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.array(z.string()).optional(),
});

export interface SnapExtractionResult {
  items: LedgerItem[];
  confidence: number;
  notes: string[];
}

export async function extractSnapDraft(input: {
  filePath?: string;
  imageBytes?: Buffer;
  merchantLabel?: string;
  amountPaise?: number | null;
}): Promise<SnapExtractionResult> {
  const heuristic = buildHeuristicFallback(input.merchantLabel, input.amountPaise);
  const env = loadEnv();
  const apiKey = env.openAiApiKey;

  if ((!input.filePath && !input.imageBytes) || !apiKey) {
    return heuristic;
  }

  try {
    const imageAsBase64 = input.imageBytes
      ? input.imageBytes.toString("base64")
      : await readFile(input.filePath!, { encoding: "base64" });
    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: env.openAiVisionModel ?? "gpt-4o",
      instructions: [
        "You extract purchased items from Indian merchant photos.",
        "Return strict JSON only.",
        "Ignore totals, taxes, QR instructions, UPI references, balances, and random marketing text.",
        "Use pricePaise as integer INR paise.",
        `The merchant is likely "${input.merchantLabel ?? "Unknown Merchant"}".`,
        input.amountPaise !== null && input.amountPaise !== undefined
          ? `The transaction total is likely ${input.amountPaise} paise. Use it to reconcile item prices when possible.`
          : "The transaction total is unknown.",
      ].join(" "),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Extract the purchased line items from this image.",
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${imageAsBase64}`,
              detail: "auto",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "snap_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              items: {
                type: "array",
                maxItems: 8,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    pricePaise: { type: "integer", minimum: 0 },
                  },
                  required: ["name", "pricePaise"],
                },
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
              },
              notes: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["items"],
          },
        },
      },
    });

    const parsed = extractionResponseSchema.safeParse(JSON.parse(response.output_text || "{}"));
    if (!parsed.success || parsed.data.items.length === 0) {
      return {
        ...heuristic,
        notes: ["vision-validation-failed", ...heuristic.notes],
      };
    }

    return {
      items: rebalanceItems(parsed.data.items, input.amountPaise ?? null),
      confidence: clampConfidence(parsed.data.confidence ?? 0.9),
      notes: ["openai-vision-primary", ...(parsed.data.notes ?? [])],
    };
  } catch {
    return {
      ...heuristic,
      notes: ["vision-api-fallback", ...heuristic.notes],
    };
  }
}

function buildHeuristicFallback(
  merchantLabel?: string,
  amountPaise?: number | null,
): SnapExtractionResult {
  const label = merchantLabel?.toLowerCase() ?? "";
  const safeAmount = amountPaise ?? 0;

  if (label.includes("cafe") || label.includes("coffee") || label.includes("tapri")) {
    return {
      items: [{ name: "Coffee", pricePaise: safeAmount }],
      confidence: 0.45,
      notes: ["heuristic-cafe-fallback"],
    };
  }

  if (label.includes("uber") || label.includes("ola") || label.includes("rapido")) {
    return {
      items: [{ name: "Ride fare", pricePaise: safeAmount }],
      confidence: 0.5,
      notes: ["heuristic-transport-fallback"],
    };
  }

  return {
    items: [{ name: "Scanned purchase", pricePaise: safeAmount }],
    confidence: 0.3,
    notes: ["generic-fallback"],
  };
}

function rebalanceItems(items: LedgerItem[], amountPaise: number | null): LedgerItem[] {
  if (amountPaise === null) {
    return items;
  }

  const total = items.reduce((sum, item) => sum + item.pricePaise, 0);
  if (total === amountPaise || total === 0) {
    return items;
  }

  if (items.length === 1) {
    return [{ ...items[0], pricePaise: amountPaise }];
  }

  if (Math.abs(total - amountPaise) <= 500) {
    const adjusted = [...items];
    adjusted[adjusted.length - 1] = {
      ...adjusted[adjusted.length - 1],
      pricePaise: Math.max(0, adjusted[adjusted.length - 1].pricePaise + (amountPaise - total)),
    };
    return adjusted;
  }

  return items;
}

function clampConfidence(value: number): number {
  return Math.max(0.2, Math.min(0.99, Number(value.toFixed(2))));
}
