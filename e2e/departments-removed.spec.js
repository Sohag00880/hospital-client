const { test, expect } = require("@playwright/test");
test("department navigation and user membership controls are removed, including with stale grants", async ({ page }) => {
  const id = "11111111-1111-4111-8111-111111111111", tenantId = "22222222-2222-4222-8222-222222222222", requests = []; let inviteBody;
  const user = { id, tenantId, loginId: "D12345", firstName: "Test", lastName: "Doctor", fullName: "Test Doctor", email: null, status: "active", createdAt: "2026-01-01T00:00:00Z", roles: [{ roleSlug: "doctor", roleName: "Doctor", roleId: id, userRoleId: id }] };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, ""); requests.push(path);
    const send = (data) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (path.startsWith("/auth/")) return send({ user, accessToken: "fixture", roles: ["tenant_admin"], permissions: ["user.view", "user.create", "user.update", "role.view", "department.view", "department.create"], isPlatformAdmin: false });
    if (path === "/branding/appearance") return send({ displayName: "Hospital" });
    if (path === "/users/invite") { inviteBody = request.postDataJSON(); return send({ user, generatedPassword: "Test12345!" }); }
    if (path === "/users") return send({ items: [user], total: 1 });
    if (path === `/users/${id}`) return send(user);
    if (path === "/roles") return send({ items: [{ id, slug: "doctor", name: "Doctor", permissionsScope: "self", allowedScopes: ["self"] }], total: 1 });
    return send(null);
  });
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Departments", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Invite User", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/department/i)).toHaveCount(0);
  await dialog.locator('input[name="firstName"]').fill("New Doctor");
  await dialog.getByRole("button", { name: "Create user", exact: true }).click();
  await expect(dialog.getByText(/User created/)).toBeVisible();
  expect(inviteBody).toEqual({ firstName: "New Doctor", lastName: "", phone: "", roleSlug: "doctor" });
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByTitle("Edit", { exact: true }).click(); dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Assign role", exact: true })).toBeVisible();
  await expect(dialog.getByText(/department/i)).toHaveCount(0);
  expect(requests.filter((path) => /department/i.test(path))).toEqual([]);
  const response = await page.goto("/departments"); expect(response.status()).toBe(404);
});
