const GITHUB_ALERTS = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"] as const;

export type GithubAlertType = (typeof GITHUB_ALERTS)[number];

export const GITHUB_ALERT_LABELS: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

const ALERT_PREFIX =
  /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:[ \t]*\r?\n|[ \t]+)?/i;

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  data?: {
    hProperties?: Record<string, string | string[]>;
  };
};

function walk(node: MarkdownNode) {
  if (node.type === "blockquote") {
    applyGithubAlert(node);
  }
  node.children?.forEach(walk);
}

function applyGithubAlert(blockquote: MarkdownNode) {
  const paragraph = blockquote.children?.find((child) => child.type === "paragraph");
  const first = paragraph?.children?.[0];
  if (first?.type !== "text" || typeof first.value !== "string") return;
  const match = first.value.match(ALERT_PREFIX);
  if (!match) return;

  const type = match[1].toLowerCase();
  first.value = first.value.slice(match[0].length);
  if (!first.value && paragraph?.children) {
    paragraph.children.shift();
    if (paragraph.children.length === 0 && blockquote.children) {
      blockquote.children = blockquote.children.filter((child) => child !== paragraph);
    }
  }

  blockquote.data = {
    ...blockquote.data,
    hProperties: {
      ...blockquote.data?.hProperties,
      className: ["km-md-alert", `km-md-alert--${type}`],
      "data-alert": type,
    },
  };
}

export function remarkGithubAlerts() {
  return (tree: MarkdownNode) => {
    walk(tree);
  };
}
