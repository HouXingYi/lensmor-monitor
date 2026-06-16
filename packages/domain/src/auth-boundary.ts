export interface SessionPrincipal {
  userId: string;
  email: string;
}

export interface OwnedResource {
  ownerId: string;
}

export function assertAuthenticated(
  principal: SessionPrincipal | null | undefined,
): asserts principal is SessionPrincipal {
  if (!principal) {
    throw new Error("Authentication required");
  }
}

export function canAccessOwnedResource(
  principal: SessionPrincipal | null | undefined,
  resource: OwnedResource,
): boolean {
  return Boolean(principal && principal.userId === resource.ownerId);
}
