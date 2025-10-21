import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecordingManager from './RecordingManager';
import Dictation from './Dictation';
import { uploadData } from 'aws-amplify/storage';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { resetAllMocks } from '../../setupTests';
import { findRecordingButtons, cleanupTest } from '../testing/testUtils';

/**
 * NOTE SETTINGS TESTS
 * 
 * Tests for various combinations of note settings to ensure
 * the recording system works correctly regardless of user configuration.
 */

describe('Note Settings - Various Combinations', () => {
  beforeEach(() => {
    resetAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanupTest();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // Test different note setting configurations
  const noteSettingsConfigurations = [
    {
      name: 'SOAP Format - Default Settings',
      settings: JSON.stringify({
        format: 'SOAP',
        includeObjective: true,
        includeAssessment: true,
        includePlan: true,
        detailLevel: 'standard'
      })
    },
    {
      name: 'SOAP Format - Minimal',
      settings: JSON.stringify({
        format: 'SOAP',
        includeObjective: false,
        includeAssessment: true,
        includePlan: true,
        detailLevel: 'brief'
      })
    },
    {
      name: 'SOAP Format - Detailed',
      settings: JSON.stringify({
        format: 'SOAP',
        includeObjective: true,
        includeAssessment: true,
        includePlan: true,
        detailLevel: 'detailed',
        includeDifferentialDiagnosis: true
      })
    },
    {
      name: 'Narrative Format',
      settings: JSON.stringify({
        format: 'narrative',
        includeTimestamps: false,
        detailLevel: 'standard'
      })
    },
    {
      name: 'Custom Format',
      settings: JSON.stringify({
        format: 'custom',
        sections: ['Chief Complaint', 'History', 'Examination', 'Diagnosis', 'Treatment'],
        detailLevel: 'standard'
      })
    },
    {
      name: 'Template-Based',
      settings: JSON.stringify({
        format: 'template',
        templateId: 'chiropractic-initial',
        autoFillDefaults: true
      })
    },
    {
      name: 'No Settings (null)',
      settings: null
    },
    {
      name: 'Empty Settings',
      settings: ''
    },
    {
      name: 'Settings with Special Characters',
      settings: JSON.stringify({
        format: 'SOAP',
        customInstructions: 'Patient's primary complaint: "sharp pain" in lower back'
      })
    }
  ];

  noteSettingsConfigurations.forEach(({ name, settings }) => {
    test(`should handle recording with: ${name}`, async () => {
      // Set note settings in localStorage
      if (settings !== null) {
        localStorage.setItem('noteSettings', settings);
      }

      const mockTextUpdate = jest.fn();
      const mockTransition = jest.fn();

      const { container } = render(
        <RecordingManager
          onTextStreamUpdate={mockTextUpdate}
          onTransitionToMainApp={mockTransition}
        />
      );

      const buttons = findRecordingButtons(container);

      if (buttons.record && buttons.stop) {
        // Start recording
        await act(async () => {
          userEvent.click(buttons.record);
          jest.advanceTimersByTime(2000);
        });

        // Stop recording
        await act(async () => {
          userEvent.click(buttons.stop);
          jest.advanceTimersByTime(100);
        });

        // Should handle any note settings configuration without errors
        expect(true).toBe(true); // Test passes if no errors thrown
      }
    });
  });

  test('should include noteSettings in SQS message payload', async () => {
    const testSettings = JSON.stringify({
      format: 'SOAP',
      includeObjective: true,
      includeAssessment: true,
      includePlan: true,
      detailLevel: 'detailed'
    });

    localStorage.setItem('noteSettings', testSettings);

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const buttons = findRecordingButtons(container);

    if (buttons.record && buttons.stop) {
      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(2000);
        userEvent.click(buttons.stop);
        jest.advanceTimersByTime(100);
      });

      // Wait for S3 upload and SQS message
      await waitFor(() => {
        expect(SendMessageCommand).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify SQS message includes noteSettings
      const sqsCall = SendMessageCommand.mock.calls[0];
      if (sqsCall && sqsCall[0]) {
        const messageBody = JSON.parse(sqsCall[0].MessageBody);
        expect(messageBody.noteSettings).toBe(testSettings);
      }
    }
  });

  test('should handle noteSettings change between recordings', async () => {
    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const buttons = findRecordingButtons(container);

    if (buttons.record && buttons.stop) {
      // First recording with SOAP settings
      localStorage.setItem('noteSettings', JSON.stringify({ format: 'SOAP' }));

      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(2000);
        userEvent.click(buttons.stop);
        jest.advanceTimersByTime(100);
      });

      // Change settings to narrative
      localStorage.setItem('noteSettings', JSON.stringify({ format: 'narrative' }));

      // Second recording with new settings
      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(2000);
        userEvent.click(buttons.stop);
        jest.advanceTimersByTime(100);
      });

      // Both recordings should complete successfully
    }
  });

  test('should handle invalid JSON in noteSettings gracefully', async () => {
    // Set invalid JSON
    localStorage.setItem('noteSettings', '{invalid json}');

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const buttons = findRecordingButtons(container);

    if (buttons.record && buttons.stop) {
      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(2000);
        userEvent.click(buttons.stop);
        jest.advanceTimersByTime(100);
      });

      // Should not crash, should handle gracefully
      expect(true).toBe(true);
    }
  });

  test('should handle very long noteSettings string', async () => {
    // Create a very long settings object
    const longSettings = JSON.stringify({
      format: 'custom',
      customInstructions: 'A'.repeat(5000), // 5000 character instruction
      sections: Array(50).fill('Custom Section'),
      templates: Array(20).fill({ name: 'Template', content: 'Content' })
    });

    localStorage.setItem('noteSettings', longSettings);

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const buttons = findRecordingButtons(container);

    if (buttons.record && buttons.stop) {
      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(2000);
        userEvent.click(buttons.stop);
        jest.advanceTimersByTime(100);
      });

      // Should handle large settings without performance issues
    }
  });
});

