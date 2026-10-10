import { AmplifyApiGraphQlResourceStackTemplate } from '@aws-amplify/cli-extensibility-helper';

export function override(resources: AmplifyApiGraphQlResourceStackTemplate) {
  // Phase A keeps legacy writers working until the reviewed patient workflow is enabled.
  resources.api.GraphQLAPI.addPropertyOverride('EnvironmentVariables', {
    PATIENT_WRITES_GUARDED: 'false',
  });
  const notes = resources.models['Notes'].modelDDBTable;
  // Preserve clinical records across stack removal/replacement and keep live recovery enabled.
  notes.addOverride('DeletionPolicy', 'Retain');
  notes.addOverride('UpdateReplacePolicy', 'Retain');
  notes.pointInTimeRecoverySpecification = { pointInTimeRecoveryEnabled: true };
  notes.deletionProtectionEnabled = true;
}
