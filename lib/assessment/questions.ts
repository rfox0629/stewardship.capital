export type AssessmentOption = {
  label: string;
  value: string;
  score: number;
};

export type AssessmentPillar = "Protect" | "Grow" | "Transfer" | "Impact";

export type AssessmentQuestion = {
  id: string;
  pillar: AssessmentPillar;
  prompt: string;
  helper: string;
  options: AssessmentOption[];
};

const yesNoNotSure: AssessmentOption[] = [
  { label: "Yes", value: "yes", score: 4 },
  { label: "No", value: "no", score: 1 },
  { label: "Not sure", value: "not_sure", score: 2 },
];

export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: "documents-organized",
    pillar: "Protect",
    prompt: "Are your most important financial, estate, tax, and insurance documents easy to find?",
    helper: "Think about whether your household could locate the right records quickly.",
    options: yesNoNotSure,
  },
  {
    id: "family-knows-next-step",
    pillar: "Protect",
    prompt: "If something happened to you, would your family know who to call first?",
    helper: "This can include a spouse, trusted family member, advisor, attorney, or other professional contact.",
    options: yesNoNotSure,
  },
  {
    id: "estate-awareness",
    pillar: "Protect",
    prompt: "Do you know whether your estate documents reflect your current wishes?",
    helper: "This is only a readiness question, not a request for legal details.",
    options: yesNoNotSure,
  },
  {
    id: "coverage-review",
    pillar: "Protect",
    prompt: "Have you reviewed your major insurance coverage with a professional in the last few years?",
    helper: "Include life, disability, liability, business, property, or other protection topics that apply to you.",
    options: yesNoNotSure,
  },
  {
    id: "emergency-readiness",
    pillar: "Protect",
    prompt: "How confident are you in your household emergency readiness?",
    helper: "Answer based on clarity and preparedness, not a dollar amount.",
    options: [
      { label: "Confident", value: "confident", score: 4 },
      { label: "Somewhat prepared", value: "somewhat_prepared", score: 3 },
      { label: "Not prepared", value: "not_prepared", score: 1 },
      { label: "Not sure", value: "not_sure", score: 2 },
    ],
  },
  {
    id: "growth-goals",
    pillar: "Grow",
    prompt: "Do you have written goals for your business, career, real estate, or investment growth?",
    helper: "This is about direction and clarity, not performance reporting.",
    options: yesNoNotSure,
  },
  {
    id: "financial-picture",
    pillar: "Grow",
    prompt: "Can you see your major stewardship areas in one organized picture?",
    helper: "Include finances, business, real estate, giving, legacy, and professional team topics.",
    options: yesNoNotSure,
  },
  {
    id: "professional-team",
    pillar: "Grow",
    prompt: "Do you have a professional team you know how to coordinate when important decisions arise?",
    helper: "This may include tax, legal, insurance, investment, banking, or business professionals.",
    options: yesNoNotSure,
  },
  {
    id: "tax-planning-awareness",
    pillar: "Grow",
    prompt: "Do you know which tax-aware planning topics may be worth reviewing this year?",
    helper: "Answer based on awareness, not whether any specific strategy is right for you.",
    options: yesNoNotSure,
  },
  {
    id: "decision-rhythm",
    pillar: "Grow",
    prompt: "How often do you intentionally review major stewardship decisions?",
    helper: "Think about your planning rhythm with your household or professional team.",
    options: [
      { label: "At least annually", value: "annually", score: 4 },
      { label: "When something changes", value: "changes", score: 3 },
      { label: "Rarely", value: "rarely", score: 1 },
      { label: "Not sure", value: "not_sure", score: 2 },
    ],
  },
  {
    id: "values-documented",
    pillar: "Transfer",
    prompt: "Have you documented the values you want to transfer to future generations?",
    helper: "This can be simple notes, a family letter, a stewardship statement, or a more formal plan.",
    options: yesNoNotSure,
  },
  {
    id: "family-conversations",
    pillar: "Transfer",
    prompt: "Have you had meaningful family conversations about stewardship, legacy, and responsibility?",
    helper: "Answer based on whether the conversations have begun, not whether everything is complete.",
    options: yesNoNotSure,
  },
  {
    id: "decision-makers",
    pillar: "Transfer",
    prompt: "Have you named the people who should help make decisions if you cannot?",
    helper: "This is a readiness prompt and not a request to list names.",
    options: yesNoNotSure,
  },
  {
    id: "succession-awareness",
    pillar: "Transfer",
    prompt: "If you own a business, practice, or real estate, have you considered future transition topics?",
    helper: "Choose Not sure if this does not apply or you have not reviewed it.",
    options: yesNoNotSure,
  },
  {
    id: "next-generation-readiness",
    pillar: "Transfer",
    prompt: "How prepared do you feel to guide the next generation in wise stewardship?",
    helper: "This can include children, grandchildren, family members, team members, or future leaders.",
    options: [
      { label: "Well prepared", value: "well_prepared", score: 4 },
      { label: "Starting to prepare", value: "starting", score: 3 },
      { label: "Not prepared", value: "not_prepared", score: 1 },
      { label: "Not sure", value: "not_sure", score: 2 },
    ],
  },
  {
    id: "giving-philosophy",
    pillar: "Impact",
    prompt: "Do you have a clear giving philosophy or generosity plan?",
    helper: "This is about purpose and direction, not giving amounts.",
    options: yesNoNotSure,
  },
  {
    id: "kingdom-priorities",
    pillar: "Impact",
    prompt: "Can you name the Kingdom or community priorities you most want to support?",
    helper: "Examples may include church, missions, education, local needs, or causes aligned with your calling.",
    options: yesNoNotSure,
  },
  {
    id: "impact-review",
    pillar: "Impact",
    prompt: "Do you review your giving and impact decisions with intentionality each year?",
    helper: "Answer based on rhythm and clarity, not the size of your giving.",
    options: yesNoNotSure,
  },
  {
    id: "least-clear-area",
    pillar: "Impact",
    prompt: "Which stewardship area feels least clear right now?",
    helper: "This helps the dashboard identify your first priority area.",
    options: [
      { label: "Protect", value: "protect", score: 2 },
      { label: "Grow", value: "grow", score: 2 },
      { label: "Transfer", value: "transfer", score: 2 },
      { label: "Impact", value: "impact", score: 2 },
      { label: "Not sure", value: "not_sure", score: 1 },
    ],
  },
  {
    id: "first-guidance",
    pillar: "Impact",
    prompt: "Where would you value guidance first?",
    helper: "Your answer will help order early dashboard priorities.",
    options: [
      { label: "Protection and preparedness", value: "protect", score: 3 },
      { label: "Growth clarity", value: "grow", score: 3 },
      { label: "Family legacy", value: "transfer", score: 3 },
      { label: "Kingdom and community impact", value: "impact", score: 3 },
      { label: "Not sure yet", value: "not_sure", score: 2 },
    ],
  },
];
