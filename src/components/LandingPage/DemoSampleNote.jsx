import React from 'react';

// Fictional example for the public demo page. It is not patient data or captured
// ChiroNote output, and illustrates the reviewable format visitors can expect.
const sampleNoteSections = [
  {
    title: 'Subjective',
    details: [
      ['Right Shoulder/Neck', 'The patient reports a gradual onset of right-sided neck and shoulder pain with a dull, achy quality. Pain is aggravated by overhead reaching and prolonged sitting at a desk. They deny numbness, tingling, or symptoms radiating into the arm; discomfort remains localized to the neck and shoulder region.'],
      ['Functional Impact', 'The patient is able to perform most daily activities but reports difficulty with prolonged computer work and overhead tasks. They have been modifying their workstation setup and taking more frequent breaks to manage symptoms throughout the workday.'],
    ],
  },
  {
    title: 'Objective',
    details: [
      ['Cervical Spine', 'Active ROM: flexion is mildly restricted with dull discomfort at end range; extension has good range of motion with mild achiness; rotation is restricted bilaterally, right greater than left; and lateral flexion is mildly restricted bilaterally.'],
      ['Right Shoulder/Cervical Region', 'Marked tenderness is present over the right upper trapezius and right levator scapulae. Mild surrounding soft-tissue tightness is noted bilaterally, right greater than left.'],
      ['Orthopedic Testing', "Spurling's Test is negative bilaterally. Cervical distraction produces mild symptom relief."],
    ],
  },
  { title: 'Assessment', text: 'Cervicalgia with associated right shoulder myofascial pain [M54.2]' },
  { title: 'Treatment', text: 'Gentle chiropractic manipulation to the cervical and upper thoracic spine; mild cavitation obtained [98940].' },
  { title: 'Plan', text: 'Continue with conservative chiropractic care and gradual progression of treatment as tolerated.' },
];

export default function DemoSampleNote() {
  return (
    <section className="marketing-section marketing-sample" aria-labelledby="sample-note-heading" data-analytics-section="sample_note">
      <div className="marketing-sample__intro marketing-reveal" data-marketing-reveal>
        <p className="marketing-eyebrow">From conversation to documentation</p>
        <h2 id="sample-note-heading">Your note, ready to review.</h2>
        <p>Read through each section, make your changes, and copy the finished note into your EHR. You stay in control of what goes into the chart.</p>
        <p className="marketing-sample__disclaimer">Fictional example for demonstration only. It contains no patient data.</p>
      </div>
      <article className="marketing-sample__note marketing-reveal marketing-reveal--delay-1" aria-label="Fictional sample SOAP note" data-marketing-reveal>
        <header>
          <p className="marketing-eyebrow">Sample SOAP note</p>
          <h3>Neck and right shoulder follow-up</h3>
          <p>Fictional example · Demonstration only</p>
        </header>
        {sampleNoteSections.map(({ title, text, details }) => (
          <section key={title}>
            <h4>{title}</h4>
            {details ? details.map(([label, detail]) => <p key={label}><strong>{label}:</strong> {detail}</p>) : <p>{text}</p>}
          </section>
        ))}
      </article>
    </section>
  );
}
