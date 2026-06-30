# LandingPage Components

This folder owns public marketing and tutorial pages.

## Files

- `ConsiderationLandingPage.jsx` renders the main public landing page at `/ai-chiropractic-soap-notes`.
- `ConversionLandingPage.jsx` renders the `/learn-more` conversion page.
- `ConversionLandingPageOld.jsx` is an older conversion page implementation kept in source.
- `TutorialPage.jsx` renders the public tutorial page.
- `LandingPage.css`, `ConversionLandingPage.css`, and `ConversionLandingPageOld.css` style the public pages.
- `LandingUpgrade.md` is an older markdown planning/reference file, not app code.

## Common Page Patterns

The public pages import assets directly from `src/assets`, use `LandingNavbar`, and keep marketing content in local constants. For example, `ConsiderationLandingPage` defines:

```js
const TESTIMONIALS = [
  { name: 'Dr. Matt Fryauf', avatar: mattImg, text: 'I highly recommend this app for high volume practices' }
];

const FAQ_ITEMS = [
  { question: 'How does ChiroNote work?', answer: 'ChiroNote is a web-based tool you can access from any device with a browser.' }
];

const PLANS_DATA = [
  { name: 'Free', description: 'Essential Care', price: 'No Charge' }
];
```

`ConsiderationLandingPage` also tracks landing-page actions and 75 percent video progress:

```js
trackLandingPageButtonClick(actionName);
trackVideoProgress('Consideration_Landing_Demo_Video', 75);
```

`ConversionLandingPage` uses local state for video playback, FAQ expansion, and testimonial carousel state:

```js
const [videoPlaying, setVideoPlaying] = useState(false);
const [activeFaq, setActiveFaq] = useState(null);
const [activeSlide, setActiveSlide] = useState(0);
```

## Maintenance Notes

- Public route wiring lives in `AppRouting/AppRoutes.jsx`.
- These pages include SEO and conversion-sensitive copy. Coordinate content changes with analytics expectations.
- If removing old landing files, verify no route or import still references them.
