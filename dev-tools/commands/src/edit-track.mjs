import chalk from "chalk";
import { program } from "commander";

import { initializeAudiusLibs } from "./utils.mjs";

program.command("edit-track")
  .description("Update an existing track")
  .argument("<trackId>", "Id of track to update")
  .option("-t, --title <title>", "Title of track")
  .option("-a, --tags <tags>", "Tags of track")
  .option("-d, --description <description>", "Description of track")
  .option("-m, --mood <mood>", "Mood of track")
  .option("-g, --genre <genre>", "Genre of track")
  .option("-s, --preview-start-seconds <seconds>", "Track preview start time (seconds)", null)
  .option("-l, --license <license>", "License of track")
  .option("-f, --from <from>", "The account to edit the track from")
  .option("-p, --premium-conditions <premium conditions>", "The premium conditions object; sets track as premium", "")
  .action(async (trackId, { title, tags, description, mood, genre, previewStartSeconds, license, from, premiumConditions }) => {
    const audiusLibs = await initializeAudiusLibs(from);
    try {
      const track = (await audiusLibs.Track.getTracks(100, 0, [trackId]))[0]
      delete track.user
      console.log(chalk.yellow.bold("Track before update: "), track);

      const updatedMetadata = {
        ...track,
        title: title || track.title,
        tags: tags || track.tags,
        description: description || track.description,
        mood: mood || track.mood,
        genre: genre || track.genre,
        license: license || track.license,
        is_premium: premiumConditions ? true : track.is_premium,
        premium_conditions: premiumConditions ? JSON.parse(premiumConditions) : null,
        preview_start_seconds: previewStartSeconds
      }

      let transcodePreview = false
      if (previewStartSeconds && track.preview_start_seconds != previewStartSeconds) {
        // Transcode preview and write metadata to chain
        transcodePreview = true
      }
      const response = await audiusLibs.Track.updateTrackV2(updatedMetadata, transcodePreview)

      if (response.error) {
        program.error(chalk.red(response.error));
      }

      await new Promise(r => setTimeout(r, 2000));

      const updatedTrack = (await audiusLibs.Track.getTracks(100, 0, [trackId]))[0]
      delete updatedTrack.user
      console.log(chalk.green("Successfully updated track!"));
      console.log(chalk.yellow.bold("Track after update: "), updatedTrack);
    } catch (err) {
      program.error(err.message);
    }

    process.exit(0);
  });
