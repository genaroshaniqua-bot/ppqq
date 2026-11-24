import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
async function main() {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_user::text $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    grant all on storage.objects to anon,authenticated;
    grant execute on function auth.uid(),auth.role(),storage.foldername(text) to anon,authenticated;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
  `);
  for (const file of (await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort()) {
    // gen_random_uuid is built into PostgreSQL; the extension's other APIs aren't used here.
    const sql=(await readFile('supabase/migrations/'+file,'utf8')).replace(/create extension if not exists "pgcrypto";/i,'');
    try { await db.exec(sql); } catch(e) { throw new Error(`${file}: ${e.message}`); }
  }
  const buyer='11111111-1111-4111-8111-111111111111', artist='22222222-2222-4222-8222-222222222222', other='33333333-3333-4333-8333-333333333333', admin='44444444-4444-4444-8444-444444444444';
  await db.exec(`insert into auth.users(id,email) values ('${buyer}','buyer@test.invalid'),('${artist}','artist@test.invalid'),('${other}','other@test.invalid'),('${admin}','admin@test.invalid');
    update public.profiles set role='artist' where id='${artist}'; update public.profiles set role='admin' where id='${admin}';
    insert into public.artist_profiles(user_id,review_status) values ('${artist}','approved');`);
  async function as(role,uid,sql) {
    return db.transaction(async tx=>{
      await tx.exec(`set local role ${role};`);
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)",[uid??'']);
      return tx.query(sql);
    });
  }
  async function deny(role,uid,sql,pattern=/permission denied|authentication required|active account required|access required|row-level security/) {
    await assert.rejects(()=>as(role,uid,sql),pattern); passed++;
  }
  // Anonymous invocations must be stopped before touching an order or sending notifications.
  for (const sql of [
    `select public.artist_respond_to_commission(gen_random_uuid(),'quoted',100,'test')`,
    `select public.advance_shop_order(gen_random_uuid(),'received')`,
    `select public.submit_artist_review(gen_random_uuid(),5,5,5,'ten characters test')`,
    `select public.push_commission_notification('${buyer}','test','test','test',null)`,
    `select public.simulate_point_purchase('basic_monthly')`
  ]) await deny('anon',null,sql);
  await deny('authenticated',buyer,`select public.push_commission_notification('${other}','test','test','test',null)`);
  await deny('authenticated',null,`select public.submit_artist_application('Artist test','An introduction with enough characters')`);
  const publicHelpers=await as('anon',null,`select public.is_admin() as admin,public.can_read_shop_order(gen_random_uuid()) as can_read`);
  assert.deepEqual(publicHelpers.rows,[{admin:false,can_read:false}]);passed++;
  assert.equal((await as('authenticated',buyer,`select id from public.profiles`)).rows.length,1);passed++;
  const char=(await as('authenticated',buyer,`insert into public.characters(owner_id,name,summary,profile) values ('${buyer}','Original','summary','{}') returning id`)).rows[0].id;
  assert.equal((await as('authenticated',other,`select id from public.characters where id='${char}'`)).rows.length,0);passed++;
  assert.equal((await as('authenticated',other,`update public.characters set name='stolen' where id='${char}' returning id`)).rows.length,0);passed++;
  assert.equal((await as('authenticated',buyer,`update public.characters set name='Updated' where id='${char}' returning name`)).rows[0].name,'Updated');passed++;
  // Fulfillment still works for the buyer and rejects an unrelated authenticated user.
  const order=(await db.query(`insert into public.shop_orders(buyer_id,amount,payment_status,fulfillment_status) values ('${buyer}',10,'paid','delivered') returning id`)).rows[0].id;
  await deny('authenticated',other,`select public.advance_shop_order('${order}','received')`);
  await as('authenticated',buyer,`select public.advance_shop_order('${order}','received')`);passed++;
  assert.equal((await db.query(`select fulfillment_status from public.shop_orders where id='${order}'`)).rows[0].fulfillment_status,'completed');passed++;
  for (const sql of [
    `select public.simulate_point_purchase('basic_monthly')`,
    `select public.simulate_commission_deposit(gen_random_uuid())`,
    `select public.simulate_commission_balance(gen_random_uuid())`,
    `select public.checkout_shop_cart()`,
    `select public.checkout_shop_cart_with_address(null)`,
    `select public.checkout_single_product(gen_random_uuid(),1,null)`,
    `select public.unlock_portfolio(gen_random_uuid())`
  ]) await deny('authenticated',buyer,sql,/收款服务尚未开放/);
  await deny('authenticated',admin,`select public.advance_shop_order('${order}','refund')`,/退款服务尚未开放/);
  assert.equal((await db.query(`select point_balance from public.profiles where id='${buyer}'`)).rows[0].point_balance,120);passed++;
  // Favorites are durable database records visible only to their owner.
  const service=(await db.query(`insert into public.artist_services(artist_id,title,description,service_type,base_price,delivery_days) values('${artist}','Test service','Test description','OC',10,7) returning id`)).rows[0].id;
  await as('authenticated',buyer,`insert into public.service_favorites(user_id,service_id) values('${buyer}','${service}')`);
  assert.equal((await as('authenticated',buyer,`select * from public.service_favorites`)).rows.length,1);passed++;
  assert.equal((await as('authenticated',other,`select * from public.service_favorites`)).rows.length,0);passed++;
  await deny('authenticated',other,`insert into public.service_favorites(user_id,service_id) values('${buyer}','${service}')`);
  await deny('anon',null,`select * from public.service_favorites`);
  // Draft -> approval -> final -> revision -> final resubmission -> approval.
  const request=(await db.query(`insert into public.commission_requests(client_id,service_id,title,brief) values('${buyer}','${service}','Test request','A detailed test brief') returning id`)).rows[0].id;
  const commission=(await db.query(`insert into public.commission_orders(request_id,client_id,artist_id,status,deposit_status) values('${request}','${buyer}','${artist}','in_progress','paid') returning id`)).rows[0].id;
  const file=`${artist}/${commission}/final.png`;
  await deny('authenticated',other,`select public.submit_commission_delivery('${commission}','draft','An original draft','{}')`);
  await deny('authenticated',artist,`insert into public.order_deliveries(order_id,submitted_by,kind,note) values('${commission}','${artist}','final','bypass')`);
  await deny('authenticated',buyer,`insert into storage.objects(bucket_id,name) values('commission-files','${buyer}/${commission}/foreign.png')`);
  await as('authenticated',artist,`insert into storage.objects(bucket_id,name) values('commission-files','${file}')`);passed++;
  assert.equal((await as('authenticated',other,`select * from storage.objects where name='${file}'`)).rows.length,0);passed++;
  const draft=(await as('authenticated',artist,`select public.submit_commission_delivery('${commission}','draft','Draft for client approval','{}') as id`)).rows[0].id;
  await as('authenticated',buyer,`select public.review_commission_delivery('${draft}','approved','Looks good')`);passed++;
  await deny('authenticated',artist,`select public.submit_commission_delivery('${commission}','final','Final artwork ready')`,/final delivery requires a file/);
  await deny('authenticated',artist,`select public.submit_commission_delivery('${commission}','final','Final artwork ready',array['${artist}/${commission}/missing.png'])`,/invalid delivery file/);
  await deny('authenticated',artist,`select public.submit_commission_delivery('${commission}','final','Final artwork ready',array[null]::text[])`,/invalid delivery file/);
  const final=(await as('authenticated',artist,`select public.submit_commission_delivery('${commission}','final','Final artwork ready',array['${file}']) as id`)).rows[0].id;
  assert.equal((await as('authenticated',buyer,`select * from storage.objects where name='${file}'`)).rows.length,1);passed++;
  assert.equal((await as('authenticated',other,`select * from storage.objects where name='${file}'`)).rows.length,0);passed++;
  assert.equal((await as('authenticated',artist,`delete from storage.objects where name='${file}' returning id`)).rows.length,0);passed++;
  assert.equal((await as('authenticated',artist,`update storage.objects set metadata='{}' where name='${file}' returning id`)).rows.length,0);passed++;
  await as('authenticated',buyer,`select public.review_commission_delivery('${final}','revision_requested','Please adjust the color')`);passed++;
  await deny('authenticated',artist,`select public.submit_commission_delivery('${commission}','draft','Wrong revision kind','{}')`,/resubmit the requested delivery kind/);
  const revised=(await as('authenticated',artist,`select public.submit_commission_delivery('${commission}','final','Revised final artwork',array['${file}']) as id`)).rows[0].id;
  await as('authenticated',buyer,`select public.review_commission_delivery('${revised}','approved','Approved final')`);passed++;
  assert.equal((await db.query(`select status,revision_used from public.commission_orders where id='${commission}'`)).rows[0].status,'pending_balance');passed++;
  await deny('authenticated',buyer,`select public.review_commission_delivery('${revised}','revision_requested','Duplicate review')`,/delivery already reviewed/);
  await db.exec(`update public.profiles set account_status='suspended' where id in ('${buyer}','${admin}')`);
  assert.equal((await as('authenticated',buyer,`select id from public.characters`)).rows.length,0);passed++;
  await deny('authenticated',buyer,`insert into public.characters(owner_id,name,summary,profile) values ('${buyer}','blocked','blocked','{}')`);
  await deny('authenticated',buyer,`select public.set_cart_quantity(gen_random_uuid(),1)`);
  assert.equal((await as('authenticated',admin,`select public.is_admin() as result`)).rows[0].result,false);passed++;
  await deny('authenticated',admin,`select public.admin_manage_user('${other}','admin','active','test change reason')`);
  await db.exec(`update public.profiles set account_status='suspended' where id='${artist}'`);
  assert.equal((await as('authenticated',artist,`select * from public.get_public_commission_market()`)).rows.length,0);passed++;
  const helpers=(await db.query(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'execute') order by p.proname`)).rows.map(x=>x.proname);
  assert.deepEqual(helpers,['can_access_shop_delivery','can_read_shop_order','is_admin']);passed++;
  console.log(`Security regression passed: ${passed} checks; all migrations replayed on isolated PostgreSQL.`);
}
try { await main(); } catch(e) { console.error(e.message); process.exitCode=1; } finally { await db.close(); }
