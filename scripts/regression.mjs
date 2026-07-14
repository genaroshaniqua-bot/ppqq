import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";

async function request(path) {
  return fetch(new URL(path, baseUrl), { redirect: "manual" });
}

async function expectRedirectToLogin(path) {
  const response = await request(path);
  assert.ok([302, 303, 307, 308].includes(response.status), `${path} 应重定向，实际为 ${response.status}`);
  const location = response.headers.get("location") ?? "";
  assert.ok(location.includes("/login"), `${path} 应重定向到登录页，实际为 ${location}`);
  return `${path} → 登录守卫正常`;
}

async function run() {
  const results = [];
  const login = await request("/login");
  assert.equal(login.status, 200, `/login 应返回 200，实际为 ${login.status}`);
  results.push("/login → 200");

  for (const path of ["/home", "/commissions", "/market", "/profile", "/artist", "/admin"]) {
    results.push(await expectRedirectToLogin(path));
  }

  const publicArtist = await request("/artists/00000000-0000-0000-0000-000000000000");
  assert.equal(publicArtist.status, 404, `公开画师不存在时应返回 404，实际为 ${publicArtist.status}`);
  results.push("/artists/[id] → 公开路由可访问并正确返回 404");

  console.log(`OC Forge 回归测试通过（${results.length} 项）`);
  for (const result of results) console.log(`✓ ${result}`);
}

run().catch((error) => {
  console.error("OC Forge 回归测试失败");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
