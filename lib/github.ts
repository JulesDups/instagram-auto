import "server-only";

export interface GitHubFile {
  content: string; // UTF-8 décodé
  sha: string; // requis pour PUT (mise à jour)
}

/**
 * Lit un fichier depuis le repo GitHub configuré.
 * Retourne null si le fichier n'existe pas (404).
 * Retente jusqu'à maxRetries fois avec un délai de retryDelayMs entre chaque tentative.
 * Utile car GitHub peut déclencher le webhook avant que la réplication soit complète.
 */
export async function readGitHubFile(
  path: string,
  token: string,
  repo: string,
  {
    maxRetries = 1,
    retryDelayMs = 0,
  }: { maxRetries?: number; retryDelayMs?: number } = {},
): Promise<GitHubFile | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0 && retryDelayMs > 0) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }

    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      },
    );

    if (res.status === 404) {
      if (attempt < maxRetries) continue; // retente si fichier absent (réplication en cours)
      return null;
    }
    if (!res.ok) {
      throw new Error(
        `GitHub readFile ${path}: ${res.status} ${await res.text()}`,
      );
    }

    const data = (await res.json()) as { content: string; sha: string };
    const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString(
      "utf-8",
    );
    return { content, sha: data.sha };
  }
  // Unreachable: the loop always returns inside (success or last-attempt 404).
  // Only reachable if maxRetries < 0, which the caller should never pass.
  /* c8 ignore next */
  return null;
}

/**
 * Crée ou met à jour un fichier dans le repo GitHub.
 * Si le fichier existe déjà, son SHA doit être fourni (sinon GitHub retourne 409).
 */
export async function writeGitHubFile(
  path: string,
  content: string,
  commitMessage: string,
  token: string,
  repo: string,
  existingSha?: string,
): Promise<void> {
  const body: Record<string, string> = {
    message: commitMessage,
    content: Buffer.from(content, "utf-8").toString("base64"),
  };
  if (existingSha) body.sha = existingSha;

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    throw new Error(
      `GitHub writeFile ${path}: ${res.status} ${await res.text()}`,
    );
  }
}

/**
 * Vérifie la signature HMAC SHA-256 d'un webhook GitHub.
 * Header attendu : X-Hub-Signature-256: sha256=<hex>
 * Lance une erreur si la signature est absente ou invalide.
 * Utilise une comparaison en temps constant pour prévenir les timing attacks.
 */
export async function verifyGitHubWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<void> {
  if (!signatureHeader?.startsWith("sha256=")) {
    throw new Error("Missing or malformed X-Hub-Signature-256 header");
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = "sha256=" + Buffer.from(sig).toString("hex");

  // Comparaison en temps constant (évite les attaques par timing)
  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(signatureHeader, "utf-8");
  if (a.length !== b.length) throw new Error("Invalid webhook signature");
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) throw new Error("Invalid webhook signature");
}
