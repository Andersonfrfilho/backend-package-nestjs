import { SetMetadata } from "@nestjs/common";

export const ROLES_META_KEY = "roles";

export type RolesMode = "any" | "all";
export type RolesType = "realm" | "client" | "both";

export type RolesOptions = {
  roles: string[];
  mode?: RolesMode; // default: any
  type?: RolesType; // default: both
};

/**
 * Decorator to declare required roles for a route or controller.
 * Accepts either a list of strings or a single options object.
 * Examples:
 *  @Roles('admin')
 *  @Roles('admin','editor')
 *  @Roles(['admin','editor'])
 *  @Roles({ roles: ['a','b'], mode: 'all', type: 'client' })
 */
export function Roles(...args: Array<string | string[] | RolesOptions>) {
  let payload: RolesOptions;

  if (
    args.length === 1 &&
    typeof args[0] === "object" &&
    !Array.isArray(args[0])
  ) {
    payload = args[0] as RolesOptions;
  } else {
    // flatten strings/arrays into roles array
    const roles: string[] = ([] as string[]).concat(
      ...(args.map((a) => (Array.isArray(a) ? a : String(a))) as string[]),
    );
    payload = { roles };
  }

  // defaults
  payload.mode = payload.mode ?? "any";
  payload.type = payload.type ?? "both";

  return SetMetadata(ROLES_META_KEY, payload);
}

export default Roles;
