import Root from "./drawer.svelte";
import Content from "./drawer-content.svelte";
import Description from "./drawer-description.svelte";
import Footer from "./drawer-footer.svelte";
import Header from "./drawer-header.svelte";
import Overlay from "./drawer-overlay.svelte";
import Title from "./drawer-title.svelte";
import Trigger from "./drawer-trigger.svelte";

const _Portal = Root; // Explicit export if needed

export {
	Root,
	Content,
	Description,
	Footer,
	Header,
	Overlay,
	Title,
	Trigger,
	//
	Root as Drawer,
	Content as DrawerContent,
	Description as DrawerDescription,
	Footer as DrawerFooter,
	Header as DrawerHeader,
	Overlay as DrawerOverlay,
	Title as DrawerTitle,
	Trigger as DrawerTrigger,
};
