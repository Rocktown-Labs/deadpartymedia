import type { ArticleContentMark, ArticleContentNode } from "@dpmedia/contracts";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import * as Linking from "expo-linking";
import { ExternalLinkIcon } from "lucide-react-native";
import * as React from "react";
import { Image, View } from "react-native";

function getMarkClasses(marks?: ArticleContentMark[]) {
  return (marks ?? [])
    .map((mark) => {
      if (mark.type === "bold") return "font-bold";
      if (mark.type === "italic") return "italic";
      if (mark.type === "code") return "font-mono bg-muted px-1";
      if (mark.type === "link") return "underline text-primary";
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

function getMarkLink(marks?: ArticleContentMark[]) {
  const linkMark = (marks ?? []).find((mark) => mark.type === "link");
  const href = linkMark?.attrs?.href;
  return typeof href === "string" ? href : null;
}

function renderInlineNodes(nodes: ArticleContentNode[] | undefined, keyPrefix: string) {
  return (nodes ?? []).map((node, index) => {
    if (node.type === "text") {
      const href = getMarkLink(node.marks);
      return (
        <Text
          key={`${keyPrefix}-text-${index}`}
          className={getMarkClasses(node.marks)}
          onPress={href ? () => Linking.openURL(href) : undefined}
        >
          {node.text ?? ""}
        </Text>
      );
    }

    if (node.type === "hardBreak") {
      return <Text key={`${keyPrefix}-br-${index}`}>{"\n"}</Text>;
    }

    return (
      <Text key={`${keyPrefix}-${node.type}-${index}`} className="text-muted-foreground">
        [Unsupported content]
      </Text>
    );
  });
}

function UnsupportedNode({
  compact = false,
  node,
}: {
  compact?: boolean;
  node: ArticleContentNode;
}) {
  const source = typeof node.attrs?.src === "string" ? node.attrs.src : null;

  return (
    <View className="gap-3 rounded-[20px] border border-border bg-card px-4 py-4">
      <Text className={compact ? "text-sm text-muted-foreground" : "text-base text-muted-foreground"}>
        This content block is not fully supported in the app yet.
      </Text>
      {source ? (
        <Button variant="outline" onPress={() => Linking.openURL(source)}>
          <ExternalLinkIcon color="#7CFC00" size={16} />
          <Text>Open linked content</Text>
        </Button>
      ) : null}
    </View>
  );
}

function renderBlockNode(node: ArticleContentNode, index: number): React.ReactNode {
  switch (node.type) {
    case "heading": {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 2;
      const variant = level <= 2 ? "h3" : "h4";
      return (
        <Text key={`heading-${index}`} variant={variant} className="mt-6 text-left">
          {renderInlineNodes(node.content, `heading-${index}`)}
        </Text>
      );
    }
    case "paragraph": {
      return (
        <Text key={`paragraph-${index}`} className="text-lg leading-9 text-foreground">
          {renderInlineNodes(node.content, `paragraph-${index}`)}
        </Text>
      );
    }
    case "blockquote": {
      return (
        <View key={`blockquote-${index}`} className="border-l-4 border-primary pl-4">
          <Text className="text-xl italic leading-9 text-muted-foreground">
            {renderInlineNodes(node.content, `blockquote-${index}`)}
          </Text>
        </View>
      );
    }
    case "bulletList":
    case "orderedList": {
      return (
        <View key={`${node.type}-${index}`} className="gap-4">
          {(node.content ?? []).map((item, itemIndex) => {
            const paragraph = item.content?.find((child) => child.type === "paragraph");
            const label = node.type === "orderedList" ? `${itemIndex + 1}.` : "•";

            return (
              <View key={`${node.type}-${index}-${itemIndex}`} className="flex-row gap-3">
                <Text className="pt-1 text-lg text-primary">{label}</Text>
                <View className="flex-1 gap-3">
                  {paragraph ? (
                    <Text className="text-lg leading-9 text-foreground">
                      {renderInlineNodes(paragraph.content, `${node.type}-${index}-${itemIndex}`)}
                    </Text>
                  ) : (
                    <UnsupportedNode compact node={item} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      );
    }
    case "horizontalRule": {
      return <Separator key={`hr-${index}`} className="bg-border" />;
    }
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      if (!src) {
        return <UnsupportedNode key={`image-${index}`} node={node} />;
      }

      return (
        <View key={`image-${index}`} className="gap-3">
          <Image className="h-72 w-full rounded-[24px] bg-muted" resizeMode="cover" source={{ uri: src }} />
          {alt ? <Text className="text-sm text-muted-foreground">{alt}</Text> : null}
        </View>
      );
    }
    default:
      return <UnsupportedNode key={`${node.type}-${index}`} node={node} />;
  }
}

export function ArticleContent({
  document,
  fallbackText,
}: {
  document?: ArticleContentNode | null;
  fallbackText?: string;
}) {
  const blocks = document?.content ?? [];

  if (blocks.length === 0) {
    return (
      <View className="gap-5">
        {(fallbackText ?? "")
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((paragraph, index) => (
            <Text key={`fallback-${index}`} className="text-lg leading-9 text-foreground">
              {paragraph}
            </Text>
          ))}
      </View>
    );
  }

  return <View className="gap-6">{blocks.map((node, index) => renderBlockNode(node, index))}</View>;
}
