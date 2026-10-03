import { notFound } from "next/navigation";

// Unknown paths fall here so the 404 renders inside the [lang] layout, in the right language.
export default function CatchAll() {
  notFound();
}
