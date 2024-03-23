import mongoose from 'mongoose'

const genres = [
  'All Genres',
  'Electronic',
  'Rock',
  'Metal',
  'Alternative',
  'Hip-Hop/Rap',
  'Experimental',
  'Punk',
  'Folk',
  'Pop',
  'Ambient',
  'Soundtrack',
  'World',
  'Jazz',
  'Acoustic',
  'Funk',
  'R&B/Soul',
  'Devotional',
  'Classical',
  'Reggae',
  'Podcasts',
  'Country',
  'Spoken Word',
  'Comedy',
  'Blues',
  'Kids',
  'Audiobooks',
  'Latin',
  'Lo-Fi',
  'Hyperpop',
  'Techno',
  'Trap',
  'House',
  'Tech House',
  'Deep House',
  'Disco',
  'Electro',
  'Jungle',
  'Progressive House',
  'Hardstyle',
  'Glitch Hop',
  'Trance',
  'Future Bass',
  'Future House',
  'Tropical House',
  'Downtempo',
  'Drum & Bass',
  'Dubstep',
  'Jersey Club',
  'Vaporwave',
  'Moombahton',
]
const moods = [
  'Peaceful',
  'Romantic',
  'Sentimental',
  'Tender',
  'Easygoing',
  'Yearning',
  'Sophisticated',
  'Sensual',
  'Cool',
  'Gritty',
  'Melancholy',
  'Serious',
  'Brooding',
  'Fiery',
  'Defiant',
  'Aggressive',
  'Rowdy',
  'Excited',
  'Energizing',
  'Empowering',
  'Stirring',
  'Upbeat',
  'Other',
]

interface ResourceContributor {
  name: string
  roles: [string]
  sequence_number: number
}
const resourceContributorSchema = new mongoose.Schema<ResourceContributor>({
  name: String,
  roles: [String],
  sequence_number: Number,
})

interface RightsController {
  name: string
  roles: [string]
  rights_share_unknown?: string
}

const rightsControllerSchema = new mongoose.Schema<RightsController>({
  name: String,
  roles: [String],
  rights_share_unknown: String,
})

interface Copyright {
  year: string
  text: string
}

const copyrightSchema = new mongoose.Schema<Copyright>({
  year: String,
  text: String,
})

const trackMetadataSchema = new mongoose.Schema({
  title: { type: String, required: true },
  release_date: { type: Date, required: true },
  ddex_release_ids: mongoose.Schema.Types.Mixed,
  genre: { type: String, enum: genres, required: true },
  duration: { type: Number, required: true },
  preview_start_seconds: Number,
  isrc: String,
  license: String,
  description: String,
  mood: { type: String, enum: moods },
  tags: String,
  preview_audio_file_url: String,
  preview_audio_file_url_hash: String,
  preview_audio_file_url_hash_algo: String,
  audio_file_url: { type: String, required: true },
  audio_file_url_hash: { type: String, required: true },
  audio_file_url_hash_algo: { type: String, required: true },

  // Required if it's a standalone track. Uses playlist_owner_id and playlist's cover_art_url if it's part of an album
  artist_id: { type: String, required: true },
  artist_name: { type: String, required: true },
  artists: { type: [resourceContributorSchema], default: null },
  resource_contributors: { type: [resourceContributorSchema], default: null },
  indirect_resource_contributors: {
    type: [resourceContributorSchema],
    default: null,
  },
  rights_controller: { type: rightsControllerSchema, default: null },
  copyright_line: { type: copyrightSchema, default: null },
  producer_copyright_line: { type: copyrightSchema, default: null },
  parental_warning_type: { type: String, default: null },
  cover_art_url: { type: String, required: true },
  cover_art_url_hash: { type: String, required: true },
  cover_art_url_hash_algo: { type: String, required: true },
})

export type TrackMetadata = mongoose.InferSchemaType<typeof trackMetadataSchema>

const collectionMetadataSchema = new mongoose.Schema({
  playlist_name: { type: String, required: true },
  playlist_owner_name: { type: String, required: true },
  playlist_owner_id: { type: String, required: true },
  artists: { type: [resourceContributorSchema], default: null },
  genre: { type: String, enum: genres, required: true },
  release_date: { type: Date, required: true },
  ddex_release_ids: mongoose.Schema.Types.Mixed,
  description: String,
  is_album: Boolean,
  is_private: Boolean,
  tags: String,
  mood: { type: String, enum: moods },
  license: String,
  upc: String,
  cover_art_url: { type: String, required: true },
  cover_art_url_hash: { type: String, required: true },
  cover_art_url_hash_algo: { type: String, required: true },
  copyright_line: { type: copyrightSchema, default: null },
  producer_copyright_line: { type: copyrightSchema, default: null },
  parental_warning_type: { type: String, default: null },
})

export type CollectionMetadata = mongoose.InferSchemaType<
  typeof collectionMetadataSchema
>

export const createTrackReleaseSchema = new mongoose.Schema({
  ddex_release_ref: { type: String, required: true },
  metadata: { type: trackMetadataSchema, required: true },
})

export type CreateTrackRelease = mongoose.InferSchemaType<
  typeof createTrackReleaseSchema
>

export const createAlbumReleaseSchema = new mongoose.Schema({
  ddex_release_ref: { type: String, required: true },
  tracks: [trackMetadataSchema],
  metadata: { type: collectionMetadataSchema, required: true },
})

export type CreateAlbumRelease = mongoose.InferSchemaType<
  typeof createAlbumReleaseSchema
>

export const pendingReleasesSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  delivery_etag: { type: String, required: true },
  publish_date: { type: Date, required: true },
  created_at: { type: Date, required: true },
  create_track_release: createTrackReleaseSchema,
  create_album_release: createAlbumReleaseSchema,
  publish_errors: [String],
  failure_count: Number,
  failed_after_upload: Boolean,
})

// Releases awaiting publishing. Releases are parsed from DDEX deliveries
const PendingReleases = mongoose.model(
  'PendingReleases',
  pendingReleasesSchema,
  'pending_releases'
)

export type PendingRelease = mongoose.HydratedDocument<
  mongoose.InferSchemaType<typeof pendingReleasesSchema>
>

export default PendingReleases
