import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(url && key, "Supabase public environment variables are required");

const credentials = {
  personal: {
    email: process.env.PERSONAL_EMAIL ?? "personal.test.0713@oc-forge.dev",
    password: process.env.PERSONAL_PASSWORD
  },
  artist: {
    email: process.env.ARTIST_EMAIL ?? "artist.test.0716@oc-forge.dev",
    password: process.env.ARTIST_PASSWORD
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? "owner@oc-forge.dev",
    password: process.env.ADMIN_PASSWORD
  }
};

for (const [role, account] of Object.entries(credentials)) {
  assert.ok(account.password, `${role.toUpperCase()}_PASSWORD is required`);
}

function makeClient() {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(role) {
  const supabase = makeClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials[role]);
  assert.ifError(error);
  assert.ok(data.user, `${role} login failed`);
  return { supabase, user: data.user };
}

async function expectOrder(supabase, orderId, expectedStatus, expectedPayments = {}) {
  const { data, error } = await supabase.rpc("get_my_commission_orders");
  assert.ifError(error);
  const order = data.find((item) => item.id === orderId);
  assert.ok(order, `order ${orderId} should be visible`);
  assert.equal(order.status, expectedStatus, `order should be ${expectedStatus}`);
  if (expectedPayments.deposit) assert.equal(order.deposit_status, expectedPayments.deposit);
  if (expectedPayments.balance) assert.equal(order.balance_status, expectedPayments.balance);
  return order;
}

async function getArtistOffer(artist) {
  const { data: services, error: serviceError } = await artist.supabase
    .from("artist_services")
    .select("id,title")
    .eq("artist_id", artist.user.id)
    .eq("is_active", true)
    .limit(1);
  assert.ifError(serviceError);
  assert.equal(services.length, 1, "artist needs an active service");

  const { data: packages, error: packageError } = await artist.supabase
    .from("service_packages")
    .select("id,service_id,price,delivery_days,revision_limit")
    .eq("service_id", services[0].id)
    .eq("is_active", true)
    .limit(1);
  assert.ifError(packageError);
  assert.equal(packages.length, 1, "artist service needs an active package");
  return { service: services[0], package: packages[0] };
}

async function createPublicOrder(personal, artist, offer, suffix) {
  const title = `生命周期验收-${suffix}-${Date.now()}`;
  const deadline = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const { data: requestId, error: publishError } = await personal.supabase.rpc("publish_public_commission", {
    request_title: title,
    request_brief: "双端自动化验收用原创角色头像需求，包含草稿确认、一次修改、成稿验收和双方消息测试。",
    request_service_type: "OC 头像",
    request_budget_min: 200,
    request_budget_max: 500,
    request_deadline: deadline,
    request_usage_scope: "personal",
    request_collection_days: 3,
    request_allow_public_display: false,
    request_allow_ai_training: false
  });
  assert.ifError(publishError);

  const { data: responseId, error: responseError } = await artist.supabase.rpc("submit_public_commission_response", {
    target_request_id: requestId,
    target_service_id: offer.service.id,
    target_package_id: offer.package.id,
    response_quote: 299,
    response_delivery_days: 14,
    response_note: "生命周期验收方案：先提交草稿确认，再按反馈修改并交付成稿。"
  });
  assert.ifError(responseError);

  const { data: orderId, error: selectError } = await personal.supabase.rpc("select_public_commission_response", {
    target_response_id: responseId
  });
  assert.ifError(selectError);
  await expectOrder(personal.supabase, orderId, "pending_deposit", { deposit: "unpaid" });
  await expectOrder(artist.supabase, orderId, "pending_deposit", { deposit: "unpaid" });
  return { requestId, orderId, title };
}

