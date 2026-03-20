# OpenArticle Community / DevCommunity

## Current State
- Backend has `createArticle`, `updateArticle`, `deleteArticle`, `getAllArticles`, `getArticle` — all fully implemented with session validation and input guards.
- Frontend `CreateArticlePage` and `EditArticlePage` have input validation and loading states.
- `backendService.ts` uses `as any` casts for article methods even though they are already typed in `backend.d.ts`.
- All `catch` blocks in article pages show a hardcoded generic error string, hiding real backend error messages (e.g. session expiry, network failure, validation errors).
- No shared error-extraction utility exists.

## Requested Changes (Diff)

### Add
- `src/frontend/src/utils/errorUtils.ts` — helper `extractErrorMessage(err)` that pulls meaningful text from ICP rejection errors, network errors, and standard Error objects.

### Modify
- `backendService.ts` — remove `as any` casts on article methods; use properly typed actor.
- `CreateArticlePage.tsx` — replace generic catch message with `extractErrorMessage`; toast shows exact error (session expired, network failure, server message).
- `EditArticlePage.tsx` — same fix for save and load error paths.

### Remove
- Generic hardcoded failure strings in article pages ("Failed to publish article. Please try again.", "Failed to save changes.").

## Implementation Plan
1. Create `errorUtils.ts` with `extractErrorMessage(err: unknown): string`.
2. Update `backendService.ts` to drop `as any` for article calls.
3. Update `CreateArticlePage` catch block to use `extractErrorMessage`.
4. Update `EditArticlePage` catch block to use `extractErrorMessage`.
5. Validate and build.
