import type { Role } from '../../api/types';

/*
 * What each role may change, as the spec's Role states it; the pages offer only the changes the signed-in member's role
 * allows, and the API refuses the rest.
 */

/** Whether a role may draft, publish and restore releases and draft and review reports. */
export function mayEdit(role: Role): boolean {
  return role !== 'viewer';
}

/** Whether a role may manage the members and the settings. */
export function mayAdminister(role: Role): boolean {
  return role === 'admin';
}
