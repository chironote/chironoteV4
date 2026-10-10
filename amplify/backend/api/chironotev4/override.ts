import { AmplifyApiGraphQlResourceStackTemplate } from '@aws-amplify/cli-extensibility-helper';

export function override(resources: AmplifyApiGraphQlResourceStackTemplate) {
  // Coordinated patient cutover: only the guarded backend writes clinical bodies.
  resources.api.GraphQLAPI.addPropertyOverride('EnvironmentVariables', {
    PATIENT_WRITES_GUARDED: 'true',
  });
  const notes = resources.models['Notes'].modelDDBTable;
  // Preserve clinical records across stack removal/replacement and keep live recovery enabled.
  notes.addOverride('DeletionPolicy', 'Retain');
  notes.addOverride('UpdateReplacePolicy', 'Retain');
  notes.pointInTimeRecoverySpecification = { pointInTimeRecoveryEnabled: true };
  notes.deletionProtectionEnabled = true;
}
