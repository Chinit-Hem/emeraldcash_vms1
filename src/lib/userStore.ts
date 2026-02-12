import type { Role } from "./types";

export type StoredUser = {
  username: string;
  role: Role;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
};

export type PublicUser = Omit<StoredUser, "passwordHash">;

export type CreateUserErrorCode =
  | "invalid_username"
  | "invalid_password"
  | "invalid_role"
  | "already_exists";

export type CreateUserResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: string; code: CreateUserErrorCode };

export type DeleteUserErrorCode =
  | "invalid_username"
  | "not_found"
  | "self_delete_forbidden"
  | "last_admin_forbidden";

export type DeleteUserResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: string; code: DeleteUserErrorCode };

type UserSeed = {
  username: string;
  role: Role;
  passwordHash: string;
};

const DEMO_PASSWORD_HASH = "$2b$10$mc.blHBFe/9vs2VJMG/Dqe7PlwgrQAlnPUmNJ0bXIaQFnnSnarmvy"; // 1234
const USERNAME_REGEX = /^[a-z0-9._-]{3,32}$/;

declare global {
  // eslint-disable-next-line no-var
  var __ecvmsUserStore: Map<string, StoredUser> | undefined;
  // eslint-disable-next-line no-var
  var __ecvmsUserStoreReady: boolean | undefined;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function sanitizeRole(role: unknown): Role {
  return role === "Admin" ? "Admin" : "Staff";
}

function publicUserFromStored(user: StoredUser): PublicUser {
  return {
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    createdBy: user.createdBy,
  };
}

function ensureStore(): Map<string, StoredUser> {
  if (!globalThis.__ecvmsUserStore || !globalThis.__ecvmsUserStoreReady) {
    const store = new Map<string, StoredUser>();
    const loadedFromJson = loadUsersFromJsonEnv(store);
    const loadedFromLegacyEnv = loadUsersFromLegacyEnv(store);

    if (!loadedFromJson && !loadedFromLegacyEnv) {
      seedUsers(
        store,
        [
          { username: "admin", role: "Admin", passwordHash: DEMO_PASSWORD_HASH },
          { username: "staff", role: "Staff", passwordHash: DEMO_PASSWORD_HASH },
        ],
        "system"
      );
    }

    globalThis.__ecvmsUserStore = store;
    globalThis.__ecvmsUserStoreReady = true;
  }

  return globalThis.__ecvmsUserStore;
}

function seedUsers(store: Map<string, StoredUser>, seeds: UserSeed[], createdBy: string): void {
  const now = Date.now();
  for (const seed of seeds) {
    const username = normalizeUsername(seed.username);
    if (!USERNAME_REGEX.test(username) || !seed.passwordHash) continue;
    if (store.has(username)) continue;

    store.set(username, {
      username,
      role: sanitizeRole(seed.role),
      passwordHash: String(seed.passwordHash),
      createdAt: now,
      updatedAt: now,
      createdBy,
    });
  }
}

function loadUsersFromLegacyEnv(store: Map<string, StoredUser>): boolean {
  const seeds: UserSeed[] = [];
  const adminUsername = normalizeUsername(process.env.ADMIN_USERNAME || "admin");
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (adminPasswordHash) {
    seeds.push({ username: adminUsername, role: "Admin", passwordHash: adminPasswordHash });
  }

  const staffUsername = normalizeUsername(process.env.STAFF_USERNAME || "staff");
  const staffPasswordHash = process.env.STAFF_PASSWORD_HASH?.trim();
  if (staffPasswordHash) {
    seeds.push({ username: staffUsername, role: "Staff", passwordHash: staffPasswordHash });
  }

  if (seeds.length === 0) return false;
  seedUsers(store, seeds, "env");
  return true;
}

function loadUsersFromJsonEnv(store: Map<string, StoredUser>): boolean {
  const raw = process.env.AUTH_USERS_JSON?.trim();
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return false;

    const seeds: UserSeed[] = [];
    for (const value of parsed) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const username = typeof row.username === "string" ? row.username : "";
      const passwordHash = typeof row.passwordHash === "string" ? row.passwordHash : "";
      const role = sanitizeRole(row.role);
      if (!username || !passwordHash) continue;
      seeds.push({ username, passwordHash, role });
    }

    if (seeds.length === 0) return false;
    seedUsers(store, seeds, "env");
    return true;
  } catch (error) {
    console.error("[USER_STORE] Invalid AUTH_USERS_JSON:", error);
    return false;
  }
}

