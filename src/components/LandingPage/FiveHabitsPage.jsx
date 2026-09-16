import React from 'react';
import { Helmet } from 'react-helmet-async';
import { trackLandingCta, trackLandingNavigation } from '../../utils/analytics';
import textLogo from '../../assets/textlogo-blk.svg';
import askFirstImage from '../../assets/five-habits-ask-first.webp';
import warmItUpImage from '../../assets/five-habits-warm-it-up.webp';
import sayItImage from '../../assets/five-habits-say-it.webp';
import teachItImage from '../../assets/five-habits-teach-it.webp';
import reviewItImage from '../../assets/five-habits-review-it.webp';
import './FiveHabitsPage.css';

const SIGN_UP_URL = '/app?initialState=signUp';
const DEMO_URL = '/demo';

const habits = [
  {
    number: '1',
    label: 'Ask first',
    title: 'Get permission out loud, then thank them',
    image: askFirstImage,
    alt: 'A chiropractor asks a patient for permission before starting an AI scribe.',
    content: (
      <>
        <p>Everyone dreads this one. It takes four seconds.</p>
        <blockquote className="five-habits-script">
          <span>Speak openly</span>
          “Do you mind if I use my scribe to prepare the note?”
        </blockquote>
        <p>Take the yes, say thanks, move on. Don’t explain the technology and don’t apologize for it — treating it as ordinary is what makes it ordinary. If they ask, keep it short: it listens, it drafts the note, no audio is kept. And if someone would rather you didn’t, chart that one the old way.</p>
      </>
    ),
  },
  {
    number: '2',
    label: 'Warm it up',
    title: 'Give it context before you need it to be smart',
    image: warmItUpImage,
    alt: 'A chiropractor prepares for the clinic day before seeing patients.',
    content: (
      <>
        <p>Think of it like a brand-new grad who started this morning. Sharp, fast, writes beautifully — and has never met this patient, never seen your clinic, and can’t see what you’re doing. Whatever you don’t say, they don’t know.</p>
        <p>So hand off the way you’d hand off to a person:</p>
        <ul>
          <li><strong>At the start:</strong> who’s in the room and why they’re here today.</li>
          <li><strong>During:</strong> findings as you get them, in normal speech.</li>
          <li><strong>At the end:</strong> a quick recap of what you actually did.</li>
        </ul>
        <p>Scribes vary a lot in how much they infer on their own — some need all three, some mostly need the recap. Give it a week and you’ll know which parts yours leans on. What doesn’t vary: none of this is extra work. You’re just doing the remembering while you still remember, instead of reconstructing it at 7pm.</p>
      </>
    ),
  },
  {
    number: '3',
    label: 'Say what they’re pointing at',
    title: 'A microphone can’t see a finger',
    image: sayItImage,
    alt: 'A patient points to their lower back while a chiropractor confirms the location out loud.',
    content: (
      <>
        <p>“It hurts right here” goes into the transcript carrying nothing. The scribe heard the words. It never saw the hand.</p>
        <p>Easiest fix is to make it a question back to them:</p>
        <blockquote className="five-habits-script">
          <span>Speak openly</span>
          “Right where your neck meets the shoulders?”
        </blockquote>
        <p>Most patients will confirm immediately, and now the location is in the record in plain language — without you narrating at anyone. Same trick for an antalgic lean, the range you just measured, or the side you’re working on. If it only existed as a gesture, it won’t exist in the note.</p>
        <p>Nice side effect: patients like it. Checking that you’ve got the right spot sounds thorough, because it is.</p>
      </>
    ),
  },
  {
    number: '4',
    label: 'Teach it your format',
    title: 'Custom instructions are the best ten minutes you’ll spend',
    image: teachItImage,
    alt: 'A chiropractor gives example notes to a friendly AI assistant.',
    content: (
      <>
        <p>Back to that new grad. You wouldn’t explain your charting style fresh every single visit — you’d show them a few of your notes once and say “this is how we do it here.” Custom instructions are that conversation, and you only have it one time.</p>
        <p>Two things worth putting in:</p>
        <ul>
          <li><strong>A few of your actual notes.</strong> Paste two or three finished ones you’d be glad to see again. Format is far easier to copy than to describe.</li>
          <li><strong>How your day actually runs.</strong> Your usual techniques, visit structure, abbreviations, and what an established-patient visit looks like in your clinic.</li>
        </ul>
        <p>That second one is what everybody skips, and it’s the one that buys back the most time. When it knows what your visits normally look like, it fills the gaps with something plausible <em>for your practice</em> instead of something generic — so you’re editing less.</p>
        <p>The whole rule in one line: the more good, relevant context you give it, the less rewriting you do. Vague instructions get vague notes.</p>
        <aside className="five-habits-aside">
          <p>In ChiroNote</p>
          <span>Custom instructions live at <strong>chironote.ai/app → Settings → Custom Instructions</strong>. It’s account-level, so it applies to your notes generally — set it once, not per visit.</span>
        </aside>
      </>
    ),
  },
  {
    number: '5',
    label: 'Know the trade',
    title: 'You bought speed. The price is that you’re the reviewer now.',
    image: reviewItImage,
    alt: 'A chiropractor reviews an AI-generated note before adding it to the patient record.',
    content: (
      <>
        <p>Here’s the part worth being straight about, because nobody else will be.</p>
        <p>These models are probabilistic. Run the same visit twice and you won’t get an identical note — usually that’s harmless variation in wording. Occasionally it isn’t, and it writes something confident and wrong. That’s a <strong>hallucination</strong>: a detail that reads perfectly and simply never happened.</p>
        <p>And it won’t look like an error. It’ll look like a normal sentence in your note. Which is exactly why somebody has to read it, and that somebody is you.</p>
        <p>So the job changed shape rather than disappearing. You’re not writing notes anymore, you’re approving them — and your signature still means what it always meant. Read it before it goes in the chart, every time. It takes a small fraction of what writing it used to.</p>
        <p>That’s the real deal on offer: a genuine cut in after-hours charting, in exchange for a new and much smaller duty to review. Anyone telling you the review step is optional is selling you something.</p>
      </>
    ),
  },
];

