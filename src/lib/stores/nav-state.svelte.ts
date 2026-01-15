import { getContext, setContext } from "svelte";
import { IsMobile } from "$lib/hooks/is-mobile.svelte";

const NAV_KEY = Symbol("NAV");

export class NavState {
  isSidebarOpen = $state(true);
  isAuthOpen = $state(false);
  isMobile = new IsMobile();

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  setSidebarOpen(open: boolean) {
    this.isSidebarOpen = open;
  }

  toggleAuth(open?: boolean) {
    this.isAuthOpen = open ?? !this.isAuthOpen;
  }

  get state() {
    // Return a shape compatible with SidebarProvider if needed,
    // or just expose the class itself.
    return {
      open: this.isSidebarOpen,
      isMobile: this.isMobile.current,
      setOpen: (open: boolean) => this.setSidebarOpen(open),
      toggle: () => this.toggleSidebar(),
    };
  }
}

export function setNavState() {
  const navState = new NavState();
  setContext(NAV_KEY, navState);
  return navState;
}

export function useNav() {
  return getContext<NavState>(NAV_KEY);
}
