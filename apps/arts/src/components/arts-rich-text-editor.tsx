import { EditorContent, useEditor } from "@tiptap/react";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";

interface ArtsRichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function ArtsRichTextEditor({ content, onChange }: ArtsRichTextEditorProps) {
  const editor = useEditor({
    content: content || "<p></p>",
    extensions: [
      StarterKit,
      ImageExtension.configure({
        inline: true,
        allowBase64: true,
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter link URL:", previousUrl);
    if (url === null) {
      return;
    }
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#0A0A0A]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-gray-800 border-b bg-[#111111] p-2 text-white">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`grid size-8 place-items-center rounded hover:bg-gray-800 ${
            editor.isActive("bold") ? "bg-[#7CFC00]/20 text-[#7CFC00]" : "text-gray-300"
          }`}
          title="Bold"
        >
          <Bold className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`grid size-8 place-items-center rounded hover:bg-gray-800 ${
            editor.isActive("italic") ? "bg-[#7CFC00]/20 text-[#7CFC00]" : "text-gray-300"
          }`}
          title="Italic"
        >
          <Italic className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`grid size-8 place-items-center rounded hover:bg-gray-800 ${
            editor.isActive("strike") ? "bg-[#7CFC00]/20 text-[#7CFC00]" : "text-gray-300"
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="size-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-gray-800" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`grid size-8 place-items-center rounded hover:bg-gray-800 ${
            editor.isActive("heading", { level: 2 }) ? "bg-[#7CFC00]/20 text-[#7CFC00]" : "text-gray-300"
          }`}
          title="Heading 2"
        >
          <Heading2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`grid size-8 place-items-center rounded hover:bg-gray-800 ${
            editor.isActive("heading", { level: 3 }) ? "bg-[#7CFC00]/20 text-[#7CFC00]" : "text-gray-300"
          }`}
          title="Heading 3"
        >
          <Heading3 className="size-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-gray-800" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`grid size-8 place-items-center rounded hover:bg-gray-800 ${
            editor.isActive("bulletList") ? "bg-[#7CFC00]/20 text-[#7CFC00]" : "text-gray-300"
          }`}
          title="Bullet List"
        >
          <List className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`grid size-8 place-items-center rounded hover:bg-gray-800 ${
            editor.isActive("orderedList") ? "bg-[#7CFC00]/20 text-[#7CFC00]" : "text-gray-300"
          }`}
          title="Ordered List"
        >
          <ListOrdered className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`grid size-8 place-items-center rounded hover:bg-gray-800 ${
            editor.isActive("blockquote") ? "bg-[#7CFC00]/20 text-[#7CFC00]" : "text-gray-300"
          }`}
          title="Quote"
        >
          <Quote className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`grid size-8 place-items-center rounded hover:bg-gray-800 ${
            editor.isActive("code") ? "bg-[#7CFC00]/20 text-[#7CFC00]" : "text-gray-300"
          }`}
          title="Code"
        >
          <Code className="size-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-gray-800" />

        <button
          type="button"
          onClick={setLink}
          className={`grid size-8 place-items-center rounded hover:bg-gray-800 ${
            editor.isActive("link") ? "bg-[#7CFC00]/20 text-[#7CFC00]" : "text-gray-300"
          }`}
          title="Insert Link"
        >
          <LinkIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={addImage}
          className="grid size-8 place-items-center rounded text-gray-300 hover:bg-gray-800"
          title="Insert Image"
        >
          <span className="font-bold text-xs">IMG</span>
        </button>

        <div className="mx-1 h-4 w-px bg-gray-800" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="grid size-8 place-items-center rounded text-gray-300 hover:bg-gray-800 disabled:opacity-30"
          title="Undo"
        >
          <Undo2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="grid size-8 place-items-center rounded text-gray-300 hover:bg-gray-800 disabled:opacity-30"
          title="Redo"
        >
          <Redo2 className="size-4" />
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="p-4">
        <EditorContent
          editor={editor}
          className="prose prose-invert max-w-none min-h-[200px] focus:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:focus:outline-none"
        />
      </div>
    </div>
  );
}
