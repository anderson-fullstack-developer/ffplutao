import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { FieldError } from "@/components/ui/form-error";
import type { TicketMessage } from "@/lib/support";
import { cn, formatDateTime } from "@/lib/format";

type SendResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Conversa de um ticket. `viewer` define de que lado aparecem as mensagens
 * (as do próprio utilizador ficam à direita).
 */
export function TicketThread({
  messages,
  viewer,
  onSend,
  placeholder = "Escreva a sua mensagem...",
  sendLabel = "Enviar",
  extraActions,
  closedNotice,
}: {
  messages: TicketMessage[];
  viewer: "customer" | "admin";
  onSend: (message: string) => Promise<SendResult>;
  placeholder?: string;
  sendLabel?: string;
  extraActions?: React.ReactNode;
  closedNotice?: string | undefined;
}) {
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const bottom = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(undefined);
    try {
      const result = await onSend(text);
      if (!result.ok) {
        setError(result.fieldErrors?.["message"] ?? result.error);
        return;
      }
      setText("");
    } catch {
      toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <ol className="space-y-4">
        {messages.map((message) => {
          const mine = viewer === "admin" ? message.fromAdmin : !message.fromAdmin;
          return (
            <li key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl border px-4 py-3 text-sm",
                  message.fromAdmin
                    ? "border-primary/30 bg-primary/10"
                    : "border-border bg-surface/70",
                  mine ? "rounded-br-sm" : "rounded-bl-sm",
                )}
              >
                <p className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {message.fromAdmin ? "Equipa Plutão Shop" : message.authorName}
                  </span>
                  {message.fromAdmin && viewer === "admin" ? (
                    <span>({message.authorName})</span>
                  ) : null}
                  <span>{formatDateTime(message.createdAt)}</span>
                </p>
                <p className="break-words whitespace-pre-line">{message.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={bottom} />

      {closedNotice ? (
        <p className="rounded-lg border border-border bg-surface/50 px-3 py-2 text-xs text-muted-foreground">
          {closedNotice}
        </p>
      ) : null}

      <form onSubmit={send} className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={5000}
          aria-label="Mensagem"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send(e);
          }}
        />
        <FieldError message={error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">{extraActions}</div>
          <Button type="submit" disabled={sending || !text.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sendLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
