/** Public, non-secret build identifier used to invalidate persisted client data. */
export const APP_BUILD_VERSION =
  process.env.NEXT_PUBLIC_BUILD_VERSION ?? "development";
