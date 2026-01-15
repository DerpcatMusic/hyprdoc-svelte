import { Dialog as BitsDialog } from "bits-ui";
import Root from "./dialog.svelte";
import Content from "./dialog-content.svelte";
import Description from "./dialog-description.svelte";
import Footer from "./dialog-footer.svelte";
import Header from "./dialog-header.svelte";
import Overlay from "./dialog-overlay.svelte";
import Title from "./dialog-title.svelte";
import Trigger from "./dialog-trigger.svelte";

const Close = BitsDialog.Close;
const Portal = BitsDialog.Portal;

export {
  Root,
  Content,
  Description,
  Footer,
  Header,
  Overlay,
  Title,
  Trigger,
  Close,
  Portal,
  //
  Root as Dialog,
  Content as DialogContent,
  Description as DialogDescription,
  Footer as DialogFooter,
  Header as DialogHeader,
  Overlay as DialogOverlay,
  Title as DialogTitle,
  Trigger as DialogTrigger,
  Close as DialogClose,
  Portal as DialogPortal,
};
