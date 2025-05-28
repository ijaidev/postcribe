import type { auth } from "@repo/auth";
import { createFactory } from "hono/factory";

interface Variables {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
}

interface Env {
    Variables: Variables;
}

const factory = createFactory<Env>();

export default factory;
