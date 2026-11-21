import { validate } from 'jsonschema'

import PlaylistSchema from './schemas/playlistSchema.json'
import TrackSchema from './schemas/trackSchema.json'
import UserSchema from './schemas/userSchema.json'

export const trackSchemaType = 'TrackSchema'
export const userSchemaType = 'UserSchema'
export const playlistSchemaType = 'PlaylistSchema'

type SchemaConfig = {
  schema: {
    definitions: Record<
      string,
      | { required: string[]; properties: Record<string, { default: unknown }> }
      | {}
    >
  }
  baseDefinition: string
  validate?: (obj: Record<string, unknown>) => void
}

type SchemaType =
  | typeof trackSchemaType
  | typeof userSchemaType
  | typeof playlistSchemaType

export type Schemas = {
  TrackSchema: SchemaConfig
  UserSchema: SchemaConfig
  PlaylistSchema: SchemaConfig
}

export class SchemaValidator {
  schemas: Schemas | undefined

  init() {
    this.schemas = {
      [trackSchemaType]: {
        schema: TrackSchema,
        baseDefinition: 'Track'
      },
      [userSchemaType]: {
        schema: UserSchema,
        baseDefinition: 'User'
      },
      [playlistSchemaType]: {
        schema: PlaylistSchema,
        baseDefinition: 'Playlist'
      }
    }

    for (const schemaType in this.schemas) {
      const typedSchemaType = schemaType as SchemaType
      this.schemas[typedSchemaType].validate = (
        obj: Record<string, unknown>
      ) => {
        this.addMissingFields(obj, typedSchemaType)

        const result = validate(obj, this.schemas?.[typedSchemaType].schema)
        if (result.errors.length > 0)
          throw new Error(
            `${schemaType} validation failed with errors: ${JSON.stringify(
              result.errors
            )}`
          )
      }
    }
  }

  getSchemas() {
    return this.schemas
  }

  addMissingFields(obj: Record<string, unknown>, schemaType: SchemaType) {
    if (!this.schemas) {
      return
    }
    const { schema, baseDefinition } = this.schemas[schemaType]
    const schemaTypeObj = schema.definitions[baseDefinition]
    if (schemaTypeObj && 'required' in schemaTypeObj) {
      schemaTypeObj.required.forEach((req) => {
        if (!Object.prototype.hasOwnProperty.call(obj, req)) {
          if (
            Object.prototype.hasOwnProperty.call(
              schemaTypeObj.properties[req],
              'default'
            )
          ) {
            obj[req] = schemaTypeObj.properties[req]?.default
          } else
            throw new Error(
              `Could not set default value for missing field ${req}`
            )
        }
      })
    }
  }
}
