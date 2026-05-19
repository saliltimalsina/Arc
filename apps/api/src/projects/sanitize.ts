import * as sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "code", "pre",
  "blockquote", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "a", "img", "span", "div",
  "hr", "table", "thead", "tbody", "tr", "th", "td",
];

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
  span: ["class", "data-type", "data-id", "data-label"],
  div: ["class"],
  code: ["class"],
  pre: ["class"],
};

export function extractMentionedUserIds(html: string): string[] {
  if (!html) return [];
  const ids = new Set<string>();
  // Mention <span> must carry class="mention", data-type="mention", a data-id,
  // and visible @-prefixed text content. Otherwise we ignore it (defeats hidden-mention spam).
  const spanRe = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
  let s: RegExpExecArray | null;
  while ((s = spanRe.exec(html))) {
    const attrs = s[1];
    const inner = (s[2] ?? "").replace(/<[^>]+>/g, "").trim();
    if (!/\bclass\s*=\s*"[^"]*\bmention\b[^"]*"/i.test(attrs)) continue;
    if (!/\bdata-type\s*=\s*"mention"/i.test(attrs)) continue;
    const idMatch = attrs.match(/\bdata-id\s*=\s*"([^"]+)"/i);
    if (!idMatch) continue;
    if (!inner.startsWith("@")) continue;
    ids.add(idMatch[1]);
  }
  return [...ids];
}

export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return "";
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: "noopener noreferrer", target: "_blank" },
      }),
    },
  });
}
