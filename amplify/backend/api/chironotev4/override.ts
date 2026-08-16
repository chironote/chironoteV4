import { AmplifyApiGraphQlResourceStackTemplate } from '@aws-amplify/cli-extensibility-helper';

export function override(resources: AmplifyApiGraphQlResourceStackTemplate) {
  const telemetryTable = resources.models?.RecordingTelemetryEvent?.modelDDBTable;
  if (!telemetryTable) {
    throw new Error('RecordingTelemetryEvent table is required for telemetry TTL');
  }

  telemetryTable.timeToLiveSpecification = {
    attributeName: 'expiresAt',
    enabled: true
  };
}
