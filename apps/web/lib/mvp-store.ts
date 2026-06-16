export type CompetitorStatus = "monitoring" | "paused" | "collecting";

export interface ProductProfile {
  ownerId: string;
  role: string;
  product: {
    name: string;
    url: string;
    oneLineDescription: string;
    targetAudience: string;
    coreSellingPoints: string;
    competitiveEdge: string;
    strategicGoal: string;
  };
}

export interface CompetitorLink {
  label: string;
  url: string;
}

export interface CompetitorRecord {
  id: string;
  ownerId: string;
  name: string;
  mainDomain: string;
  logoUrl?: string;
  status: CompetitorStatus;
  links: CompetitorLink[];
}

const productProfiles = new Map<string, ProductProfile>();
const competitors = new Map<string, CompetitorRecord>();

export function resetMvpStore(): void {
  productProfiles.clear();
  competitors.clear();
}

export function saveProductProfile(profile: ProductProfile): ProductProfile {
  productProfiles.set(profile.ownerId, profile);
  return profile;
}

export function getProductProfile(ownerId: string): ProductProfile | undefined {
  return productProfiles.get(ownerId);
}

export function createCompetitor(
  ownerId: string,
  input: Omit<CompetitorRecord, "id" | "ownerId" | "status"> & { status?: CompetitorStatus },
): CompetitorRecord {
  if (input.links.length > 10) {
    throw new Error("A competitor can have at most 10 associated links");
  }

  const competitor: CompetitorRecord = {
    id: crypto.randomUUID(),
    ownerId,
    name: input.name,
    mainDomain: input.mainDomain,
    ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
    status: input.status ?? "monitoring",
    links: input.links,
  };
  competitors.set(competitor.id, competitor);
  return competitor;
}

export function listCompetitors(ownerId: string): CompetitorRecord[] {
  return Array.from(competitors.values()).filter((competitor) => competitor.ownerId === ownerId);
}

export function getCompetitor(ownerId: string, id: string): CompetitorRecord | undefined {
  const competitor = competitors.get(id);
  if (!competitor || competitor.ownerId !== ownerId) return undefined;
  return competitor;
}

export function updateCompetitor(
  ownerId: string,
  id: string,
  patch: Partial<Omit<CompetitorRecord, "id" | "ownerId">>,
): CompetitorRecord | undefined {
  const competitor = getCompetitor(ownerId, id);
  if (!competitor) return undefined;

  const nextLinks = patch.links ?? competitor.links;
  if (nextLinks.length > 10) {
    throw new Error("A competitor can have at most 10 associated links");
  }

  const next: CompetitorRecord = {
    ...competitor,
    ...patch,
    links: nextLinks,
  };
  competitors.set(id, next);
  return next;
}

export function deleteCompetitor(ownerId: string, id: string): boolean {
  const competitor = getCompetitor(ownerId, id);
  if (!competitor) return false;
  competitors.delete(id);
  return true;
}
