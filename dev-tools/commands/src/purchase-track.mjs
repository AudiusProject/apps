import chalk from "chalk";
import { program } from "commander";

import { initializeAudiusLibs } from "./utils.mjs";

program
  .command("purchase-track")
  .description("Purchases a track using USDC")
  .argument("<trackId>", "The track to purchase")
  .requiredOption(
    "-f, --from <from>",
    "The account purchasing the track (handle)"
  )
  .action(async (trackId, { from }) => {
    const audiusLibs = await initializeAudiusLibs(from);
    const track = (await audiusLibs.Track.getTracks(100, 0, [trackId]))[0];
    if (!track.premium_conditions || !track.is_premium) {
      program.error("Track is not premium");
    }
    if (!track.premium_conditions?.usdc_purchase?.splits) {
      program.error("Track is not purchaseable");
    }

    try {
      const response = await audiusLibs.solanaWeb3Manager.purchaseContent({
        id: trackId,
        type: "track",
        blocknumber: track.blocknumber,
        splits: track.premium_conditions.usdc_purchase.splits,
      });
      if (response.error) {
        program.error(chalk.red(response.error));
      }
      console.log(chalk.green("Successfully purchased track"));
      console.log(chalk.yellow("Transaction Signature:"), response.res);
    } catch (err) {
      program.error(err.message);
    }

    process.exit(0);
  });
