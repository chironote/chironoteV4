# Restored deployed Custom Instructions resolver templates

Read-only AWS AppSync get-resolver metadata retrieval from the production API on 2026-10-10 captured these six VTL templates. The three deployed UNIT resolvers share the same request and response templates and use the CustomInstructionsMetaPrompter data source.

The request requires an authenticated Cognito identity with sub and forwards only the verified sub, GraphQL field name, and GraphQL arguments in the version-1 APPSYNC invocation envelope. The response maps Lambda errors to the stable CustomInstructionsServiceError and returns the Lambda result.

These files contain no patient records, credentials, or account identifiers. Restore them to Amplify's source-managed amplify/backend/api/chironotev4/resolvers/ directory under the matching names before future deployments, and retain the deployed data-source contract.
