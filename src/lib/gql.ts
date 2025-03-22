import { gql } from 'graphql-request'

export const DELETE_EMOTE_SET = gql`
  mutation DeleteEmoteSet($id: ObjectID!) {
    emoteSet(id: $id) {
      delete
      __typename
    }
  }
`

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

export const CREATE_EMOTE_SET = gql`
  mutation CreateEmoteSet($user_id: ObjectID!, $data: CreateEmoteSetInput!) {
    createEmoteSet(user_id: $user_id, data: $data) {
      id
      name
      capacity
      owner {
        id
        display_name
        style {
          color
          __typename
        }
        avatar_url
        __typename
      }
      emotes {
        id
        name
        __typename
      }
      __typename
    }
  }
`

export const UPDATE_USER_CONNECTION = gql`
  mutation UpdateUserConnection($id: ObjectID!, $conn_id: String!, $d: UserConnectionUpdate!) {
    user(id: $id) {
      connections(id: $conn_id, data: $d) {
        id
        platform
        display_name
        emote_set_id
        __typename
      }
      __typename
    }
  }
`

export const GET_USER_EMOTE_SETS = gql`
  query GetUserEmoteSets($id: ObjectID!) {
    user(id: $id) {
      id
      emote_sets {
        id
        name
        flags
        capacity
        emote_count
        origins {
          id
          weight
          __typename
        }
        owner {
          id
          display_name
          style {
            color
            __typename
          }
          avatar_url
          connections {
            id
            emote_capacity
            emote_set_id
            platform
            display_name
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
