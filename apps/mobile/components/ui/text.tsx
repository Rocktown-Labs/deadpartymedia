import { cn } from "@/lib/utils";
import * as Slot from "@rn-primitives/slot";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform, Text as RNText } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import type { Role } from "react-native";

const textVariants = cva(
  cn(
    "text-base text-foreground",
    Platform.select({
      web: "select-text",
    }),
  ),
  {
    variants: {
      variant: {
        default: "",
        h1: cn(
          "text-center text-5xl font-black tracking-tight",
          Platform.select({ web: "scroll-m-20 text-balance" }),
        ),
        h2: cn("text-5xl font-black tracking-tight", Platform.select({ web: "scroll-m-20" })),
        h3: cn("text-4xl font-black tracking-tight", Platform.select({ web: "scroll-m-20" })),
        h4: cn("text-2xl font-black tracking-tight", Platform.select({ web: "scroll-m-20" })),
        p: "mt-3 leading-7 sm:mt-6",
        blockquote: "mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6",
        code: cn(
          "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        ),
        lead: "text-xl text-muted-foreground",
        large: "text-lg font-semibold",
        display: "text-6xl font-black leading-[0.92] tracking-tight",
        eyebrow: "text-sm uppercase tracking-[0.34em] text-muted-foreground",
        meta: "text-xs uppercase tracking-[0.22em] text-muted-foreground",
        mono: "font-mono text-sm uppercase tracking-[0.3em] text-muted-foreground",
        small: "text-sm font-medium leading-none",
        muted: "text-sm text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps["variant"]>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  blockquote: Platform.select({ web: "blockquote" as Role }),
  code: Platform.select({ web: "code" as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: "1",
  h2: "2",
  h3: "3",
  h4: "4",
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = "default",
  style,
  ...props
}: React.ComponentProps<typeof RNText> &
  TextVariantProps &
  React.RefAttributes<RNText> & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;
  const mergedClassName = cn(textVariants({ variant }), textClass, className);

  const resolvedFontFamily = React.useMemo(() => {
    const source = mergedClassName ?? "";

    if (source.includes("font-mono") || variant === "mono" || variant === "code") {
      return "JetBrainsMono_500Medium";
    }
    if (
      variant === "display" ||
      variant === "h1" ||
      variant === "h2" ||
      variant === "h3" ||
      variant === "h4" ||
      source.includes("font-black") ||
      source.includes("font-extrabold")
    ) {
      return "Inter_900Black";
    }
    if (source.includes("font-bold") || source.includes("font-semibold")) {
      return "Inter_700Bold";
    }
    if (source.includes("font-medium") || variant === "small" || variant === "eyebrow") {
      return "Inter_500Medium";
    }

    return "Inter_400Regular";
  }, [mergedClassName, variant]);

  return (
    <Component
      className={mergedClassName}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      style={[{ fontFamily: resolvedFontFamily } as TextStyle, style] as StyleProp<TextStyle>}
      {...props}
    />
  );
}

export { Text, TextClassContext };
