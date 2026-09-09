import type { ConnectorSourceId } from "@/lib/trace-source";
import { CONNECTOR_SOURCE_IDS } from "@/lib/trace-source";

export type ConnectorGroup = "chat" | "git" | "knowledge" | "local";

export type ConnectorFieldKey = "token" | "url" | "user" | "project" | "path" | "host" | "port" | "password" | "mailbox" | "repo";

export type ConnectorField = {
  key: ConnectorFieldKey;
  placeholder: string;
  optional?: boolean;
  secret?: boolean;
  mono?: boolean;
  defaultValue?: string;
};

export type ConnectorSpec = {
  id: ConnectorSourceId;
  group: ConnectorGroup;
  copy: string;
  fields: ConnectorField[];
};

export const CONNECTOR_GROUP_LABEL: Record<ConnectorGroup, string> = {
  chat: "Chat",
  git: "Code",
  knowledge: "Docs and tickets",
  local: "This machine",
};

export const CONNECTOR_CATALOG: ConnectorSpec[] = [
  {
    id: "slack",
    group: "chat",
    copy: "Paste a Slack user or bot token. Reads channels you can already see.",
    fields: [{ key: "token", placeholder: "xoxp- or xoxb- token", secret: true }],
  },
  {
    id: "mattermost",
    group: "chat",
    copy: "Self-hosted Mattermost personal access token. Reads recent channel posts.",
    fields: [
      { key: "url", placeholder: "https://chat.example.com", mono: true },
      { key: "token", placeholder: "Personal access token", secret: true },
    ],
  },
  {
    id: "rocketchat",
    group: "chat",
    copy: "Rocket.Chat personal access token plus your user id.",
    fields: [
      { key: "url", placeholder: "https://chat.example.com", mono: true },
      { key: "user", placeholder: "User id", mono: true },
      { key: "token", placeholder: "Personal access token", secret: true },
    ],
  },
  {
    id: "zulip",
    group: "chat",
    copy: "Zulip email plus API key from Settings → Account & privacy.",
    fields: [
      { key: "url", placeholder: "https://zulip.example.com", mono: true },
      { key: "user", placeholder: "you@example.com" },
      { key: "token", placeholder: "API key", secret: true },
    ],
  },
  {
    id: "matrix",
    group: "chat",
    copy: "Matrix access token from an Element session. Homeserver URL required.",
    fields: [
      { key: "url", placeholder: "https://matrix.org", mono: true, defaultValue: "https://matrix.org" },
      { key: "token", placeholder: "syt_ access token", secret: true },
    ],
  },
  {
    id: "github",
    group: "git",
    copy: "Personal access token with repo scope. Optional owner/name limits the scan.",
    fields: [
      { key: "token", placeholder: "ghp_ or github_pat_ token", secret: true },
      { key: "repo", placeholder: "owner/repo (optional)", optional: true, mono: true },
    ],
  },
  {
    id: "gitlab",
    group: "git",
    copy: "GitLab.com or self-hosted. Token with read_api. Optional group/project.",
    fields: [
      { key: "token", placeholder: "glpat- token", secret: true },
      { key: "url", placeholder: "https://gitlab.com", optional: true, mono: true, defaultValue: "https://gitlab.com" },
      { key: "project", placeholder: "group/project (optional)", optional: true, mono: true },
    ],
  },
  {
    id: "gitea",
    group: "git",
    copy: "Gitea or Forgejo (Codeberg). Token with repository read. Optional owner/repo.",
    fields: [
      { key: "url", placeholder: "https://codeberg.org", mono: true },
      { key: "token", placeholder: "Access token", secret: true },
      { key: "project", placeholder: "owner/repo (optional)", optional: true, mono: true },
    ],
  },
  {
    id: "outline",
    group: "knowledge",
    copy: "Outline wiki API token. Self-hosted or getoutline.com.",
    fields: [
      { key: "url", placeholder: "https://app.getoutline.com", mono: true, defaultValue: "https://app.getoutline.com" },
      { key: "token", placeholder: "API token", secret: true },
    ],
  },
  {
    id: "discourse",
    group: "knowledge",
    copy: "Discourse API key plus the username it was created for. Reads latest topics.",
    fields: [
      { key: "url", placeholder: "https://meta.discourse.org", mono: true },
      { key: "user", placeholder: "API username" },
      { key: "token", placeholder: "API key", secret: true },
    ],
  },
  {
    id: "plane",
    group: "knowledge",
    copy: "Open-source Linear alternative. Workspace slug plus API key.",
    fields: [
      { key: "url", placeholder: "https://api.plane.so", optional: true, mono: true, defaultValue: "https://api.plane.so" },
      { key: "project", placeholder: "workspace-slug", mono: true },
      { key: "token", placeholder: "plane_api_ key", secret: true },
    ],
  },
  {
    id: "openproject",
    group: "knowledge",
    copy: "OpenProject API key. Reads recent work packages.",
    fields: [
      { key: "url", placeholder: "https://openproject.example.com", mono: true },
      { key: "token", placeholder: "API key", secret: true },
    ],
  },
  {
    id: "bookstack",
    group: "knowledge",
    copy: "BookStack token id and secret as tokenId:secret. Reads recent pages.",
    fields: [
      { key: "url", placeholder: "https://wiki.example.com", mono: true },
      { key: "token", placeholder: "tokenId:secret", secret: true, mono: true },
    ],
  },
  {
    id: "taiga",
    group: "knowledge",
    copy: "Taiga auth token from Settings → API. Cloud or self-hosted.",
    fields: [
      { key: "url", placeholder: "https://api.taiga.io", optional: true, mono: true, defaultValue: "https://api.taiga.io" },
      { key: "token", placeholder: "Auth token", secret: true },
      { key: "project", placeholder: "project slug (optional)", optional: true, mono: true },
    ],
  },
  {
    id: "kakao",
    group: "local",
    copy: "Folder of official KakaoTalk 대화 내용 내보내기 .txt files. No unofficial decrypt.",
    fields: [{ key: "path", placeholder: "C:\\Users\\you\\Documents\\KakaoTalk", mono: true }],
  },
  {
    id: "email",
    group: "local",
    copy: "IMAP on this machine. Gmail needs an app password.",
    fields: [
      { key: "host", placeholder: "imap.gmail.com", defaultValue: "imap.gmail.com" },
      { key: "port", placeholder: "993", defaultValue: "993", mono: true },
      { key: "user", placeholder: "you@example.com" },
      { key: "password", placeholder: "App password", secret: true },
      { key: "mailbox", placeholder: "INBOX", optional: true, defaultValue: "INBOX" },
    ],
  },
  {
    id: "files",
    group: "local",
    copy: "A project folder on this computer. Skips git/node_modules and large binaries.",
    fields: [{ key: "path", placeholder: "C:\\Users\\you\\project", mono: true }],
  },
];

export const CONNECTOR_SPEC_BY_ID = Object.fromEntries(
  CONNECTOR_CATALOG.map((spec) => [spec.id, spec])
) as Record<ConnectorSourceId, ConnectorSpec>;

const missingCatalog = CONNECTOR_SOURCE_IDS.filter((id) => !CONNECTOR_SPEC_BY_ID[id]);
if (missingCatalog.length) {
  throw new Error(`Missing connector catalog: ${missingCatalog.join(", ")}`);
}
