const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const FINAL_CATEGORIES = `const mentorshipCategories = [
  "Career Development",
  "Business & Entrepreneurship",
  "Leadership & Management",
  "Faith, Spirituality & Ministry",
  "Personal Development",
  "Education & Academic Development",
  "Technology & Digital Skills",
  "Finance & Stewardship",
  "Creative Arts, Media & Communication",
  "Family, Relationships & Parenting",
  "Health & Wellbeing",
  "Trades & Vocational Skills",
  "Social Impact",
];`;

const files = [
  path.join(ROOT, "src", "pages", "CompleteProfile.jsx"),
  path.join(ROOT, "src", "pages", "BecomeAMentor.jsx"),
  path.join(ROOT, "src", "pages", "MentorApplicationStatus.jsx"),
].filter(fs.existsSync);

const cssFiles = [
  path.join(ROOT, "src", "pages", "CompleteProfile.css"),
  path.join(ROOT, "src", "pages", "BecomeAMentor.css"),
  path.join(ROOT, "src", "pages", "MentorApplicationStatus.css"),
].filter(fs.existsSync);

const adminCss = path.join(
  ROOT,
  "src",
  "pages",
  "AdminLaunchFixes.css",
);

function backup(file) {
  const target = `${file}.before-final-mentor-cleanup`;
  if (!fs.existsSync(target)) {
    fs.copyFileSync(file, target);
  }
}

function replaceCategories(source) {
  return source.replace(
    /const\s+mentorshipCategories\s*=\s*\[[\s\S]*?\];/m,
    FINAL_CATEGORIES,
  );
}

function removeExpertiseValidation(source) {
  return source
    .replace(
      /\n\s*const expertise\s*=\s*(?:convertTextToArray|splitCommaSeparatedValues)\([\s\S]*?form\.expertise[\s\S]*?\);\s*/m,
      "\n",
    )
    .replace(
      /\n\s*if\s*\(\s*expertise\.length\s*===\s*0\s*\)\s*\{[\s\S]*?\}\s*/m,
      "\n",
    )
    .replace(
      /\n\s*if\s*\(\s*!expertise\.length\s*\)\s*\{[\s\S]*?\}\s*/m,
      "\n",
    );
}

function removeExpertiseInput(source) {
  const patterns = [
    /<label[^>]*>\s*Areas of expertise[\s\S]*?<\/label>/m,
    /<label[^>]*>\s*Specific expertise or skills[\s\S]*?<\/label>/m,
    /<div[^>]*>\s*<label[^>]*>\s*Areas of expertise[\s\S]*?<\/label>\s*<\/div>/m,
  ];

  let updated = source;

  for (const pattern of patterns) {
    updated = updated.replace(pattern, "");
  }

  return updated;
}

function keepBackendCompatible(source) {
  return source
    .replace(
      /p_expertise:\s*expertise/g,
      "p_expertise: form.categories",
    )
    .replace(
      /p_expertise:\s*convertTextToArray\(\s*form\.expertise\s*\)/g,
      "p_expertise: form.categories",
    )
    .replace(
      /p_expertise:\s*splitCommaSeparatedValues\(\s*form\.expertise\s*\)/g,
      "p_expertise: form.categories",
    )
    .replace(
      /p_expertise:\s*categories/g,
      "p_expertise: categories",
    );
}

function improveCategoryCopy(source) {
  return source
    .replaceAll(
      "Mentorship categories",
      "Areas you want to mentor in",
    )
    .replaceAll(
      "Select every category you can confidently support.",
      "Select all the areas where you would like to mentor.",
    )
    .replaceAll(
      "Please select at least one mentorship category.",
      "Please select at least one mentoring area.",
    )
    .replaceAll(
      "Please select at least one mentorship area.",
      "Please select at least one mentoring area.",
    );
}

function updateJsx(file) {
  let source = fs.readFileSync(file, "utf8");

  backup(file);

  source = replaceCategories(source);
  source = removeExpertiseValidation(source);
  source = removeExpertiseInput(source);
  source = keepBackendCompatible(source);
  source = improveCategoryCopy(source);

  fs.writeFileSync(file, source, "utf8");
}

