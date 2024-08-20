// Navigation links
export const NAV_LINKS = [
  { name: 'Home', page: 'main', icon: "home" },
  { name: 'Account', page: 'account', icon: "person" },
  { name: 'Feedback', page: 'feedback', icon: "add_comment" },
  { name: 'Log Out', action: 'logout', icon: "logout" }
];

// List of available subscription plans
export const PLANS = ['free', 'standard', 'pro'];

// Features based on the plan
export const PLAN_FEATURES = {
  free: ['Slow Clinic'],
  standard: ['Busy Clinic'],
  pro: ['Booked Solid']
};

// Helper function to get features based on the plan
export const getPlanFeatures = (plan) => {
  return PLAN_FEATURES[plan] || [];
};

// Notes
export const NOTES = [
  "Patient presents with chronic lower back pain that has persisted for over six months. The pain is described as a dull ache that intensifies with prolonged sitting or standing. Upon examination, restricted range of motion in the lumbar spine is noted, along with muscle tension in the paraspinal muscles. Palpation reveals tender points in the L4-L5 region. Initial treatment plan includes spinal manipulation, soft tissue therapy, and prescribed stretching exercises to improve flexibility and reduce pain.",
  "Patient presents with acute neck pain following a minor car accident three days ago. Reports stiffness and limited range of motion, particularly when turning the head to the left. Examination reveals muscle spasms in the cervical region and slight misalignment of C5-C6 vertebrae. No neurological deficits are observed. Treatment initiated with gentle cervical adjustments, cold therapy, and neck stabilization exercises to reduce inflammation and improve mobility.",
  "Patient presents with complaints of frequent tension headaches, occurring 3-4 times per week. Describes the pain as a tight band around the head, often accompanied by neck and shoulder tension. Postural assessment reveals forward head posture and rounded shoulders. Palpation identifies trigger points in the upper trapezius and suboccipital muscles. Treatment plan includes cervical spine adjustments, myofascial release techniques, and postural correction exercises.",
  "Patient presents with symptoms of sciatica in the right leg, reporting sharp, shooting pain from the lower back down to the calf. Pain is exacerbated by sitting for long periods and when bending forward. Straight leg raise test is positive at 45 degrees on the right side. MRI reveals a mild disc bulge at L5-S1. Treatment approach includes spinal decompression therapy, McKenzie exercises, and ergonomic advice to alleviate pressure on the affected nerve root.",
  "Patient presents with bilateral knee pain, gradually worsening over the past year. Reports difficulty with stairs and prolonged walking. Examination shows crepitus in both knees and reduced flexion range of motion. X-rays indicate mild osteoarthritis in both knee joints. Treatment plan focuses on improving joint mobility through gentle mobilizations, strengthening exercises for the quadriceps and hamstrings, and recommendations for weight management to reduce stress on the knee joints.",
  "Patient presents with complaints of jaw pain and clicking when opening the mouth. Reports clenching teeth at night and frequent headaches. Examination reveals tenderness in the masseter and temporalis muscles, with limited mouth opening capacity. Diagnosed with temporomandibular joint (TMJ) disorder. Treatment includes intra-oral adjustments, myofascial release of the affected muscles, and instruction in jaw relaxation techniques and proper sleeping posture.",
  "Patient presents with plantar fasciitis in the left foot, experiencing sharp heel pain especially with the first steps in the morning. Pain has been persistent for two months, affecting daily activities. Examination shows tenderness at the medial calcaneal tubercle and tightness in the calf muscles. Treatment plan includes Graston technique to break down scar tissue, ultrasound therapy for inflammation reduction, and prescribed stretching exercises for the plantar fascia and Achilles tendon.",
  "Patient presents with thoracic spine pain and stiffness, reporting difficulty with deep breathing and twisting movements. Occupation involves long hours at a computer. Postural assessment reveals increased thoracic kyphosis and protracted shoulders. Palpation identifies multiple trigger points in the rhomboids and middle trapezius. Treatment focuses on thoracic spine mobilizations, postural taping, and ergonomic workspace modifications to improve spinal alignment and reduce muscle tension.",
  "Patient presents with symptoms of carpal tunnel syndrome in both hands, reporting numbness and tingling in the thumb, index, and middle fingers. Symptoms worsen at night and during computer use. Positive Phalen's and Tinel's tests. Treatment plan includes wrist adjustments, nerve flossing exercises, and instruction in proper ergonomics for keyboard and mouse use. Additionally, night splints are recommended to maintain neutral wrist position during sleep.",
  "Patient presents with vertigo and balance issues, reporting episodes of dizziness and nausea, particularly when turning the head quickly. Examination reveals restricted movement in the upper cervical spine and positive findings in the Dix-Hallpike test, suggesting benign paroxysmal positional vertigo (BPPV). Treatment includes gentle upper cervical adjustments, Epley maneuver for repositioning of otoliths, and prescribed vestibular rehabilitation exercises to improve balance and reduce dizziness symptoms."
];

// Transcripts
export const TRANSCRIPTS = [
  "Patient Consultation - Discussed treatment options for chronic lower back pain",
  "Follow-up Appointment - Reviewed progress of neck pain management",
  "New Patient Intake - Conducted initial assessment for shoulder discomfort",
  "Treatment Plan Discussion - Outlined approach for managing sciatica symptoms",
  "Patient Education Session - Explained proper posture and ergonomics",
  "Progress Evaluation - Assessed improvements in headache frequency and intensity",
  "Rehabilitation Instructions - Guided patient through exercises for knee strengthening",
  "Nutritional Counseling - Discussed anti-inflammatory diet for joint health",
  "Imaging Review - Analyzed X-rays of lumbar spine with patient",
  "Discharge Summary - Concluded treatment plan for resolved ankle injury"
];