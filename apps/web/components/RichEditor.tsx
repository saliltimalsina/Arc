"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { computePosition, autoUpdate, flip, shift, offset } from "@floating-ui/dom";
import MentionList, { type MentionItem } from "./MentionList";
import "./rich-editor.css";

export type { MentionItem } from "./MentionList";

interface Props {
  content?: string;
  editable?: boolean;
  placeholder?: string;
  onChange?: (html: string) => void;
  onBlur?: () => void;
  className?: string;
  minHeight?: number;
  mentionSource?: (query: string) => MentionItem[] | Promise<MentionItem[]>;
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, title: string, label: React.ReactNode) => (
    <button type="button" className={"re-btn" + (active ? " on" : "")} onClick={onClick} title={title}>{label}</button>
  );
  return (
    <div className="re-toolbar">
      {btn(editor.isActive("bold"),      () => editor.chain().focus().toggleBold().run(),        "Bold",         <b>B</b>)}
      {btn(editor.isActive("italic"),    () => editor.chain().focus().toggleItalic().run(),      "Italic",       <i>I</i>)}
      {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(),   "Underline",    <u>U</u>)}
      <span className="re-sep" />
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", "H2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", "H3")}
      <span className="re-sep" />
      {btn(editor.isActive("bulletList"),  () => editor.chain().focus().toggleBulletList().run(),  "Bullet list",   "• List")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Ordered list",  "1. List")}
      {btn(editor.isActive("taskList"),    () => editor.chain().focus().toggleTaskList().run(),    "Task list",     "☑ Tasks")}
      <span className="re-sep" />
      {btn(editor.isActive("code"),       () => editor.chain().focus().toggleCode().run(),        "Code",          <code>`</code>)}
      {btn(editor.isActive("codeBlock"),  () => editor.chain().focus().toggleCodeBlock().run(),   "Code block",    "</>")}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(),  "Blockquote",    "❝")}
      <span className="re-sep" />
      <button type="button" className="re-btn" title="Insert image" onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const src = ev.target?.result as string;
            if (src) editor.chain().focus().setImage({ src }).run();
          };
          reader.readAsDataURL(file);
        };
        input.click();
      }}>⊞ Img</button>
    </div>
  );
}

function buildMentionExtension(source: (query: string) => MentionItem[] | Promise<MentionItem[]>) {
  return Mention.configure({
    HTMLAttributes: { class: "mention" },
    renderHTML({ options, node }) {
      return [
        "span",
        { ...options.HTMLAttributes, "data-type": "mention", "data-id": node.attrs.id },
        `@${node.attrs.label ?? node.attrs.id}`,
      ];
    },
    suggestion: {
      char: "@",
      items: async ({ query }) => {
        const out = await source(query);
        return out.slice(0, 6);
      },
      render: () => {
        let component: ReactRenderer | null = null;
        let cleanup: (() => void) | null = null;
        let virtualEl: { getBoundingClientRect: () => DOMRect } | null = null;

        const positionEl = (popupEl: HTMLElement) => {
          if (!virtualEl) return;
          computePosition(virtualEl, popupEl, {
            placement: "bottom-start",
            middleware: [offset(6), flip(), shift({ padding: 8 })],
          }).then(({ x, y }) => {
            popupEl.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
          });
        };

        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, { props, editor: props.editor });
            const popup = document.createElement("div");
            popup.className = "mention-popup";
            popup.style.position = "absolute";
            popup.style.top = "0";
            popup.style.left = "0";
            popup.style.zIndex = "10000";
            popup.appendChild(component.element);
            document.body.appendChild(popup);

            virtualEl = {
              getBoundingClientRect: () => props.clientRect?.() as DOMRect,
            };
            cleanup = autoUpdate(virtualEl, popup, () => positionEl(popup));
          },
          onUpdate: (props) => {
            component?.updateProps(props);
            virtualEl = { getBoundingClientRect: () => props.clientRect?.() as DOMRect };
          },
          onKeyDown: (props) => {
            if (props.event.key === "Escape") {
              cleanup?.();
              component?.element?.parentElement?.remove();
              component?.destroy();
              return true;
            }
            return (component?.ref as { onKeyDown: (p: { event: KeyboardEvent }) => boolean } | undefined)?.onKeyDown(props) ?? false;
          },
          onExit: () => {
            cleanup?.();
            component?.element?.parentElement?.remove();
            component?.destroy();
            component = null;
            virtualEl = null;
            cleanup = null;
          },
        };
      },
    },
  });
}

function EditorInner({ content, placeholder, onChange, onBlur, className, minHeight, mentionSource }: Omit<Props, "editable">) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Add a description…" }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false, allowBase64: true }),
      ...(mentionSource ? [buildMentionExtension(mentionSource)] : []),
    ],
    content,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    onBlur: () => onBlur?.(),
    immediatelyRender: false,
  });

  if (!mounted) {
    return (
      <div className={"re-wrap" + (className ? " " + className : "")}>
        <div className="re-toolbar" style={{ visibility: "hidden", height: 38 }} />
        <div className="re-content" style={{ minHeight: minHeight ?? 120 }} />
      </div>
    );
  }

  return (
    <div className={"re-wrap" + (className ? " " + className : "")}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="re-content" style={minHeight ? { minHeight } : undefined} />
    </div>
  );
}

export default function RichEditor({ content = "", editable = true, placeholder, onChange, onBlur, className, minHeight, mentionSource }: Props) {
  if (!editable) {
    return (
      <div
        className={"re-content re-readonly" + (className ? " " + className : "")}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <EditorInner content={content} placeholder={placeholder} onChange={onChange} onBlur={onBlur} className={className} minHeight={minHeight} mentionSource={mentionSource} />;
}
