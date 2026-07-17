import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required");
assert.ok(supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required");

const accounts = {
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

for (const [role, account] of Object.entries(accounts)) {
  assert.ok(account.password, `${role.toUpperCase()}_PASSWORD is required`);
}

function client() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function signIn(role) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword(accounts[role]);
  assert.ifError(error);
  assert.ok(data.user, `${role} login should return a user`);
  return { supabase, user: data.user };
}

async function run() {
  const results = [];

  const personal = await signIn("personal");
  const { data: personalOrders, error: personalOrdersError } = await personal.supabase.rpc("get_my_commission_orders");
  assert.ifError(personalOrdersError);
  assert.ok(personalOrders.length > 0, "personal user should see at least one commission order");
  const sharedOrder = personalOrders[0];
  results.push(`personal order visible: ${sharedOrder.id.slice(0, 8)} (${sharedOrder.status})`);

  const { data: products, error: productsError } = await personal.supabase
    .from("products")
    .select("id,title")
    .eq("is_active", true)
    .limit(1);
  assert.ifError(productsError);
  assert.ok(products.length === 1, "an active product is required for the cart test");
  const product = products[0];

  const { error: addError } = await personal.supabase.rpc("set_cart_quantity", {
    target_product_id: product.id,
    target_quantity: 1
  });
  assert.ifError(addError);
  const { data: cartAfterAdd, error: cartAfterAddError } = await personal.supabase.rpc("get_my_cart");
  assert.ifError(cartAfterAddError);
  assert.equal(cartAfterAdd.find((item) => item.product_id === product.id)?.quantity, 1, "cart should contain the added product");

  const { error: removeError } = await personal.supabase.rpc("set_cart_quantity", {
    target_product_id: product.id,
    target_quantity: 0
  });
  assert.ifError(removeError);
  const { data: cartAfterRemove, error: cartAfterRemoveError } = await personal.supabase.rpc("get_my_cart");
  assert.ifError(cartAfterRemoveError);
  assert.equal(cartAfterRemove.some((item) => item.product_id === product.id), false, "cart cleanup should remove the test product");
  results.push(`cart add/read/remove works: ${product.title}`);
  await personal.supabase.auth.signOut();

  const artist = await signIn("artist");
  const { data: artistOrders, error: artistOrdersError } = await artist.supabase.rpc("get_my_commission_orders");
  assert.ifError(artistOrdersError);
  assert.ok(artistOrders.some((order) => order.id === sharedOrder.id), "artist should see the same selected commission order");
  results.push(`artist sees shared order: ${sharedOrder.id.slice(0, 8)}`);
  await artist.supabase.auth.signOut();

  const admin = await signIn("admin");
  const { data: request, error: requestError } = await admin.supabase
    .from("commission_requests")
    .select("id,moderation_status")
    .eq("title", "E2E人工审核-商用立绘-0717")
    .maybeSingle();
  assert.ifError(requestError);
  assert.ok(request, "the audit regression request should exist");

  const { error: reviewError } = await admin.supabase.rpc("review_public_commission_request", {
    target_request_id: request.id,
    review_decision: "approved",
    review_note: "自动回归复核：审核日志写入正常"
  });
  assert.ifError(reviewError);

  const { data: auditRows, error: auditError } = await admin.supabase
    .from("platform_audit_logs")
    .select("id,action,entity_id")
    .eq("action", "review_public_commission_request")
    .eq("entity_id", request.id)
    .limit(1);
  assert.ifError(auditError);
  assert.equal(auditRows.length, 1, "request moderation should create an audit record");
  results.push("admin request moderation creates an audit record");

  const { error: selfChangeError } = await admin.supabase.rpc("admin_manage_user", {
    target_user_id: admin.user.id,
    next_role: "user",
    next_status: "suspended",
    change_reason: "automated self-lock protection check"
  });
  assert.ok(selfChangeError, "admin self-change must be rejected");
  results.push("admin self-demotion and self-suspension are blocked");
  await admin.supabase.auth.signOut();

  console.log(`Role core-flow smoke passed (${results.length} checks)`);
  for (const result of results) console.log(`PASS ${result}`);
}

run().catch((error) => {
  console.error("Role core-flow smoke failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
