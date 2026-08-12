interface GraphQlModelResource {
  modelDDBTable: {
    timeToLiveSpecification?: {
      attributeName: string;
      enabled: boolean;
    };
  };
}

interface GraphQlResourceTemplate {
  models: Record<string, GraphQlModelResource>;
}

export function override(resources: GraphQlResourceTemplate) {
  resources.models['RecordingTelemetryEvent'].modelDDBTable.timeToLiveSpecification = {
    attributeName: 'expiresAt',
    enabled: true
  };
}
