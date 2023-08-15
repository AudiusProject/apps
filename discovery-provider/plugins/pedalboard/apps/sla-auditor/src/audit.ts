import { auditVersions } from "./audits/version";
import { SharedData } from "./config";
import { propose } from "./proposal";
import App from "basekit/src/app";

export type Node = {
  delegateOwnerWallet: string;
  endpoint: string;
  owner: string;
  spID: number;
  type: string;
};

export const audit = async (app: App<SharedData>) => {
  const { libs } = app.viewAppData();
  const discoveryNodes: Node[] =
    (await libs.ServiceProvider?.listDiscoveryProviders()) ?? [];
  const contentNodes: Node[] =
    (await libs.ServiceProvider?.listCreatorNodes()) ?? [];

  const minVersions: { "discovery-node": string; "content-node": string } =
    ((await libs.ethContracts?.getExpectedServiceVersions()) ?? {}) as {
      "discovery-node": string;
      "content-node": string;
    };

  const nodes = [...discoveryNodes, ...contentNodes];

  const proposals = await auditVersions(nodes, minVersions);

  for (const proposal of proposals) {
    await propose(app, proposal);
  }
};
