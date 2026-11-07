import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "learn_explorer";
export default defineRailway(() => {
  const learn_explorer = service("learn_explorer", {
    source: github("apirak/learn_explorer", { branch: "main", checkSuites: false }),
    build: { buildCommand: "pnpm run build", buildEnvironment: "V3", builder: "railpack" },
    start: "cd build && node bin/server.js",
    healthcheck: "/health",
    healthcheckTimeout: 300,
    preDeploy: "cd build && node bin/console.js migration:run --force",
    replicas: { "us-west2": 1 },
    domains: [{ domain: "explorer.apirak.com", port: 3333 }],
    networking: { privateNetworkEndpoint: "learnexplorer" },
  });

  return project("Learn Explorer", {
    variables: { managed: false },
    resources: [learn_explorer],
  });
});