async function runMainLifecycle(personal, artist, offer) {
  const test = await createPublicOrder(personal, artist, offer, "主流程");
  const { orderId } = test;

  const { error: forbiddenDelivery } = await personal.supabase.rpc("submit_commission_delivery", {
    target_order_id: orderId,
    delivery_kind: "draft",
    delivery_note: "个人用户不应该能够提交画师草稿。"
  });
  assert.ok(forbiddenDelivery, "client delivery must be rejected");

  const { error: prematureFinal } = await artist.supabase.rpc("submit_commission_delivery", {
    target_order_id: orderId,
    delivery_kind: "final",
    delivery_note: "尚未支付定金时不应允许提交成稿。"
  });
  assert.ok(prematureFinal, "final delivery before deposit must be rejected");

  const { error: messageError } = await personal.supabase.rpc("send_order_message", {
    target_order_id: orderId,
    message_body: "验收消息：请先确认角色蓝色发饰和浅色背景。"
  });
  assert.ifError(messageError);
  const { data: artistMessageNotifications, error: messageNotificationError } = await artist.supabase
    .from("notifications")
    .select("id,read_at")
    .eq("related_order_id", orderId)
    .eq("type", "commission_message");
  assert.ifError(messageNotificationError);
  assert.ok(artistMessageNotifications.some((item) => item.read_at === null), "artist should receive an unread order message notification");

  const { data: conversationId, error: conversationError } = await artist.supabase.rpc("ensure_order_conversation", {
    target_order_id: orderId
  });
  assert.ifError(conversationError);
  const { data: messages, error: messagesError } = await artist.supabase
    .from("messages")
    .select("body,sender_id")
    .eq("conversation_id", conversationId);
  assert.ifError(messagesError);
  assert.ok(messages.some((message) => message.body.includes("蓝色发饰")), "artist should see the client message");
  const { error: markReadError } = await artist.supabase.rpc("mark_order_notifications_read", { target_order_id: orderId });
  assert.ifError(markReadError);

  const { error: artistDepositError } = await artist.supabase.rpc("simulate_commission_deposit", { target_order_id: orderId });
  assert.ok(artistDepositError, "artist must not be able to pay the client deposit");
  const { error: depositError } = await personal.supabase.rpc("simulate_commission_deposit", { target_order_id: orderId });
  assert.ifError(depositError);
  await expectOrder(personal.supabase, orderId, "in_progress", { deposit: "paid" });

  const { data: firstDraftId, error: firstDraftError } = await artist.supabase.rpc("submit_commission_delivery", {
    target_order_id: orderId,
    delivery_kind: "draft",
    delivery_note: "第一版草稿：完成构图、蓝色发饰和浅色背景，请确认表情。"
  });
  assert.ifError(firstDraftError);
  await expectOrder(personal.supabase, orderId, "draft_review");

  const { error: revisionError } = await personal.supabase.rpc("review_commission_delivery", {
    target_delivery_id: firstDraftId,
    review_decision: "revision_requested",
    review_note: "请将表情调整得更自然，并缩小发饰。"
  });
  assert.ifError(revisionError);
  await expectOrder(artist.supabase, orderId, "revision_requested");

  const { data: revisedDraftId, error: revisedDraftError } = await artist.supabase.rpc("submit_commission_delivery", {
    target_order_id: orderId,
    delivery_kind: "draft",
    delivery_note: "第二版草稿：已调整表情并缩小蓝色发饰，请再次确认。"
  });
  assert.ifError(revisedDraftError);
  await expectOrder(personal.supabase, orderId, "draft_review");

  const { error: approveDraftError } = await personal.supabase.rpc("review_commission_delivery", {
    target_delivery_id: revisedDraftId,
    review_decision: "approved",
    review_note: "草稿确认通过，可以继续完成成稿。"
  });
  assert.ifError(approveDraftError);
  await expectOrder(artist.supabase, orderId, "in_progress");

  const { data: finalId, error: finalError } = await artist.supabase.rpc("submit_commission_delivery", {
    target_order_id: orderId,
    delivery_kind: "final",
    delivery_note: "成稿已完成：包含高清 PNG、透明背景版本和个人使用授权说明。"
  });
  assert.ifError(finalError);
  await expectOrder(personal.supabase, orderId, "final_review");

  const { error: approveFinalError } = await personal.supabase.rpc("review_commission_delivery", {
    target_delivery_id: finalId,
    review_decision: "approved",
    review_note: "成稿内容和交付规格验收通过。"
  });
  assert.ifError(approveFinalError);
  await expectOrder(personal.supabase, orderId, "pending_balance", { balance: "unpaid" });

  const { error: balanceError } = await personal.supabase.rpc("simulate_commission_balance", { target_order_id: orderId });
  assert.ifError(balanceError);
  await expectOrder(personal.supabase, orderId, "completed", { deposit: "paid", balance: "paid" });
  await expectOrder(artist.supabase, orderId, "completed", { deposit: "paid", balance: "paid" });

  const { error: reviewError } = await personal.supabase.rpc("submit_artist_review", {
    target_order_id: orderId,
    rating_value: 5,
    communication_value: 5,
    quality_value: 5,
    review_body: "生命周期自动验收评价：沟通清晰，草稿修改和成稿交付流程完整。"
  });
  assert.ifError(reviewError);

  const { data: logs, error: logsError } = await personal.supabase
    .from("order_status_logs")
    .select("to_status")
    .eq("order_id", orderId)
    .order("created_at");
  assert.ifError(logsError);
  const reached = new Set(logs.map((log) => log.to_status));
  for (const status of ["pending_deposit", "in_progress", "draft_review", "revision_requested", "final_review", "pending_balance", "completed"]) {
    assert.ok(reached.has(status), `lifecycle log should include ${status}`);
  }
  return test;
}

