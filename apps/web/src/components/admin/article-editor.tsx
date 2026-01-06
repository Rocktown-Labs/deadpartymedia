"use client"

import { useState } from "react"
import { EditorContent, EditorRoot, type JSONContent } from "novel"
import { handleImageDrop, handleImagePaste, createImageUpload } from "novel/plugins"
import { defaultExtensions } from "@/lib/editor-extensions"
import { toast } from "sonner"

interface ArticleEditorProps {
  initialContent?: JSONContent
  onChange?: (content: JSONContent) => void
}

const uploadFn = createImageUpload({
  onUpload: async (file: File) => {
    // In production, this would upload to Vercel Blob or similar
    console.log("[v0] Uploading image:", file.name)

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Return a placeholder URL for now
    return Promise.resolve(`https://picsum.photos/800/600?random=${Date.now()}`)
  },
  validateFn: (file) => {
    if (!file.type.includes("image/")) {
      toast.error("File type not supported.")
      return false
    } else if (file.size / 1024 / 1024 > 20) {
      toast.error("File size too big (max 20MB).")
      return false
    }
    return true
  },
})

export function ArticleEditor({ initialContent, onChange }: ArticleEditorProps) {
  const [content, setContent] = useState<JSONContent | undefined>(initialContent)
  const [saveStatus, setSaveStatus] = useState("Saved")

  const handleUpdate = (editor: any) => {
    const json = editor.getJSON()
    setContent(json)
    setSaveStatus("Saving...")

    // Debounce save
    setTimeout(() => {
      if (onChange) {
        onChange(json)
      }
      setSaveStatus("Saved")
      console.log("[v0] Content updated:", json)
    }, 500)
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          <span className="font-medium">{saveStatus}</span>
        </div>
      </div>

      <EditorRoot>
        <EditorContent
          initialContent={content}
          extensions={defaultExtensions}
          onUpdate={({ editor }) => handleUpdate(editor)}
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => {
                // Handle keyboard shortcuts if needed
                return false
              },
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-a:text-[#7CFC00] prose-code:text-[#7CFC00] prose-code:bg-[#0A0A0A] prose-code:px-1 prose-code:rounded focus:outline-none max-w-full min-h-[500px] px-6 py-4 bg-[#0A0A0A] border border-gray-800 rounded-lg",
            },
          }}
          slotAfter={
            <div className="mt-4 p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Pro Tips:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Type "/" to open the command menu for formatting options</li>
                <li>• Paste or drag images directly into the editor</li>
                <li>• Use markdown shortcuts: # for headings, ** for bold, * for italic</li>
                <li>• Press Cmd/Ctrl + K to insert a link</li>
              </ul>
            </div>
          }
        />
      </EditorRoot>
    </div>
  )
}
