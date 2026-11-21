import {
  IndicesIndexSettings,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types'

export const sharedIndexSettings: IndicesIndexSettings = {
  analysis: {
    char_filter: {
      whitespace_remove: {
        type: 'pattern_replace',
        pattern: ' ',
        replacement: '',
        flags: '',
      },
    },
    normalizer: {
      lower_asciifolding: {
        type: 'custom',
        filter: ['asciifolding', 'lowercase'],
      },
      lower_asciifolding_no_whitespace: {
        type: 'custom',
        char_filter: ['whitespace_remove'],
        filter: ['asciifolding', 'lowercase'],
      },
    },
    analyzer: {
      standard_asciifolding: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['asciifolding', 'lowercase'],
      },
    },
  },

  index: {
    number_of_shards: 1,
    number_of_replicas: 0,
    refresh_interval: '5s',
    max_terms_count: 1000000,
  },
}

export const standardSuggest: MappingProperty = {
  type: 'search_as_you_type',
  analyzer: 'standard_asciifolding',
}

export const standardText: MappingProperty = {
  type: 'text',
  analyzer: 'standard_asciifolding',
}

export const lowerKeyword: MappingProperty = {
  type: 'keyword',
  normalizer: 'lower_asciifolding',
}

export const noWhitespaceLowerKeyword: MappingProperty = {
  type: 'keyword',
  normalizer: 'lower_asciifolding_no_whitespace',
}
