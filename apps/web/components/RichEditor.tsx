"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import "./rich-editor.css";

interface Props {
  content?: string;
  editable?: boolean;
  placeholder?: string;
  onChange?: (html: string) => void;
  className?: string;
  minHeight?: number;
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

function EditorInner({ content, placeholder, onChange, className, minHeight }: Omit<Props, "editable">) {
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
    ],
    content,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
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

export default function RichEditor({ content = "", editable = true, placeholder, onChange, className, minHeight }: Props) {
  if (!editable) {
    return (
      <div
        className={"re-content re-readonly" + (className ? " " + className : "")}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <EditorInner content={content} placeholder={placeholder} onChange={onChange} className={className} minHeight={minHeight} />;
}
