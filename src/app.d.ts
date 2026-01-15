// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: any | null;
      auth: {
        user: any;
        sessionId: string;
        accessToken?: string;
      } | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

declare module "svelte/elements" {
  export interface HTMLAttributes<T> {
    [key: string]: any;
  }
}

export {};
