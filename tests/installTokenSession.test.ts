import assert from "node:assert/strict";
import test from "node:test";

import { ClientTokenRequestError } from "../src/lib/clientToken.ts";
import {
  createInstallTokenSession,
  installCommandCopyAllowed,
} from "../src/lib/installTokenSession.ts";
import { omitClientTokenFromNode } from "../src/lib/clientToken.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function twoFactorRequired() {
  return new ClientTokenRequestError(401, "2FA code is required");
}

function twoFactorInvalid() {
  return new ClientTokenRequestError(401, "Invalid 2FA code");
}

test("closing the dialog aborts the in-flight token request", async () => {
  const pending = deferred<string>();
  let seenSignal: AbortSignal | undefined;
  const session = createInstallTokenSession((...params) => {
    seenSignal = params[1]?.signal;
    return pending.promise;
  });

  const pendingLoad = session.beginDeployTokenFetch("node-a");
  session.closeDialog();
  assert.equal(seenSignal?.aborted, true);
  pending.resolve("late-token");
  await pendingLoad;
  assert.equal(session.getSnapshot().token, null);
  assert.equal(installCommandCopyAllowed(session.getSnapshot()), false);
});

test("a 2FA response after the dialog is closed cannot write the token", async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  let calls = 0;
  const session = createInstallTokenSession(async () => {
    calls += 1;
    if (calls === 1) return first.promise;
    return second.promise;
  });

  const firstLoad = session.openDialog("node-a");
  first.reject(twoFactorRequired());
  await firstLoad;
  assert.equal(session.getSnapshot().twoFactorOpen, true);

  const secondLoad = session.submitTwoFactor("node-a", "123456");
  session.closeDialog();
  second.resolve("late-2fa-token");
  await secondLoad;
  assert.equal(session.getSnapshot().token, null);
  assert.equal(session.getSnapshot().twoFactorOpen, false);
  assert.equal(installCommandCopyAllowed(session.getSnapshot()), false);
});

test("switching nodes ignores the previous node's token response", async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  let calls = 0;
  const session = createInstallTokenSession(async () => {
    calls += 1;
    return calls === 1 ? first.promise : second.promise;
  });

  const firstLoad = session.openDialog("node-a");
  session.switchNode();
  const secondLoad = session.openDialog("node-b");
  first.resolve("token-a");
  await firstLoad;
  assert.equal(session.getSnapshot().token, null);

  second.resolve("token-b");
  await secondLoad;
  assert.equal(session.getSnapshot().token, "token-b");
  assert.equal(installCommandCopyAllowed(session.getSnapshot()), true);
});

test("an invalid 2FA code keeps the 2FA dialog open for another attempt", async () => {
  const session = createInstallTokenSession(async (_uuid, options) => {
    if (!options?.twoFactorCode) throw twoFactorRequired();
    if (options.twoFactorCode === "000000") throw twoFactorInvalid();
    return "ok-token";
  });

  await session.openDialog("node-a");
  assert.equal(session.getSnapshot().twoFactorOpen, true);

  await session.submitTwoFactor("node-a", "000000");
  assert.equal(session.getSnapshot().twoFactorOpen, true);
  assert.equal(session.getSnapshot().twoFactorInvalid, true);
  assert.equal(session.getSnapshot().error, null);
  assert.equal(session.getSnapshot().token, null);
  assert.equal(installCommandCopyAllowed(session.getSnapshot()), false);

  await session.submitTwoFactor("node-a", "654321");
  assert.equal(session.getSnapshot().token, "ok-token");
  assert.equal(session.getSnapshot().twoFactorOpen, false);
  assert.equal(session.getSnapshot().twoFactorInvalid, false);
  assert.equal(installCommandCopyAllowed(session.getSnapshot()), true);
});

test("a successful token load can generate and copy the install command", async () => {
  const session = createInstallTokenSession(async () => "install-token");
  await session.beginDeployTokenFetch("node-a");
  assert.equal(session.getSnapshot().token, "install-token");
  assert.equal(installCommandCopyAllowed(session.getSnapshot()), true);
  const fetches: string[] = [];
  const reuse = createInstallTokenSession(async (uuid) => {
    fetches.push(uuid);
    return `token-${uuid}`;
  });
  await reuse.beginDeployTokenFetch("node-a");
  await reuse.beginDeployTokenFetch("node-a");
  assert.deepEqual(fetches, ["node-a"]);
});

test("copy stays blocked when the token is missing, failed, or 2FA is cancelled", async () => {
  const session = createInstallTokenSession(async (_uuid, options) => {
    if (!options?.twoFactorCode) throw twoFactorRequired();
    throw new Error("network down");
  });

  assert.equal(installCommandCopyAllowed(session.getSnapshot()), false);

  await session.openDialog("node-a");
  assert.equal(session.getSnapshot().twoFactorOpen, true);
  session.cancelTwoFactor();
  assert.equal(session.getSnapshot().token, null);
  assert.equal(session.getSnapshot().twoFactorOpen, false);
  assert.equal(installCommandCopyAllowed(session.getSnapshot()), false);

  const failed = createInstallTokenSession(async () => {
    throw new Error("HTTP 500");
  });
  await failed.openDialog("node-a");
  assert.equal(failed.getSnapshot().error, "HTTP 500");
  assert.equal(failed.getSnapshot().twoFactorInvalid, false);
  assert.equal(installCommandCopyAllowed(failed.getSnapshot()), false);
});

test("omitting a client token copies the node and deletes the secret", () => {
  const node = {
    uuid: "node-1",
    name: "gateway",
    token: "keep-in-source",
  };
  const omitted = omitClientTokenFromNode(node);
  assert.equal(node.token, "keep-in-source");
  assert.equal(Object.hasOwn(omitted, "token"), false);
  assert.equal((omitted as { token?: string }).token, undefined);
});
