"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertIcon, LinkIcon, MailIcon, RefreshIcon } from "@/components/icons";

type Contact = {
  id: string;
  name: string;
  roleLabel: string;
};

type ConversationSummary = {
  id: string;
  playerName: string;
  participantName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

type Message = {
  id: string;
  senderId: string;
  body: string;
  contextLabel: string | null;
  contextHref: string | null;
  readAt: string | null;
  createdAt: string;
  isMine: boolean;
};

type ConversationDetail = {
  id: string;
  coach: { id: string; name: string };
  player: { id: string; name: string };
  messages: Message[];
};

const CONTEXTS = [
  { type: "TRAINING_SESSION", label: "Training session" },
  { type: "ASSESSMENT", label: "Assessment" },
  { type: "DAILY_CHECK_IN", label: "Daily check-in" },
  { type: "PROGRAM", label: "Program" },
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function messageStatus(message: Message) {
  if (!message.isMine) return "";
  return message.readAt ? "Read" : "Unread";
}

export default function MessagesPageView({ role }: { role: "COACH" | "ASSISTANT" | "PLAYER" }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("");
  const [contextType, setContextType] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (conversation) =>
        conversation.participantName.toLowerCase().includes(term) ||
        conversation.playerName.toLowerCase().includes(term) ||
        conversation.lastMessage.toLowerCase().includes(term)
    );
  }, [conversations, query]);

  async function loadList(preferredId?: string | null) {
    setError(null);
    setLoadingList(true);
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Could not load messages");
      setConversations(payload.conversations ?? []);
      setContacts(payload.contacts ?? []);
      const urlId = new URLSearchParams(window.location.search).get("conversationId");
      const nextId = preferredId ?? urlId ?? selectedId ?? payload.conversations?.[0]?.id ?? null;
      setSelectedId(nextId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadDetail(id: string) {
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${id}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Could not open conversation");
      setDetail(payload.conversation);
      setConversations((items) => items.map((item) => (item.id === id ? { ...item, unreadCount: 0 } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open conversation");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedId ?? undefined,
          recipientId: selectedId ? undefined : selectedRecipientId,
          body,
          contextType: contextType ?? undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Could not send message");
      setBody("");
      setContextType(null);
      setSelectedRecipientId("");
      await loadList(payload.conversationId);
      await loadDetail(payload.conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  const canSend = Boolean(body.trim()) && Boolean(selectedId || selectedRecipientId);
  const title = detail ? (role === "PLAYER" ? detail.coach.name : detail.player.name) : "New conversation";
  const selectedContext = CONTEXTS.find((item) => item.type === contextType);

  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-6 sm:px-6 lg:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Messages</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">Coach and player messaging</h1>
        </div>
        <button className="btn-ghost !px-4 !py-2 text-xs" onClick={() => loadList(selectedId)} disabled={loadingList}>
          <RefreshIcon className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-md border border-red/30 bg-red/10 px-4 py-3 text-sm text-red-glow">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid min-h-[620px] grid-cols-1 overflow-hidden rounded-lg border border-white/5 bg-ink-3 lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-white/5 bg-ink-2/50 lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-white/5 p-4">
            <input
              className="input-field !py-2.5"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations"
            />
            <select
              className="input-field !py-2.5"
              value={selectedRecipientId}
              onChange={(event) => {
                setSelectedId(null);
                setDetail(null);
                setSelectedRecipientId(event.target.value);
              }}
            >
              <option value="">Start a new message</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name} - {contact.roleLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[430px] overflow-y-auto lg:max-h-[560px]">
            {loadingList ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-md bg-white/5" />
                ))}
              </div>
            ) : null}

            {!loadingList && filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-smoke-4">
                  <MailIcon className="h-6 w-6" />
                </div>
                <p className="font-display text-base font-bold text-white">No conversations yet.</p>
                <p className="text-sm text-smoke-3">Choose a teammate above to send the first message.</p>
              </div>
            ) : null}

            {filtered.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  setSelectedRecipientId("");
                  setSelectedId(conversation.id);
                }}
                className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                  selectedId === conversation.id ? "bg-red/10" : ""
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-red/15 text-sm font-bold text-red">
                  {conversation.participantName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-white">{conversation.participantName}</span>
                    <span className="shrink-0 text-[11px] text-smoke-4">{formatTime(conversation.lastMessageTime)}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-smoke-3">{conversation.lastMessage || "No messages yet"}</span>
                  {conversation.unreadCount > 0 ? (
                    <span className="mt-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-h-[520px] flex-col">
          <div className="border-b border-white/5 px-4 py-4 sm:px-5">
            <h2 className="font-display text-xl font-bold text-white">{title}</h2>
            <p className="mt-1 text-xs text-smoke-3">
              {selectedRecipientId ? "New message" : detail ? `${detail.player.name} and ${detail.coach.name}` : "Select or start a conversation"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
            {loadingDetail ? (
              <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className={`h-16 animate-pulse rounded-lg bg-white/5 ${item % 2 ? "ml-auto w-2/3" : "w-3/4"}`} />
                ))}
              </div>
            ) : null}

            {!loadingDetail && !detail && !selectedRecipientId ? (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center">
                <MailIcon className="h-8 w-8 text-smoke-4" />
                <p className="font-display text-base font-bold text-white">Pick a conversation.</p>
                <p className="max-w-sm text-sm text-smoke-3">Messages, timestamps, and read status will appear here.</p>
              </div>
            ) : null}

            {!loadingDetail && detail?.messages.length === 0 ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-center text-sm text-smoke-3">
                No messages in this conversation yet.
              </div>
            ) : null}

            {!loadingDetail && detail ? (
              <div className="flex flex-col gap-3">
                {detail.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] rounded-lg px-4 py-3 ${message.isMine ? "bg-red text-white" : "bg-ink-2 text-paper"}`}>
                      {message.contextLabel ? (
                        <a
                          href={message.contextHref ?? "#"}
                          className={`mb-2 inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold ${
                            message.isMine ? "border-white/25 text-white" : "border-line-2 text-smoke-3"
                          }`}
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                          {message.contextLabel}
                        </a>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                      <div className={`mt-2 flex items-center justify-end gap-2 text-[10px] ${message.isMine ? "text-white/70" : "text-smoke-4"}`}>
                        <span>{formatTime(message.createdAt)}</span>
                        {messageStatus(message) ? <span>{messageStatus(message)}</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <form onSubmit={sendMessage} className="border-t border-white/5 p-4 sm:p-5">
            {role !== "PLAYER" ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {CONTEXTS.map((context) => (
                  <button
                    key={context.type}
                    type="button"
                    onClick={() => setContextType((value) => (value === context.type ? null : context.type))}
                    className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      contextType === context.type ? "border-red bg-red/15 text-white" : "border-line-2 text-smoke-3 hover:text-paper-pure"
                    }`}
                  >
                    {context.label}
                  </button>
                ))}
              </div>
            ) : null}
            {selectedContext ? <p className="mb-2 text-xs text-smoke-3">Sending with context: {selectedContext.label}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                className="input-field min-h-24 flex-1 resize-none !py-3"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={selectedId || selectedRecipientId ? "Write a message" : "Choose someone to message first"}
                disabled={!selectedId && !selectedRecipientId}
              />
              <button className="btn-primary sm:self-end" type="submit" disabled={!canSend || sending}>
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
