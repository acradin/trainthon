import { Trace } from "@/types/trace";
import { buildConversationTrace, shortHash, titleOf } from "@/lib/importers/conversation-trace";
import type { EmailConnector } from "@/lib/connectors/types";

const MAX_MESSAGES = 40;

function decodeMime(value?: string): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

export async function importEmailImap(connector: EmailConnector): Promise<Trace[]> {
  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host: connector.host,
    port: connector.port,
    secure: connector.secure,
    auth: { user: connector.user, pass: connector.password },
    logger: false,
    connectionTimeout: 15_000,
  });

  const traces: Trace[] = [];
  try {
    await client.connect();
    const mailbox = connector.mailbox?.trim() || "INBOX";
    const lock = await client.getMailboxLock(mailbox);
    try {
      const exists = typeof client.mailbox === "object" && client.mailbox ? client.mailbox.exists : 0;
      if (!exists) return [];
      const from = Math.max(1, exists - MAX_MESSAGES + 1);
      for await (const message of client.fetch(`${from}:*`, { envelope: true, source: false, uid: true })) {
        const envelope = message.envelope;
        if (!envelope) continue;
        const subject = decodeMime(envelope.subject) || "(no subject)";
        const fromName =
          envelope.from?.[0]?.name || envelope.from?.[0]?.address || connector.user;
        const date = envelope.date
          ? new Date(envelope.date).toISOString()
          : new Date().toISOString();
        const snippet = [
          `From: ${fromName}${envelope.from?.[0]?.address ? ` <${envelope.from[0].address}>` : ""}`,
          envelope.to?.length
            ? `To: ${envelope.to.map((item) => item.address || item.name).filter(Boolean).join(", ")}`
            : "",
          subject,
        ]
          .filter(Boolean)
          .join("\n");
        const id = `em_${shortHash(`${connector.user}:${message.uid}`)}`;
        const trace = buildConversationTrace({
          traceId: id,
          source: "email",
          project: mailbox,
          name: titleOf(subject, "Email"),
          agent: "Email",
          messages: [{ at: date, author: fromName, text: snippet }],
        });
        if (trace) traces.push(trace);
      }
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      await client.close();
    }
  }
  return traces;
}
