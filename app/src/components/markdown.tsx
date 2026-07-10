import MarkdownDisplay from "react-native-markdown-display"
import { colors, radius, spacing } from "@/lib/theme"

/**
 * Assistant-message markdown, themed for the dark chat surface. The server's
 * system prompt asks the model to answer in Markdown; user bubbles stay plain
 * text (users don't write markup).
 */
export function Markdown(props: { children: string }) {
  return <MarkdownDisplay style={styles}>{props.children}</MarkdownDisplay>
}

const styles = {
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  heading1: { color: colors.text, fontSize: 22, fontWeight: "700", marginVertical: spacing.sm },
  heading2: { color: colors.text, fontSize: 19, fontWeight: "700", marginVertical: spacing.sm },
  heading3: { color: colors.text, fontSize: 16, fontWeight: "700", marginVertical: spacing.xs },
  strong: { fontWeight: "700" },
  em: { fontStyle: "italic" },
  link: { color: colors.accent },
  bullet_list: { marginBottom: spacing.sm },
  ordered_list: { marginBottom: spacing.sm },
  list_item: { marginBottom: spacing.xs },
  bullet_list_icon: { color: colors.textDim },
  ordered_list_icon: { color: colors.textDim },
  blockquote: {
    backgroundColor: colors.surfaceRaised,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  code_inline: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 4,
    color: colors.accent,
    fontFamily: "Menlo",
    fontSize: 13,
  },
  code_block: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontFamily: "Menlo",
    fontSize: 13,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  fence: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontFamily: "Menlo",
    fontSize: 13,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  hr: { backgroundColor: colors.border, marginVertical: spacing.md },
  table: { borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1 },
  th: { color: colors.text, fontWeight: "700", padding: spacing.sm },
  td: { color: colors.text, padding: spacing.sm },
  tr: { borderColor: colors.border },
} as const
