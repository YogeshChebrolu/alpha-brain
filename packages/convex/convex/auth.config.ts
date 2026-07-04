// Tells Convex which JWT issuers to trust. For Convex Auth, the issuer is the
// deployment's own site URL (CONVEX_SITE_URL is injected by Convex at runtime).
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
