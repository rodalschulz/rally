import { cache } from "react";
import { auth as nextAuth } from "@/auth";

/** Dedupes `auth()` within a single RSC request. */
export const getSession = cache(() => nextAuth());
