// In-app auto-update (Tauri updater + process plugins).
//
// The `Update` object returned by `check()` carries methods (downloadAndInstall),
// so it can't live in the Zustand store. We hold it here and expose only the
// serializable version to the store — mirroring the outputBus pattern.

import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

let pending: Update | null = null;

export interface UpdateInfo {
  version: string;
}

/** Check the configured endpoint for a newer published release. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const update = await check();
  pending = update;
  return update ? { version: update.version } : null;
}

/** Download + install the pending update, then relaunch into the new version. */
export async function downloadAndRelaunch(): Promise<void> {
  if (!pending) throw new Error("no pending update");
  await pending.downloadAndInstall();
  await relaunch();
}
