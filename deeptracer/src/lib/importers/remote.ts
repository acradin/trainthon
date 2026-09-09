import type { RemoteConnector } from "@/lib/connectors/types";
import { Trace } from "@/types/trace";
import { importGitea, importGitLab } from "@/lib/importers/git-forges";
import { importMattermost, importMatrix, importRocketChat, importZulip } from "@/lib/importers/team-chat";
import {
  importBookStack,
  importDiscourse,
  importOpenProject,
  importOutline,
  importPlane,
  importTaiga,
} from "@/lib/importers/knowledge";

export async function importRemoteConnector(connector: RemoteConnector): Promise<Trace[]> {
  switch (connector.id) {
    case "gitlab":
      return importGitLab(connector);
    case "gitea":
      return importGitea(connector);
    case "mattermost":
      return importMattermost(connector);
    case "rocketchat":
      return importRocketChat(connector);
    case "zulip":
      return importZulip(connector);
    case "matrix":
      return importMatrix(connector);
    case "outline":
      return importOutline(connector);
    case "discourse":
      return importDiscourse(connector);
    case "plane":
      return importPlane(connector);
    case "openproject":
      return importOpenProject(connector);
    case "bookstack":
      return importBookStack(connector);
    case "taiga":
      return importTaiga(connector);
  }
}
