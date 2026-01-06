import { TiptapImage, TiptapLink, TaskList, TaskItem, HorizontalRule, StarterKit, Placeholder } from "novel/extensions"
import { UploadImagesPlugin } from "novel/plugins"
import { cx } from "class-variance-authority"

const tiptapImage = TiptapImage.extend({
  addProseMirrorPlugins() {
    return [
      UploadImagesPlugin({
        imageClass: cx("opacity-40 rounded-lg border border-gray-700"),
      }),
    ]
  },
}).configure({
  allowBase64: true,
  HTMLAttributes: {
    class: cx("rounded-lg border border-gray-700 my-4"),
  },
})

const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class: cx("text-[#7CFC00] underline underline-offset-4 hover:text-[#7CFC00]/80 cursor-pointer"),
  },
})

const taskList = TaskList.configure({
  HTMLAttributes: {
    class: cx("not-prose pl-2"),
  },
})

const taskItem = TaskItem.configure({
  HTMLAttributes: {
    class: cx("flex items-start my-2"),
  },
  nested: true,
})

const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    class: cx("my-6 border-gray-700"),
  },
})

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: cx("list-disc list-outside leading-3 space-y-2"),
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: cx("list-decimal list-outside leading-3 space-y-2"),
    },
  },
  listItem: {
    HTMLAttributes: {
      class: cx("leading-normal"),
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: cx("border-l-4 border-[#7CFC00] pl-4 text-gray-400 italic"),
    },
  },
  codeBlock: {
    HTMLAttributes: {
      class: cx("rounded-lg bg-[#0A0A0A] border border-gray-800 p-4 font-mono text-sm my-4"),
    },
  },
  code: {
    HTMLAttributes: {
      class: cx("rounded-md bg-[#0A0A0A] px-1.5 py-1 font-mono text-sm text-[#7CFC00]"),
      spellcheck: "false",
    },
  },
  horizontalRule: false,
  dropcursor: {
    color: "#7CFC00",
    width: 4,
  },
  gapcursor: false,
})

const placeholder = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === "heading") {
      return "What's the title?"
    }
    return "Start writing your article... (Press / for commands)"
  },
  includeChildren: true,
})

export const defaultExtensions = [starterKit, placeholder, tiptapLink, tiptapImage, taskList, taskItem, horizontalRule]
