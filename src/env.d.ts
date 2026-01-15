// SvelteKit Environment Variable Declarations
declare module "$env/static/private" {
  export const WORKOS_API_KEY: string;
  export const WORKOS_CLIENT_ID: string;
  export const WORKOS_COOKIE_PASSWORD: string;
  export const WORKOS_REDIRECT_URI: string;
  export const POLAR_ACCESS_TOKEN: string;
  export const POLAR_SERVER: string;
  export const POLAR_SUCCESS_URL: string;
  export const POLAR_WEBHOOK_SECRET: string;
}

declare module "$env/static/public" {
  export const PUBLIC_CONVEX_URL: string;
  export const PUBLIC_APP_URL: string;
}

declare module "$env/dynamic/private" {
  export const env: Record<string, string | undefined>;
}
