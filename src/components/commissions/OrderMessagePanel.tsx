"use client";

import { FormEvent, useCallback, useState } from "react";
import { LoaderCircle, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type OrderMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function OrderMessagePanel({ orderId, userId, unreadCount, onRead }: { orderId: string; userId: string; unreadCount: number; onRead: () => Promise<void> }) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: conversationId, error: conversationError } = await supabase.rpc("ensure_order_conversation", { target_order_id: orderId });
    if (conversationError) {
      setError(conversationError.message);
      setLoading(false);
      return;
    }
    const { data, error: messageError } = await supabase.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", conversationId).order("created_at");
    if (messageError) setError(messageError.message);
    else setMessages((data ?? []) as OrderMessage[]);
    await supabase.rpc("mark_order_notifications_read", { target_order_id: orderId });
    await onRead();
    setLoading(false);
  }, [onRead, orderId]);

  async function toggle() {
    const next = !opened;
    setOpened(next);
    if (next) await loadMessages();
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "").trim();
    if (!body) return;
    setSending(true);
    setError("");
    const { error: sendError } = await createSupabaseBrowserClient().rpc("send_order_message", { target_order_id: orderId, message_body: body });
    setSending(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    form.reset();
    await loadMessages();
  }

  return <div className="mt-4 rounded-[16px] border border-purple/20 bg-white p-3">
    <button type="button" onClick={toggle} className="flex w-full items-center justify-between gap-3 text-left text-sm font-black">
      <span className="inline-flex items-center gap-2"><MessageCircle size={16} className="text-purple" />订单消息</span>
      <span className="rounded-pill bg-purple/10 px-3 py-1 text-xs text-purple">{unreadCount > 0 ? `${unreadCount} 条未读` : opened ? "收起" : "查看对话"}</span>
    </button>
    {opened ? <div className="mt-3">
      {loading ? <div className="flex justify-center py-4"><LoaderCircle className="animate-spin text-purple" size={20} /></div> : <div className="max-h-56 space-y-2 overflow-y-auto rounded-[14px] bg-bg p-3">
        {messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-[14px] px-3 py-2 text-sm font-semibold ${message.sender_id === userId ? "bg-purple text-white" : "bg-white text-ink"}`}><p>{message.body}</p><time className="mt-1 block text-[10px] opacity-65">{new Date(message.created_at).toLocaleString("zh-CN")}</time></div></div>)}
        {messages.length === 0 ? <p className="py-3 text-center text-xs font-bold text-muted">暂无消息，可以先确认需求、排期或交付细节。</p> : null}
      </div>}
      {error ? <p role="alert" className="mt-2 text-xs font-bold text-danger">{error}</p> : null}
      <form onSubmit={sendMessage} className="mt-3 flex gap-2"><input name="body" maxLength={2000} aria-label={`订单消息-${orderId}`} placeholder="发送订单相关消息" className="h-10 min-w-0 flex-1 rounded-[12px] border border-line bg-bg px-3 text-sm font-semibold outline-none focus:border-purple" /><Button type="submit" disabled={sending}><Send size={15} />发送</Button></form>
    </div> : null}
  </div>;
}
