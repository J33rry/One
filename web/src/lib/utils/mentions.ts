import React from "react";

export interface MentionRef {
  userId: string;
  username: string;
  displayName: string;
}

// Mirrors MENTION_RE in the server's messages.service.js.
const MENTION_RE = /(?<![\w@])@([a-zA-Z0-9_]{3,30})/g;

/**
 * Split message text into plain strings and highlighted mention spans.
 *
 * Only tokens that the server actually resolved to a participant are
 * highlighted, so "@nosuchuser" stays plain text. Returns React nodes rather
 * than HTML — never dangerouslySetInnerHTML.
 */
export function renderMessageText(
  content: string,
  mentions: MentionRef[] | undefined,
  currentUserId: string | undefined,
  /** Own messages sit on an accent background, where accent text vanishes. */
  onAccentBg = false,
): React.ReactNode[] {
  if (!content) return [];
  if (!mentions || mentions.length === 0) return [content];

  const byUsername = new Map(
    mentions.map((m) => [m.username.toLowerCase(), m]),
  );

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of content.matchAll(MENTION_RE)) {
    const mention = byUsername.get(match[1].toLowerCase());
    if (!mention) continue;

    const start = match.index ?? 0;
    if (start > last) nodes.push(content.slice(last, start));

    const isMe = mention.userId === currentUserId;
    // On an accent bubble, tint the background instead of the text; on a
    // surface bubble, accent text reads well.
    const className = onAccentBg
      ? isMe
        ? "bg-black/25 font-bold rounded px-1"
        : "bg-black/15 font-semibold rounded px-1"
      : isMe
        ? "bg-accent/25 text-accent font-semibold rounded px-1"
        : "text-accent font-medium";

    nodes.push(
      React.createElement(
        "span",
        { key: `m${key++}`, className, title: mention.displayName },
        match[0],
      ),
    );

    last = start + match[0].length;
  }

  if (last < content.length) nodes.push(content.slice(last));
  return nodes;
}
