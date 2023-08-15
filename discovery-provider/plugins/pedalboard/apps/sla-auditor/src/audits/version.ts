import semver from "semver";
import { SlashProposalParams } from "../proposal";
import { Node } from "../audit";
import * as knex from "knex";
import { VERSION_DATA_TABLE_NAME, VersionData } from "../db";

const SLASH_AMOUNT = 3000;
const SLASH_AMOUNT_WEI = SLASH_AMOUNT * 1_000_000_000_000_000_000;
const TIME_RANGE = 24 * 60 * 60 * 1000;

type AuditResponse = {
  failedAudit: boolean;
  data: VersionData;
};

const getVersionData = async (
  node: Node,
  minVersions: { "discovery-node": string; "content-node": string }
): Promise<VersionData> => {
  try {
    // @ts-ignore: fetch defined in node 18
    const res = await fetch(`${node.endpoint}/health_check`);
    const json: {
      data: { version: string; service: "discovery-node" | "content-node" };
    } = (await res.json()) as any;
    const nodeVersion = json.data.version;
    const nodeServiceType = json.data.service;

    const minVersion = minVersions[nodeServiceType];

    const nodeMajorVersion = semver.major(nodeVersion);
    const nodeMinorVersion = semver.minor(nodeVersion);

    const minMajorVersion = semver.major(minVersion);
    const minMinorVersion = semver.minor(minVersion);

    const isMajorVersionBehind = nodeMajorVersion < minMajorVersion;
    const isMinorVersionBehind =
      nodeMajorVersion === minMajorVersion &&
      nodeMinorVersion < minMinorVersion;

    const ok = !isMajorVersionBehind && !isMinorVersionBehind;

    return {
      nodeEndpoint: node.endpoint,
      nodeVersion,
      minVersion,
      owner: node.owner,
      ok,
    };
  } catch (e) {
    console.log(`Caught error ${e} making request to ${node.endpoint}`);
    return {
      nodeEndpoint: node.endpoint,
      nodeVersion: "",
      minVersion: "",
      owner: node.owner,
      ok: false,
    };
  }
};

const writeVersionData = async (db: knex.Knex, versionData: VersionData[]) => {
  await db(VERSION_DATA_TABLE_NAME).insert(versionData);
};

const formatProposal = (auditResponse: AuditResponse): SlashProposalParams => {
  const { nodeEndpoint, owner, nodeVersion, minVersion } = auditResponse.data!;
  return {
    amountWei: SLASH_AMOUNT_WEI,
    title: `[SLA] Slash ${SLASH_AMOUNT} $AUDIO from ${owner}`,
    description: `
This proposal presents recommendation to the community to slash ${SLASH_AMOUNT} $AUDIO from\n
${owner}\n
for failure to comply with latest chain versions.

SLA: https://docs.audius.org/token/running-a-node/sla#1-minimum-version-guarantee\n
Endpoint: ${nodeEndpoint}\n
Node version: ${nodeVersion}\n
Minimum required version: ${minVersion}\n
`,
    owner,
  };
};

const audit = async (
  db: knex.Knex,
  versionData: VersionData
): Promise<AuditResponse> => {
  const now = new Date();
  const before = new Date(now.getTime() - TIME_RANGE);

  // Find out if this node was ever ok during the entire range we care about.
  // If so, we ca
  const row = await db(VERSION_DATA_TABLE_NAME)
    .select("ok")
    .where("nodeEndpoint", versionData.nodeEndpoint)
    .andWhere("timestamp", ">=", before)
    .andWhere("timestamp", "<=", now)
    .andWhere("ok", true)
    .first();

  const failedAudit = !row;
  return {
    failedAudit,
    data: versionData,
  };
};

export const auditVersions = async (
  db: knex.Knex,
  nodes: Node[],
  minVersions: { "discovery-node": string; "content-node": string }
) => {
  const versionData = await Promise.all(
    nodes.map(async (node) => getVersionData(node, minVersions))
  );
  await writeVersionData(db, versionData);

  const auditResponses = await Promise.all(
    versionData.map(async (data) => audit(db, data))
  );

  for (const audit of auditResponses) {
    const status = audit.failedAudit ? "[FAILED]" : "[PASS]";
    console.log(
      `${status} ${audit.data?.nodeEndpoint} has version ${audit.data?.nodeVersion}, min version: ${audit.data?.minVersion}`
    );
  }

  const failedAudits = auditResponses.filter(
    (auditResponse) => auditResponse.failedAudit
  );

  const proposals = failedAudits.map((failedAudit) =>
    formatProposal(failedAudit)
  );

  return proposals;
};
