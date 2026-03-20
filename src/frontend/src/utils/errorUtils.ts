/**
 * Extracts a human-readable error message from an ICP rejection, network error,
 * or any unknown thrown value.
 */
export function extractErrorMessage(err: unknown): string {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const msg = err.message;
    // ICP canister rejection messages are nested like: "Call failed ... Reject message: ..."
    const rejectMatch = msg.match(/Reject message:\s*(.+?)(?:\n|$)/i);
    if (rejectMatch) return rejectMatch[1].trim();
    // Motoko Runtime.trap messages come through as: "... trapped: ..."
    const trapMatch = msg.match(/trapped:\s*(.+?)(?:\n|$)/i);
    if (trapMatch) return trapMatch[1].trim();
    if (msg) return msg;
  }
  if (typeof err === "object" && err !== null) {
    const anyErr = err as Record<string, unknown>;
    if (typeof anyErr.message === "string") return anyErr.message;
    if (typeof anyErr.details === "string") return anyErr.details;
  }
  return "An unexpected error occurred. Please try again.";
}
