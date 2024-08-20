/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateUserSubscription = /* GraphQL */ `
  subscription OnCreateUserSubscription(
    $filter: ModelSubscriptionUserSubscriptionFilterInput
    $owner: String
  ) {
    onCreateUserSubscription(filter: $filter, owner: $owner) {
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
export const onUpdateUserSubscription = /* GraphQL */ `
  subscription OnUpdateUserSubscription(
    $filter: ModelSubscriptionUserSubscriptionFilterInput
    $owner: String
  ) {
    onUpdateUserSubscription(filter: $filter, owner: $owner) {
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
export const onDeleteUserSubscription = /* GraphQL */ `
  subscription OnDeleteUserSubscription(
    $filter: ModelSubscriptionUserSubscriptionFilterInput
    $owner: String
  ) {
    onDeleteUserSubscription(filter: $filter, owner: $owner) {
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
