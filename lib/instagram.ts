import "server-only";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface InstagramAuth {
  igUserId: string;
  accessToken: string;
}

type ContainerStatus =
  | "IN_PROGRESS"
  | "FINISHED"
  | "ERROR"
  | "EXPIRED"
  | "PUBLISHED";

async function igPost(
  endpoint: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url, { method: "POST" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Instagram POST ${endpoint} failed (${res.status}): ${text}`,
    );
  }
  return JSON.parse(text);
}

async function igGet(
  endpoint: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Instagram GET ${endpoint} failed (${res.status}): ${text}`,
    );
  }
  return JSON.parse(text);
}

export async function createCarouselItem(
  auth: InstagramAuth,
  imageUrl: string,
): Promise<string> {
  const data = await igPost(`/${auth.igUserId}/media`, {
    image_url: imageUrl,
    is_carousel_item: "true",
    access_token: auth.accessToken,
  });
  return String(data.id);
}

export async function createCarouselContainer(
  auth: InstagramAuth,
  childrenIds: string[],
  caption: string,
): Promise<string> {
  const data = await igPost(`/${auth.igUserId}/media`, {
    media_type: "CAROUSEL",
    children: childrenIds.join(","),
    caption,
    access_token: auth.accessToken,
  });
  return String(data.id);
}

export async function publishCreation(
  auth: InstagramAuth,
  creationId: string,
): Promise<string> {
  const data = await igPost(`/${auth.igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: auth.accessToken,
  });
  return String(data.id);
}

export async function getContainerStatus(
  auth: InstagramAuth,
  containerId: string,
): Promise<ContainerStatus> {
  const data = await igGet(`/${containerId}`, {
    fields: "status_code",
    access_token: auth.accessToken,
  });
  return data.status_code as ContainerStatus;
}

async function waitForContainerReady(
  auth: InstagramAuth,
  containerId: string,
  timeoutMs = 90_000,
): Promise<void> {
  const start = Date.now();
  let delay = 1500;
  while (Date.now() - start < timeoutMs) {
    const status = await getContainerStatus(auth, containerId);
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(
        `Instagram container ${containerId} failed: ${status}`,
      );
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.3, 5000);
  }
  throw new Error(
    `Instagram container ${containerId} did not finish within ${timeoutMs}ms`,
  );
}

export interface PublishCarouselInput {
  auth: InstagramAuth;
  imageUrls: string[];
  caption: string;
}

export interface PublishCarouselResult {
  mediaId: string;
  childContainerIds: string[];
  parentContainerId: string;
}

export async function publishCarousel(
  input: PublishCarouselInput,
): Promise<PublishCarouselResult> {
  const { auth, imageUrls, caption } = input;

  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error(
      `Carousel must have between 2 and 10 images, got ${imageUrls.length}`,
    );
  }

  const childContainerIds: string[] = [];
  for (const url of imageUrls) {
    const id = await createCarouselItem(auth, url);
    childContainerIds.push(id);
  }

  for (const id of childContainerIds) {
    await waitForContainerReady(auth, id);
  }

  const parentContainerId = await createCarouselContainer(
    auth,
    childContainerIds,
    caption,
  );

  await waitForContainerReady(auth, parentContainerId);

  const mediaId = await publishCreation(auth, parentContainerId);

  return { mediaId, childContainerIds, parentContainerId };
}

export async function getPermalink(
  mediaId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const data = await igGet(`/${mediaId}`, {
      fields: "permalink",
      access_token: accessToken,
    });
    return typeof data.permalink === "string" ? data.permalink : null;
  } catch {
    return null;
  }
}
