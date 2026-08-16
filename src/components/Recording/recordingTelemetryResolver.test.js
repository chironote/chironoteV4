import fs from 'fs';
import path from 'path';
import { RECORDING_TELEMETRY_EVENT_NAMES } from './recordingTelemetrySchema';

const resolverPath = path.resolve(
  process.cwd(),
  'amplify/backend/api/chironotev4/resolvers/Mutation.createRecordingTelemetryEvent.req.vtl'
);

describe('recording telemetry ingestion resolver', () => {
  test('overrides client identity, ordering time, retention, and producer attribution', () => {
    const resolver = fs.readFileSync(resolverPath, 'utf8');

    expect(resolver).toContain('$util.time.nowISO8601()');
    expect(resolver).toContain('$util.time.nowEpochSeconds() + 2592000');
    expect(resolver).toContain('$mergedValues.timelineKey != $expectedClientTimelineKey');
    expect(resolver).toContain('$mergedValues.put("id", $serverId)');
    expect(resolver).toContain('$mergedValues.put("timelineKey", $serverTimelineKey)');
    expect(resolver).toContain('$mergedValues.put("producerOccurredAt", $producerOccurredAt)');
    expect(resolver).toContain('$mergedValues.put("producerFingerprint"');
    expect(resolver).toContain('$util.validate($allowedFields.contains($field)');
    expect(resolver).toContain('!$util.isBoolean($settingValue) && !$util.isNumber($settingValue)');
    expect(resolver).toContain('$mergedValues.source != $expectedClientSource');
    expect(resolver).toContain('^(backend|lambda)[.]');
    expect(resolver).toContain('$clientEventNames.contains($mergedValues.eventName)');
  });

  test('keeps the resolver event vocabulary aligned with the client schema', () => {
    const resolver = fs.readFileSync(resolverPath, 'utf8');
    const eventBlock = resolver.match(/#set\( \$eventNames = \[([\s\S]*?)\] \)/)?.[1] || '';
    const resolverEventNames = Array.from(
      eventBlock.matchAll(/"([^"]+)"/g),
      match => match[1]
    );

    expect(resolverEventNames).toEqual(RECORDING_TELEMETRY_EVENT_NAMES);
  });
});
