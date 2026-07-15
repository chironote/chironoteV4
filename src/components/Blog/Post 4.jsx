import React from 'react';

// Post metadata
const metadata = {
  title: "Testing the Latest AI Models for Chiropractic SOAP Notes: A Deep Dive into Chiro AI Performance",
  synopsis: "A technical deep dive into testing the latest AI models (GPT-5.1, Gemini 3) for chiropractic SOAP note generation, evaluating their consistency, reasoning capabilities, and suitability for clinical practice.",
  slug: 'testing-latest-ai-models-chiro-soap-notes',
};

// Post content component
function Post4Content() {
  return (
    <div>
      <p>This is more of a technical piece to justify having spent an entire week testing the latest AI models for our chiropractic SOAP notes software. The new models dropped between 11/10 - 11/25, and if you're not into LLM quasi-scientific technical rambling, just keep in mind this is out of spirit with the rest of the product blog.</p>
      
      <p>That being said... there's a lot to unpack here for chiro ai, so let's start at the beginning.</p>
      
      <h2>GPT-5.1: A Game-Changer for Chiropractic SOAP Note Software</h2>
      
      <p>First, OpenAI made the 5.1 model available to us via the API in all its forms, but they're really trying to stick it to us with the names this time. We got our access early and have been playing around with it for some time. Within days, Google dropped its Gemini 3 model that everyone is raving about, but more on that later.</p>
      
      <p>Previously, the most powerful model for generating chiropractic SOAP notes was GPT-4.1 in my opinion, as the massive cost suggested. I see it as only a slightly curbed GPT-4, which was massive and slow, but you could tell a lot of resources went into running it—it was just... bigger.</p>
      
      <h3>High Reasoning Effort vs. Instant Mode</h3>
      
      <p>So when the new GPT-5.1 came out, I expected something more expensive. When I tried toggling its reasoning effort from low to high, I noticed so many improvements, especially with the retention of proper formatting and catching ALL the details consistently in an average 1-hour long conversation when set to high reasoning effort. But the output took well over 3 minutes, which is really the upper limit to be realistic for quick SOAP notes in chiropractic practice.</p>
      
      <p>So in the end, I was disappointed that all we got was an upgraded GPT-5 and left it at that. But then suddenly OpenAI sent me a message to try setting the reasoning effort to 'none,' and that's when it hit me. We got an upgraded GPT-4.1 as well, BUT you had to set the effort to instant to get that rise in quality. And man, I'm impressed. Truly blown away by how much detail it can pick up on for our chiropractic notes software.</p>
      
      <h2>Why Not Claude for AI Chiropractic SOAP Notes?</h2>
      
      <p>Side note: I'm sure everyone has noticed I'm leaving out Anthropic's Claude. There's a reason for that. Even though at first glance you may think it's good for the job because if you trust the price, it's a more powerful model, therefore handling the long context of exams better AND its non-inference mode capability is off the charts. The note it produces not only catches a lot of the details—every single one 99% of the time.</p>
      
      <p>And it's smart enough to understand what's happening in a clinical setting even on a deeper technical level, such as identifying range of motion findings based on instructions like "Look up as far as you can" or "What happens when we pump the ankle slowly" during a Straight Leg Raise test. This level of clinical understanding is exactly what we need in chiropractic SOAP notes software. We may be approaching AGI (artificial general intelligence), which in our narrow definition of clinical scribing means matching the role of the medical intern on the task of taking notes while observing an exam.</p>
      
      <h2>Gemini 3's API Inconsistency Problem for Quick Notes</h2>
      
      <p>And then came Gemini 3, and YouTube was blown away and a bunch of Redditors were impressed, I guess. And we got the SAME level of quality for generating quick SOAP notes, but there's a catch. It doesn't work consistently on the API unlike other outlets.</p>
      
      <p>The API will leave huge chunks out on gemini-3-pro-preview (same on Vertex, I just checked). Maybe that's why they call it preview, but then again, so does the console. The Google AI console gets it right 8/10 times while the API runs at a steady 1/10, which is sad to see for those looking for reliable chiropractic notes software. Hopefully it doesn't further drop in a week or two, but then again... pretty sure the OpenAI one will 'calm down' a little more as well. But we'll see.</p>
      
      <h2>The Verdict for Chiro AI: Which Model Wins?</h2>
      
      <p>I want to say that consistently, OpenAI is the one I would trust for our AI chiropractic SOAP notes with Grok 4 still close in second and Gemini 3 lagging behind. But I can't help but wonder if my prompt still needs work, since it took a while to get it from 4.1 to 5.1 instant for optimal performance in our quick notes chiropractic software.</p>
      
      <h2>A Worrying Trend: When AI Gets Too Perfect with Chiropractic SOAP Notes</h2>
      
      <p>I'm seeing a worrying trend: as AI models get better at catching mistakes, they tend to leave out the mistakes people make and say. Part of doctoring is nodding along in non-judgement, so hopefully this is just a minor calibration and not a trend. Props to the new GPT-5.1 models, which I have not seen do this and are able to leave the more messy stuff in the final notes—exactly what you need in authentic chiropractic SOAP note software that captures the real clinical encounter.</p>
    </div>
  );
}

// Export with metadata and component
export default {
  ...metadata,
  component: Post4Content,
};