const handleCta = (location, label, destination) => {
  trackLandingCta({ location, label, destination });
};

export default function FiveHabitsPage() {
  return (
    <div className="five-habits-page">
      <Helmet>
        <title>Five AI Scribe Habits for Chiropractors | ChiroNote</title>
        <meta name="description" content="A practical field guide to using an AI scribe well during chiropractic visits: ask first, give context, speak observable findings, teach your format, and review every note." />
        <link rel="canonical" href="https://www.chironote.ai/ai-scribe-habits-for-chiropractors" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://www.chironote.ai/ai-scribe-habits-for-chiropractors" />
        <meta property="og:title" content="Five AI Scribe Habits for Chiropractors" />
        <meta property="og:description" content="A practical field guide for using an AI scribe during chiropractic visits." />
        <meta property="og:image" content="https://www.chironote.ai/logo512.png" />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <header className="five-habits-nav">
        <a href="/" aria-label="ChiroNote home"><img src={textLogo} alt="ChiroNote" width="150" height="27" /></a>
        <a href={DEMO_URL} onClick={() => { trackLandingNavigation('demo'); handleCta('five_habits_header', 'See a ChiroNote demo', DEMO_URL); }}>See ChiroNote in action</a>
      </header>

      <main>
        <article>
          <header className="five-habits-masthead">
            <div className="five-habits-wrap">
              <p className="five-habits-eyebrow">A field guide for chiropractors</p>
              <h1>Five habits that make an AI scribe actually work</h1>
              <p>We’ve spent a lot of time now watching chiropractors work alongside ambient scribes — the ones who love them, and the ones who gave up in week one. The difference almost never comes down to which product they picked. It comes down to a handful of small habits. Here are the five that matter most.</p>
            </div>
          </header>

          <div className="five-habits-wrap five-habits-content">
            {habits.map((habit, index) => (
              <section className={`five-habits-panel${index % 2 ? ' five-habits-panel--reverse' : ''}`} key={habit.number}>
                <figure className="five-habits-art"><img src={habit.image} alt={habit.alt} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" /></figure>
                <div className="five-habits-copy">
                  <p className="five-habits-number"><b>{habit.number}</b>{habit.label}</p>
                  <h2>{habit.title}</h2>
                  {habit.content}
                </div>
              </section>
            ))}

            <section className="five-habits-closing">
              <p className="five-habits-eyebrow">Put it into practice</p>
              <h2>That’s the whole list</h2>
              <p>Ask first. Warm it up. Say what they’re pointing at. Teach it your format. Read the note.</p>
              <p>All five come back to the same idea: it only knows what it hears, and you’re the one who checks the result. None of this is about a particular product — it’s how you get along with any AI scribe without getting burned by one.</p>
              <p>Give it a week of real visits before you judge the output. Most of what you’d be judging on day one is your own habits, not the software.</p>
              <p>ChiroNote is an AI scribe built for chiropractic visits. The free plan includes an hour of dictation a month — enough to try these five habits on real visits.</p>
              <div className="five-habits-demo-cta">
                <div>
                  <h3>Want to try an AI ambient scribe built specifically for chiropractors?</h3>
                  <p>We are more than happy to walk you through ChiroNote step by step.</p>
                </div>
                <a className="five-habits-button" href={DEMO_URL} onClick={() => handleCta('five_habits_final', 'Schedule a free walkthrough', DEMO_URL)}>Schedule a free walkthrough</a>
              </div>
              <p className="five-habits-alternative">Can’t wait to try it for yourself? <a href={SIGN_UP_URL} onClick={() => handleCta('five_habits_final', 'Register with just an email', SIGN_UP_URL)}>Register with just an email here.</a></p>
            </section>
          </div>
        </article>
      </main>

      <footer className="five-habits-footer five-habits-wrap">
        <p>Built by a chiropractor, for chiropractors. The treating provider is responsible for reviewing every note before it enters the record.</p>
      </footer>
    </div>
  );
}