const formCssPatch = `

/* =========================================================
   FINAL MENTORING OPTION FOCUS
   Keep the option border thin and neutral.
   ========================================================= */

.mentor-onboarding-form label:has(input[type="checkbox"]),
.mentor-application-form label:has(input[type="checkbox"]) {
  border-width: 1px !important;
  box-shadow: none !important;
}

.mentor-onboarding-form label:has(input[type="checkbox"]:checked),
.mentor-application-form label:has(input[type="checkbox"]:checked) {
  border: 1px solid #4c5867 !important;
  background: #ffffff !important;
  box-shadow: none !important;
}

.mentor-onboarding-form input[type="checkbox"],
.mentor-application-form input[type="checkbox"] {
  accent-color: #ff5303 !important;
}

.mentor-onboarding-form input[type="checkbox"]:focus,
.mentor-onboarding-form input[type="checkbox"]:focus-visible,
.mentor-application-form input[type="checkbox"]:focus,
.mentor-application-form input[type="checkbox"]:focus-visible {
  outline: 1px solid #97aac2 !important;
  outline-offset: 2px !important;
  box-shadow: none !important;
}
`;

const centreModalPatch = `

/* =========================================================
   RESTORE ADMIN MENTOR REVIEW TO CENTRE MODAL
   The component class names are retained, but visually this
   restores the centred modal the admin platform used before.
   ========================================================= */

.admin-review-drawer-backdrop {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;

  display: flex !important;
  align-items: flex-start !important;
  justify-content: center !important;

  padding: 42px 20px !important;

  overflow-y: auto !important;

  background: rgba(16, 20, 25, 0.48) !important;
  backdrop-filter: blur(1px) !important;
}

.admin-review-drawer,
.admin-application-review-drawer {
  width: min(980px, calc(100vw - 40px)) !important;
  height: auto !important;
  max-height: none !important;

  display: block !important;

  margin: auto !important;

  overflow: visible !important;

  border: 1px solid #e4e8ef !important;
  border-radius: 18px !important;

  background: #ffffff !important;

  box-shadow:
    0 24px 70px
    rgba(16, 24, 40, 0.22) !important;

  animation: none !important;
}

.admin-review-drawer-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 2 !important;

  padding: 24px 28px 20px !important;

  border-bottom: 1px solid #e7eaee !important;
  border-radius: 18px 18px 0 0 !important;

  background: #ffffff !important;
}

.admin-review-drawer-body {
  min-height: auto !important;
  overflow: visible !important;

  padding: 26px 28px 8px !important;
}

.admin-review-drawer-footer {
  position: static !important;

  padding: 18px 28px 24px !important;

  border-top: 1px solid #e7eaee !important;
  border-radius: 0 0 18px 18px !important;

  background: #ffffff !important;
}

@media (max-width: 760px) {
  .admin-review-drawer-backdrop {
    padding: 18px 12px !important;
  }

  .admin-review-drawer,
  .admin-application-review-drawer {
    width: 100% !important;
    border-radius: 14px !important;
  }

  .admin-review-drawer-header,
  .admin-review-drawer-body,
  .admin-review-drawer-footer {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
}
`;

function appendOnce(file, marker, content) {
  if (!fs.existsSync(file)) {
    return;
  }

  backup(file);

  let source = fs.readFileSync(file, "utf8");

  if (!source.includes(marker)) {
    source += content;
    fs.writeFileSync(file, source, "utf8");
  }
}

try {
  for (const file of files) {
    updateJsx(file);
  }

  for (const cssFile of cssFiles) {
    appendOnce(
      cssFile,
      "FINAL MENTORING OPTION FOCUS",
      formCssPatch,
    );
  }

  appendOnce(
    adminCss,
    "RESTORE ADMIN MENTOR REVIEW TO CENTRE MODAL",
    centreModalPatch,
  );

  console.log("");
  console.log("Done.");
  console.log("");
  console.log("This update:");
  console.log("- removes the Areas of expertise input");
  console.log("- keeps only the mentoring-area list");
  console.log("- adds the final 13 mentoring areas");
  console.log("- keeps backend submission compatible");
  console.log("- removes the thick orange option border");
  console.log("- restores the admin mentor review to a centre modal");
  console.log("");
  console.log("Now run: npm run build");
} catch (error) {
  console.error("");
  console.error("Update stopped:");
  console.error(error.message);
  console.error("");
  process.exit(1);
}
