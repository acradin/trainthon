"use client";

import { FormEvent, useMemo, useState } from "react";
import SourceLogo from "@/components/SourceLogo";
import type { PublicConnector } from "@/lib/connectors/types";
import type { ConnectorSourceId } from "@/lib/trace-source";
import type { SyncResult } from "@/lib/agents/types";
import {
  CONNECTOR_CATALOG,
  CONNECTOR_GROUP_LABEL,
  CONNECTOR_SPEC_BY_ID,
  type ConnectorField,
  type ConnectorGroup,
} from "@/lib/connectors/catalog";

const INPUT =
  "w-full rounded-md border border-zinc-800 bg-[#0b0b0c] px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none";

interface ConnectorSourcesProps {
  connectors: PublicConnector[];
  onChange: (connectors: PublicConnector[], sync: SyncResult | null) => void;
  onError: (message: string | null) => void;
}

function defaultsFor(id: ConnectorSourceId): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of CONNECTOR_SPEC_BY_ID[id].fields) {
    values[field.key] = field.defaultValue ?? "";
  }
  return values;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ConnectorField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type={field.secret ? "password" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      className={field.mono ? `${INPUT} font-mono text-[12px]` : INPUT}
    />
  );
}

export default function ConnectorSources({ connectors, onChange, onError }: ConnectorSourcesProps) {
  const [open, setOpen] = useState<ConnectorSourceId | null>(null);
  const [saving, setSaving] = useState<ConnectorSourceId | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const grouped = useMemo(() => {
    const byId = new Map(connectors.map((item) => [item.id, item]));
    const groups: Array<{ group: ConnectorGroup; items: PublicConnector[] }> = [];
    for (const spec of CONNECTOR_CATALOG) {
      const item = byId.get(spec.id);
      if (!item) continue;
      const last = groups[groups.length - 1];
      if (!last || last.group !== spec.group) {
        groups.push({ group: spec.group, items: [item] });
      } else {
        last.items.push(item);
      }
    }
    return groups;
  }, [connectors]);

  const save = async (id: ConnectorSourceId, body: Record<string, unknown>) => {
    setSaving(id);
    onError(null);
    try {
      const response = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, sync: true, ...body }),
      });
      const data = await response.json();
      if (!data.success) {
        onError(typeof data.error === "string" ? data.error : "Could not connect source");
        return;
      }
      onChange(data.connectors ?? connectors, data.sync ?? null);
      const errors = Array.isArray(data.sync?.errors) ? (data.sync.errors as string[]) : [];
      const related = errors.filter((item) => item.startsWith(`${id}:`));
      if (related.length) {
        onError(related.join(" · "));
        return;
      }
      setOpen(null);
      setValues({});
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not connect source");
    } finally {
      setSaving(null);
    }
  };

  const disconnect = async (id: ConnectorSourceId) => {
    setSaving(id);
    onError(null);
    try {
      const response = await fetch(`/api/connectors?id=${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!data.success) {
        onError(typeof data.error === "string" ? data.error : "Could not remove source");
        return;
      }
      onChange(data.connectors ?? connectors, null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not remove source");
    } finally {
      setSaving(null);
    }
  };

  const onSubmit = (event: FormEvent, id: ConnectorSourceId) => {
    event.preventDefault();
    const spec = CONNECTOR_SPEC_BY_ID[id];
    const body: Record<string, unknown> = {};
    for (const field of spec.fields) {
      const value = (values[field.key] ?? "").trim();
      if (field.key === "port") {
        body.port = Number(value) || 993;
        continue;
      }
      if (value) body[field.key] = value;
    }
    if (id === "email") body.secure = true;
    void save(id, body);
  };

  return (
    <section className="mt-8">
      <h2 className="text-[15px] font-medium">Working context</h2>
      <p className="mt-0.5 text-[12px] text-zinc-500">
        Open-source chat, git, docs, and tickets, plus Slack, GitHub, and local files. Tokens stay in ~/.deeptracer.
      </p>
      <div className="mt-3 space-y-5">
        {grouped.map(({ group, items }) => (
          <div key={group}>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
              {CONNECTOR_GROUP_LABEL[group]}
            </h3>
            <div className="space-y-2">
              {items.map((connector) => {
                const spec = CONNECTOR_SPEC_BY_ID[connector.id];
                const editing = open === connector.id;
                return (
                  <div key={connector.id} className="rounded-md border border-zinc-800/80 bg-[#111113] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <SourceLogo source={connector.id} className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                        <div className="min-w-0">
                          <div className="text-[14px]">{connector.name}</div>
                          <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-600">{connector.summary}</div>
                          <p className="mt-1 text-[12px] text-zinc-500">{spec.copy}</p>
                        </div>
                      </div>
                      {connector.connected ? (
                        <button
                          type="button"
                          onClick={() => void disconnect(connector.id)}
                          disabled={saving !== null}
                          className="shrink-0 text-[12px] text-zinc-500 hover:text-zinc-200 disabled:text-zinc-700"
                        >
                          {saving === connector.id ? "Removing…" : "Remove"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (editing) {
                              setOpen(null);
                              return;
                            }
                            setOpen(connector.id);
                            setValues(defaultsFor(connector.id));
                          }}
                          className="shrink-0 rounded-md bg-[#e0783a] px-2.5 py-1 text-[12px] font-medium text-zinc-950 hover:bg-[#ec8a4e]"
                        >
                          {editing ? "Cancel" : "Add"}
                        </button>
                      )}
                    </div>
                    {editing ? (
                      <form className="mt-3 space-y-2" onSubmit={(event) => onSubmit(event, connector.id)}>
                        {spec.fields.map((field) => (
                          <FieldInput
                            key={field.key}
                            field={field}
                            value={values[field.key] ?? ""}
                            onChange={(next) => setValues((prev) => ({ ...prev, [field.key]: next }))}
                          />
                        ))}
                        <button
                          type="submit"
                          disabled={saving !== null}
                          className="rounded-md bg-[#e0783a] px-3 py-1.5 text-[12px] font-medium text-zinc-950 hover:bg-[#ec8a4e] disabled:bg-zinc-800 disabled:text-zinc-500"
                        >
                          {saving === connector.id ? "Scanning…" : "Connect and scan"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
