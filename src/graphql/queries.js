/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUserSubscriptionByUser = /* GraphQL */ `
  query GetUserSubscriptionByUser($userID: String!) {
    getUserSubscriptionByUser(userID: $userID) {
      id
      userID
      tier
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const getUserSubscription = /* GraphQL */ `
  query GetUserSubscription($id: ID!) {
    getUserSubscription(id: $id) {
      id
      userID
      tier
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const listUserSubscriptions = /* GraphQL */ `
  query ListUserSubscriptions(
    $filter: ModelUserSubscriptionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUserSubscriptions(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        userID
        tier
        createdAt
        updatedAt
        owner
        __typename
      }
      nextToken
      __typename
    }
  }
`;
