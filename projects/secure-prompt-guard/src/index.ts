import { SENSITIVE_PATTERNS, type SensitivePattern } from "./patterns";

export interface SanitizedChunk {
  placeholder: string;
  value: string;
  patternId: string;
}

export interface SanitizeResult {
  safeText: string;
  mappings: SanitizedChunk[];
}

export interface SanitizeOptions {
  /** Prefix for generated placeholders, e.g. "SPG" → <SPG_EMAIL_1> */
  placeholderPrefix?: string;
}

/**
 * Replace sensitive values in `text` with deterministic placeholders.
 * All processing is local; caller is responsible for sending only `safeText`
 * to remote AI services and keeping `mappings` in-memory.
 */
export function sanitizeText(
  text: string,
  options: SanitizeOptions = {}
): SanitizeResult {
  const placeholderPrefix = options.placeholderPrefix ?? "SPG";

  const mappings: SanitizedChunk[] = [];
  let safeText = text;

  const usedPlaceholders = new Set<string>();
  const seenValues = new Map<string, string>(); // value → placeholder

  const makePlaceholder = (patternId: string, index: number): string => {
    return `<${placeholderPrefix}_${patternId.toUpperCase()}_${index}>`;
  };

  for (const pattern of SENSITIVE_PATTERNS) {
    let match: RegExpExecArray | null;
    const global = new RegExp(pattern.regex.source, pattern.regex.flags);
    let index = 1;

    while ((match = global.exec(safeText)) !== null) {
      const fullMatch = match[0];
      if (!fullMatch) continue;

      let placeholder = seenValues.get(fullMatch);
      if (!placeholder) {
        do {
          placeholder = makePlaceholder(pattern.id, index++);
        } while (usedPlaceholders.has(placeholder));

        usedPlaceholders.add(placeholder);
        seenValues.set(fullMatch, placeholder);
        mappings.push({
          placeholder,
          value: fullMatch,
          patternId: pattern.id,
        });
      }

      safeText =
        safeText.slice(0, match.index) +
        placeholder +
        safeText.slice(match.index + fullMatch.length);

      const delta = placeholder.length - fullMatch.length;
      global.lastIndex = match.index + placeholder.length + (delta > 0 ? 0 : 0);
    }
  }

  return { safeText, mappings };
}

/**
 * Restore original sensitive values in `text` using mappings from `sanitizeText`.
 */
export function desanitizeText(
  text: string,
  mappings: SanitizedChunk[]
): string {
  let restored = text;
  for (const { placeholder, value } of mappings) {
    if (!placeholder) continue;
    restored = restored.split(placeholder).join(value);
  }
  return restored;
}

export { SENSITIVE_PATTERNS };
export type { SensitivePattern };

