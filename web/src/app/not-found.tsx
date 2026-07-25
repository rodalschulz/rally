import { redirect } from "next/navigation";

/** Unknown routes (and deleted resources that call notFound) go home. */
export default function NotFound() {
  redirect("/");
}
