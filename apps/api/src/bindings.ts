import type { ApiEnv } from "@dpmedia/infra/alchemy.run";
export type Bindings = ApiEnv;
export interface AuthContext {
  userId: string;
  roles: string[];
  name: string;
  email: string;
  image: string | null;
}
export interface AppEnv {
  Bindings: Bindings;
  Variables: { auth: AuthContext | null };
}