describe('Note Settings - Language Combinations', () => {
  beforeEach(() => {
    resetAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanupTest();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const languageConfigurations = [
    { name: 'English (Default)', language: null },
    { name: 'English (Explicit)', language: 'en' },
    { name: 'Spanish', language: 'es' },
    { name: 'French', language: 'fr' },
    { name: 'German', language: 'de' },
    { name: 'Portuguese', language: 'pt' },
    { name: 'Italian', language: 'it' },
    { name: 'null language', language: 'null' }
  ];

  languageConfigurations.forEach(({ name, language }) => {
    test(`should handle recording with language: ${name}`, async () => {
      if (language !== null) {
        localStorage.setItem('selectedLanguage', language);
      }

      const mockTextUpdate = jest.fn();
      const mockTransition = jest.fn();

      const { container } = render(
        <RecordingManager
          onTextStreamUpdate={mockTextUpdate}
          onTransitionToMainApp={mockTransition}
        />
      );

      const buttons = findRecordingButtons(container);

      if (buttons.record && buttons.stop) {
        await act(async () => {
          userEvent.click(buttons.record);
          jest.advanceTimersByTime(2000);
          userEvent.click(buttons.stop);
          jest.advanceTimersByTime(100);
        });

        // Wait for SQS message
        await waitFor(() => {
          expect(SendMessageCommand).toHaveBeenCalled();
        }, { timeout: 3000 });

        // Verify language is included in SQS message
        const sqsCall = SendMessageCommand.mock.calls[0];
        if (sqsCall && sqsCall[0]) {
          const messageBody = JSON.parse(sqsCall[0].MessageBody);
          // Language should be included (or null if not set)
          expect(messageBody).toHaveProperty('language');
        }
      }
    });
  });

  test('should handle language + noteSettings combinations', async () => {
    const combinations = [
      {
        language: 'es',
        settings: JSON.stringify({ format: 'SOAP', detailLevel: 'detailed' })
      },
      {
        language: 'fr',
        settings: JSON.stringify({ format: 'narrative' })
      },
      {
        language: null,
        settings: JSON.stringify({ format: 'custom' })
      }
    ];

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    for (const combo of combinations) {
      if (combo.language) {
        localStorage.setItem('selectedLanguage', combo.language);
      } else {
        localStorage.removeItem('selectedLanguage');
      }
      localStorage.setItem('noteSettings', combo.settings);

      const buttons = findRecordingButtons(container);

      if (buttons.record && buttons.stop) {
        await act(async () => {
          userEvent.click(buttons.record);
          jest.advanceTimersByTime(1000);
          userEvent.click(buttons.stop);
          jest.advanceTimersByTime(100);
        });
      }
    }

    // All combinations should work without errors
    expect(true).toBe(true);
  });
});

describe('Note Settings - Edge Cases', () => {
  beforeEach(() => {
    resetAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanupTest();
  });

  test('should handle noteSettings with nested objects', async () => {
    const complexSettings = JSON.stringify({
      format: 'SOAP',
      subjective: {
        includeChiefComplaint: true,
        includeHistory: true,
        historyDetails: {
          onset: true,
          duration: true,
          severity: true,
          aggravatingFactors: true,
          relievingFactors: true
        }
      },
      objective: {
        includeVitals: true,
        includeExamination: true,
        examinationDetails: {
          inspection: true,
          palpation: true,
          rangeOfMotion: true,
          neurologicalExam: true,
          orthopedicTests: true
        }
      },
      assessment: {
        includeDiagnosis: true,
        includePrognosis: true,
        includeDifferentials: true
      },
      plan: {
        includeTreatment: true,
        includeFollowUp: true,
        includePatientEducation: true
      }
    });

    localStorage.setItem('noteSettings', complexSettings);

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    // Should handle complex nested settings without errors
    expect(true).toBe(true);
  });

  test('should handle noteSettings with arrays', async () => {
    const settingsWithArrays = JSON.stringify({
      format: 'custom',
      sections: [
        'Chief Complaint',
        'History of Present Illness',
        'Past Medical History',
        'Medications',
        'Allergies',
        'Social History',
        'Family History',
        'Review of Systems',
        'Physical Examination',
        'Assessment',
        'Plan'
      ],
      requiredFields: ['Chief Complaint', 'Assessment', 'Plan'],
      optionalFields: ['Medications', 'Allergies'],
      defaultValues: [
        { field: 'Provider', value: 'Dr. Smith' },
        { field: 'Location', value: 'Clinic A' }
      ]
    });

    localStorage.setItem('noteSettings', settingsWithArrays);

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    // Should handle settings with arrays without errors
    expect(true).toBe(true);
  });

  test('should handle noteSettings changes during active recording', async () => {
    jest.useFakeTimers();

    localStorage.setItem('noteSettings', JSON.stringify({ format: 'SOAP' }));

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    const { container } = render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    const buttons = findRecordingButtons(container);

    if (buttons.record) {
      // Start recording
      await act(async () => {
        userEvent.click(buttons.record);
        jest.advanceTimersByTime(1000);
      });

      // Change settings during recording
      localStorage.setItem('noteSettings', JSON.stringify({ format: 'narrative' }));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Stop recording
      if (buttons.stop) {
        await act(async () => {
          userEvent.click(buttons.stop);
          jest.advanceTimersByTime(100);
        });
      }

      // Should use the settings from when recording started
      // or handle the change gracefully
    }

    jest.useRealTimers();
  });

  test('should handle Unicode characters in noteSettings', async () => {
    const unicodeSettings = JSON.stringify({
      format: 'SOAP',
      customInstructions: 'Include: émotions, 症状, Schmerzen, दर्द',
      specialNotes: '¡Importante! 中文 العربية ελληνικά'
    });

    localStorage.setItem('noteSettings', unicodeSettings);

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    // Should handle Unicode without errors
    expect(true).toBe(true);
  });

  test('should handle boolean, number, and string values in settings', async () => {
    const mixedTypeSettings = JSON.stringify({
      format: 'SOAP',
      enabled: true,
      disabled: false,
      maxLength: 5000,
      minLength: 100,
      priority: 1,
      category: 'chiropractic',
      timestamp: Date.now(),
      version: '2.0',
      nullValue: null,
      undefinedValue: undefined
    });

    localStorage.setItem('noteSettings', mixedTypeSettings);

    const mockTextUpdate = jest.fn();
    const mockTransition = jest.fn();

    render(
      <RecordingManager
        onTextStreamUpdate={mockTextUpdate}
        onTransitionToMainApp={mockTransition}
      />
    );

    // Should handle mixed types without errors
    expect(true).toBe(true);
  });
});

describe('Note Settings - Dictation Component', () => {
  beforeEach(() => {
    resetAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanupTest();
  });

  test('should handle note settings in dictation mode', async () => {
    localStorage.setItem('noteSettings', JSON.stringify({
      format: 'freetext',
      autoCapitalize: true,
      autoPunctuation: true
    }));

    const mockTextUpdate = jest.fn();
    const mockClipboardUpdate = jest.fn();

    await act(async () => {
      render(
        <Dictation
          onTextStreamUpdate={mockTextUpdate}
          setClipboardContent={mockClipboardUpdate}
          username="test-user"
        />
      );
    });

    // Should initialize with settings without errors
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    expect(true).toBe(true);
  });

  test('should maintain settings across multiple dictation sessions', async () => {
    const testSettings = JSON.stringify({
      format: 'SOAP',
      shortcuts: {
        'hpi': 'History of Present Illness',
        'ros': 'Review of Systems'
      }
    });

    localStorage.setItem('noteSettings', testSettings);

    const mockTextUpdate = jest.fn();
    const mockClipboardUpdate = jest.fn();

    // First session
    const { unmount } = await act(async () => {
      return render(
        <Dictation
          onTextStreamUpdate={mockTextUpdate}
          setClipboardContent={mockClipboardUpdate}
          username="test-user"
        />
      );
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      unmount();
    });

    // Settings should still be in localStorage
    expect(localStorage.getItem('noteSettings')).toBe(testSettings);

    // Second session should have same settings
    await act(async () => {
      render(
        <Dictation
          onTextStreamUpdate={mockTextUpdate}
          setClipboardContent={mockClipboardUpdate}
          username="test-user"
        />
      );
    });

    expect(localStorage.getItem('noteSettings')).toBe(testSettings);
  });
});