async function runDisputeLifecycle(personal, artist, admin, offer) {
  const test = await createPublicOrder(personal, artist, offer, "争议退款");
  const { error: depositError } = await personal.supabase.rpc("simulate_commission_deposit", { target_order_id: test.orderId });
  assert.ifError(depositError);

  const { data: disputeId, error: disputeError } = await personal.supabase.rpc("open_commission_dispute", {
    target_order_id: test.orderId,
    dispute_reason: "自动验收争议：双方对交付范围理解不一致，请管理员执行模拟退款。"
  });
  assert.ifError(disputeError);
  await expectOrder(personal.supabase, test.orderId, "disputed", { deposit: "paid" });
  await expectOrder(artist.supabase, test.orderId, "disputed", { deposit: "paid" });

  const { error: resolveError } = await admin.supabase.rpc("resolve_commission_dispute", {
    target_dispute_id: disputeId,
    resolution_action: "refund",
    resolution_note: "自动验收裁定：终止履约并退回已支付模拟定金。"
  });
  assert.ifError(resolveError);
  await expectOrder(personal.supabase, test.orderId, "cancelled", { deposit: "refunded" });

  const { data: dispute, error: disputeReadError } = await admin.supabase
    .from("order_disputes")
    .select("status,resolution")
    .eq("id", disputeId)
    .single();
  assert.ifError(disputeReadError);
  assert.equal(dispute.status, "resolved");
  assert.ok(dispute.resolution.startsWith("refund:"));
  return test;
}

async function run() {
  const personal = await signIn("personal");
  const artist = await signIn("artist");
  const admin = await signIn("admin");
  const offer = await getArtistOffer(artist);

  const main = await runMainLifecycle(personal, artist, offer);
  const dispute = await runDisputeLifecycle(personal, artist, admin, offer);

  console.log("Commission lifecycle acceptance passed");
  console.log(`PASS completed lifecycle order ${main.orderId.slice(0, 8)}`);
  console.log(`PASS dispute refund order ${dispute.orderId.slice(0, 8)}`);
  console.log("PASS role boundaries, messages, notifications, revisions, delivery, payments, review, logs and dispute resolution");
}

run().catch((error) => {
  console.error("Commission lifecycle acceptance failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
