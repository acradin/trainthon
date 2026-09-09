import type { ConnectorSourceId } from "@/lib/trace-source";

export type ConnectorId = ConnectorSourceId;

export const REMOTE_CONNECTOR_IDS = [
  "mattermost",
  "rocketchat",
  "zulip",
  "matrix",
  "gitlab",
  "gitea",
  "outline",
  "discourse",
  "plane",
  "openproject",
  "bookstack",
  "taiga",
] as const;

export type RemoteConnectorId = (typeof REMOTE_CONNECTOR_IDS)[number];

export function isRemoteConnectorId(value: string): value is RemoteConnectorId {
  return (REMOTE_CONNECTOR_IDS as readonly string[]).includes(value);
}

export interface SlackConnector {
  id: "slack";
  enabled: boolean;
  token: string;
  registeredAt: string;
}

export interface KakaoConnector {
  id: "kakao";
  enabled: boolean;
  path: string;
  registeredAt: string;
}

export interface EmailConnector {
  id: "email";
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  mailbox: string;
  registeredAt: string;
}

export interface FilesConnector {
  id: "files";
  enabled: boolean;
  path: string;
  registeredAt: string;
}

export interface GitHubConnector {
  id: "github";
  enabled: boolean;
  token: string;
  repo?: string;
  registeredAt: string;
}

export interface RemoteConnector {
  id: RemoteConnectorId;
  enabled: boolean;
  token: string;
  url?: string;
  user?: string;
  project?: string;
  registeredAt: string;
}

export type ConnectorConfig =
  | SlackConnector
  | KakaoConnector
  | EmailConnector
  | FilesConnector
  | GitHubConnector
  | RemoteConnector;

export function isRemoteConnector(connector: ConnectorConfig): connector is RemoteConnector {
  return isRemoteConnectorId(connector.id);
}

export interface ConnectorRegistry {
  lastSyncedAt?: string;
  connectors: ConnectorConfig[];
}

export interface PublicConnector {
  id: ConnectorId;
  name: string;
  connected: boolean;
  enabled: boolean;
  summary: string;
}
