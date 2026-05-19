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
  const re = /<span\b[^>]*\bdata-type="mention"[^>]*\bdata-id="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) ids.add(m[1]);
  const re2 = /<span\b[^>]*\bdata-id="([^"]+)"[^>]*\bdata-type="mention"/gi;
  while ((m = re2.exec(html))) ids.add(m[1]);
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
