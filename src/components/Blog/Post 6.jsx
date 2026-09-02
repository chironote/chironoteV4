import React from 'react';

const metadata = {
  title: 'Stop Asking AI for Answers. Start Asking It for Questions.',
  synopsis: 'LLMs can be useful clinical-thinking tools when they are grounded in evidence, used to challenge your reasoning, and kept away from protected health information.',
  slug: 'stop-asking-ai-for-answers',
};

function Post6Content() {
  return (
    <div>
      <p>Is it acceptable to leverage new AI technology to help diagnose? Here is a short article to explain and discuss the pros and cons.</p>
      <p>Chances are, if you are already using ChatGPT instead of going down the list of differentials yourself, you have already killed your first patient. But for one reason or another, the board decided it wasn't really your fault, and that these are just growing pains.</p>
      <p>But seriously: every single LLM (large language model, or text AI) comes with a clear disclaimer that this technology is not a doctor and cannot replace one. They know because they've tried. Google, for example, introduced several medical products very early in the AI race and was actively working on an image model that could handle analysis of advanced medical imaging.</p>
      <p>That effort has gone quiet lately, and I'm sure we can all think of two or three good reasons right off the top of our heads. First, hallucinations are still very much a thing — no longer considered a side effect of our early efforts to harness AI, but rather a built-in structural limitation of what is essentially autocorrect on steroids.</p>
      <p>Second, even when the “reasoning” of an AI model isn't outright made up, that doesn't mean it arrives at the right answer. These mistakes tend to stem from the models following a fairly standard line of reasoning, often just presenting information you already know.</p>
      <p>Finally, there's the old principle of garbage in, garbage out — the results are only as good as the information collected during the exam. If you ask an AI for clinical insight based on an exam you performed, chances are you were already approaching the problem from a certain angle: suspicious of one condition, ruling out similar ones, and ruling in the one you suspect most.</p>
      <p>Honestly, the list goes on, but does that mean this technology shouldn't be used to help your clinical process? My answer is a resounding no — it's very useful and should be leveraged for better outcomes.</p>
      <h2>Ground AI in real-world information</h2>
      <p>Hallucinations are a serious problem, but one that can be significantly reduced by grounding your requests in real-world information. My favorite method is a simple prompting workflow. Say you want to ask, “Why is my patient having toe pain?” Prefix it with: “According to frequently cited, peer-reviewed articles in trusted publications, why is my patient having toe pain?”</p>
      <p>Provided you're using an AI with search capabilities, you've just instructed it to disregard its generalist views in favor of concrete evidence from the articles it chooses. Reinforce this further by asking for the cited articles at the end — due to how LLMs work, this further grounds the model in accuracy.</p>
      <h2>Use the right model</h2>
      <p>I know it can feel overwhelming given how many models are on the market, but trust your common sense here. Thinking models perform considerably better on tasks like this, so if it takes 5 or even 30 seconds to “think” through the answer, chances are you'll get a much higher-quality response instead of the usual slop.</p>
      <h2>Ask better questions</h2>
      <p>To avoid cliché answers that offer no real insight, ask more specific questions. The more specific your question — the closer it resembles something you'd ask yourself before doing your own research — the more useful the answer will be. Don't ask, “What's wrong with my patient?” Instead, ask something like, “Why does my patient show slower-than-normal response to care, along with fluctuating symptoms?”</p>
      <h2>Have AI ask you questions</h2>
      <p>Another way to engage your AI is to have it ask the questions. If you feel stuck on a particular case, instead of asking the AI a question, have it ask you some hard questions about the case. I find this to be by far the most useful way to leverage this technology, because the challenge forces me to clarify my thinking and re-evaluate my grasp of the case.</p>
      <h2>Bring it in at the right time</h2>
      <p>Final piece of advice: don't bring AI in as a “consultant” too early in the process. It's almost funny how hard big corporations are trying to introduce bots that take patient histories for you — but we clinicians know that job is reserved for interns, so we can properly make them feel small and inexperienced before we walk into the room and steal the show.</p>
      <p>On the flip side, if you have a re-exam coming up and realize you're unclear on the underlying issues, that's a good time to bring in an LLM — to suggest other orthopedic tests to narrow the differential, or to raise insightful questions that simply don't come to mind on your own.</p>
      <p><strong>Disclaimer:</strong> it's far too early to bring these foundation models into the clinical process in any kind of production capacity — but that doesn't mean you don't have a useful tool at your disposal when you need one. One more important disclaimer: do not put PHI into general LLMs. Chances are you might get away with it, but it's a disrespectful way to treat the vulnerable information patients entrust to you. At the very least, make a concrete effort to strip identifying information before inputting clinical data.</p>
    </div>
  );
}

const post = {
  ...metadata,
  component: Post6Content,
};

export default post;