function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);
  if (!normalized) return "Username is required";
  if (!USERNAME_REGEX.test(normalized)) {
    return "Username must be 3-32 chars, lowercase letters, numbers, dot, dash, underscore only";
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 4) return "Password must be at least 4 characters";
  if (password.length > 72) return "Password must be 72 characters or less";
  return null;
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}

export function listUsers(): PublicUser[] {
  return Array.from(ensureStore().values())
    .map(publicUserFromStored)
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<PublicUser | null> {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;
  const user = ensureStore().get(normalized);
  if (!user) return null;

  const passwordOk = await comparePassword(password, user.passwordHash);
  if (!passwordOk) return null;

  return publicUserFromStored(user);
}

export async function createUser(params: {
  username: string;
  password: string;
  role: Role;
  createdBy: string;
}): Promise<CreateUserResult> {
  const usernameError = validateUsername(params.username);
  if (usernameError) {
    return { ok: false, error: usernameError, code: "invalid_username" };
  }

  const passwordError = validatePassword(params.password);
  if (passwordError) {
    return { ok: false, error: passwordError, code: "invalid_password" };
  }

  const role = sanitizeRole(params.role);
  if (role !== "Admin" && role !== "Staff") {
    return { ok: false, error: "Invalid role", code: "invalid_role" };
  }

  const username = normalizeUsername(params.username);
  const store = ensureStore();
  if (store.has(username)) {
    return { ok: false, error: "Username already exists", code: "already_exists" };
  }

  const now = Date.now();
  const passwordHash = await hashPassword(params.password);
  const createdBy = normalizeUsername(params.createdBy) || "admin";
  const user: StoredUser = {
    username,
    role,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  store.set(username, user);
  return { ok: true, user: publicUserFromStored(user) };
}

export async function verifyCurrentPassword(
  username: string,
  password: string
): Promise<boolean> {
  const normalized = normalizeUsername(username);
  const user = ensureStore().get(normalized);
  if (!user) return false;
  return comparePassword(password, user.passwordHash);
}

export async function updateUserPassword(
  username: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return { ok: false, error: passwordError };
  }

  const normalized = normalizeUsername(username);
  const store = ensureStore();
  const user = store.get(normalized);
  if (!user) return { ok: false, error: "User not found" };

  user.passwordHash = await hashPassword(newPassword);
  user.updatedAt = Date.now();
  store.set(normalized, user);
  return { ok: true };
}

export async function deleteUser(params: {
  username: string;
  requestedBy: string;
}): Promise<DeleteUserResult> {
  const usernameError = validateUsername(params.username);
  if (usernameError) {
    return { ok: false, error: usernameError, code: "invalid_username" };
  }

  const targetUsername = normalizeUsername(params.username);
  const requestedBy = normalizeUsername(params.requestedBy);
  if (targetUsername === requestedBy) {
    return { ok: false, error: "You cannot delete your own account", code: "self_delete_forbidden" };
  }

  const store = ensureStore();
  const existing = store.get(targetUsername);
  if (!existing) {
    return { ok: false, error: "User not found", code: "not_found" };
  }

  if (existing.role === "Admin") {
    const adminCount = Array.from(store.values()).filter((user) => user.role === "Admin").length;
    if (adminCount <= 1) {
      return { ok: false, error: "Cannot delete the last Admin account", code: "last_admin_forbidden" };
    }
  }

  store.delete(targetUsername);
  return { ok: true, user: publicUserFromStored(existing) };
}
