const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    "header": "eyJmaWQiOjM4MzQyMSwidHlwZSI6ImF1dGgiLCJrZXkiOiIweENCMjdlOTU1NTllYkM1QTEyNWY4NTAwQ0EyMTBkZUJCY2YyMGUxM2MifQ",
    "payload": "eyJkb21haW4iOiJmYXJxdWl6LXRhdS52ZXJjZWwuYXBwIn0",
    "signature": "w37N1nZL+Dorf9JN+54p8bxTWTELILl/J1EXDwZwHXttiopEA4Jr3qCnmXXqNkKgcPQqvdUhqfZSBOcvOXT/phs="
  },
  miniapp: {
    version: "1",
    name: "FarQuiz", 
    subtitle: "Your AI Ad Companion", 
    description: "Ads",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/quiz-logo.jpg`,
    splashImageUrl: `${ROOT_URL}/quiz-logo.jpg`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["marketing", "ads", "quickstart", "waitlist"],
    heroImageUrl: `${ROOT_URL}/quiz-logo.jpg`, 
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/quiz-logo.jpg`,
  },
} as const;

