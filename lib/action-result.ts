export type ActionStatus = "idle" | "success" | "error";

export interface ActionResult {
  status: ActionStatus;
  message: string;
  /** Timestamp used by clients to dedupe identical states. */
  at: number;
}

export const idleAction: ActionResult = {
  status: "idle",
  message: "",
  at: 0,
};

export function successAction(message: string): ActionResult {
  return { status: "success", message, at: Date.now() };
}

export function errorAction(message: string): ActionResult {
  return { status: "error", message, at: Date.now() };
}
