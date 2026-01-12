import { MediaQuery } from "svelte/reactivity";

const DEFAULT_MOBILE_BREAKPOINT = 768;

export class IsMobile extends MediaQuery {
	constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
		super(`max-width: ${breakpoint - 1}px`);
	}
}

/**
 * Creates a reactive mobile detection hook
 */
export function useIsMobile(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT): IsMobile {
	return new IsMobile(breakpoint);
}
