import { gql } from 'graphql-request'

export const GET_EMOTE_SET_FOR_CARD = gql`
  query GetEmoteSetForCard($id: ObjectID!, $limit: Int) {
    emoteSet(id: $id) {
      emote_count
      capacity
      flags
      emotes(limit: $limit, origins: true) {
        id
        name
        origin_id
        data {
          id
          name
          host {
            url
            files {
              name
              format
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }
`

export const CHANGE_EMOTE_IN_SET = gql`
  mutation ChangeEmoteInSet($id: ObjectID!, $action: ListItemAction!, $emote_id: ObjectID!, $name: String) {
    emoteSet(id: $id) {
      id
      emotes(id: $emote_id, action: $action, name: $name) {
        id
        name
        __typename
      }
      __typename
    }
  }
`
