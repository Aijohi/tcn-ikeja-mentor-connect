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

const jsxFiles = [
  path.join(ROOT, "src", "pages", "CompleteProfile.jsx"),
  path.join(ROOT, "src", "pages", "BecomeAMentor.jsx"),
].filter(fs.existsSync);

const cssFiles = [
  path.join(ROOT, "src", "pages", "CompleteProfile.css"),
  path.join(ROOT, "src", "pages", "BecomeAMentor.css"),
].filter(fs.existsSync);

function backup(file) {
  const backupPath = `${file}.before-mentor-list-update`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(file, backupPath);
  }
}

function updateCategories(source) {
  const matcher =
    /const\s+mentorshipCategories\s*=\s*\[[\s\S]*?\];/m;

  if (!matcher.test(source)) {
    throw new Error(
      "Could not find const mentorshipCategories in " + source.slice(0, 80),
    );
  }

  return source.replace(
    matcher,
    FINAL_CATEGORIES,
  );
}

function removeExpertiseField(source) {
  let updated = source;

  // Remove common expertise input blocks.
  updated = updated.replace(
    /<label[^>]*>\s*(?:Areas of expertise|Specific expertise or skills)[\s\S]*?<\/label>/m,
    "",
  );

  updated = updated.replace(
    /<div[^>]*>\s*<label[^>]*>\s*(?:Areas of expertise|Specific expertise or skills)[\s\S]*?<\/label>\s*<\/div>/m,
    "",
  );

  // Remove common expertise validation.
  updated = updated.replace(
    /\n\s*const\s+expertise\s*=\s*(?:convertTextToArray|splitCommaSeparatedValues)\([\s\S]*?form\.expertise[\s\S]*?\);\s*/m,
    "\n",
  );

  updated = updated.replace(
    /\n\s*if\s*\(\s*!?expertise(?:\.length)?[\s\S]*?\)\s*\{[\s\S]*?(?:expertise|area of expertise)[\s\S]*?\}\s*/mi,
    "\n",
  );

  // Preserve DB compatibility by sending selected mentoring areas
  // into the existing p_expertise parameter where the RPC still expects it.
  updated = updated.replace(
    /p_expertise:\s*expertise/g,
    "p_expertise: form.categories",
  );

  updated = updated.replace(
    /p_expertise:\s*(?:convertTextToArray|splitCommaSeparatedValues)\(\s*form\.expertise\s*\)/g,
    "p_expertise: form.categories",
  );

  // Clear old expertise field reads if still present in initial form state.
  updated = updated.replace(
    /expertise:\s*profile\?\.expertise\s*\?\?\s*""\s*,?/g,
    "",
  );

  updated = updated.replace(
    /expertise:\s*""\s*,?/g,
    "",
  );

  return updated;
}

function improveCopy(source) {
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

const cssPatch = `

/* FINAL MENTORING AREA SELECTION */
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

try {
  if (jsxFiles.length === 0) {
    throw new Error(
      "CompleteProfile.jsx and BecomeAMentor.jsx were not found under src/pages.",
    );
  }

  for (const file of jsxFiles) {
    backup(file);

    let source = fs.readFileSync(file, "utf8");

    source = updateCategories(source);
    source = removeExpertiseField(source);
    source = improveCopy(source);

    fs.writeFileSync(file, source, "utf8");
  }

  for (const file of cssFiles) {
    backup(file);

    let source = fs.readFileSync(file, "utf8");

    if (!source.includes("FINAL MENTORING AREA SELECTION")) {
      source += cssPatch;
      fs.writeFileSync(file, source, "utf8");
    }
  }

  console.log("");
  console.log("Mentor form update completed.");
  console.log("- Expertise input removed");
  console.log("- Final 13 mentoring areas added");
  console.log("- Thick orange option border removed");
  console.log("- Admin modal CSS was NOT touched");
  console.log("");
  console.log("Next: npm run build");
} catch (error) {
  console.error("");
  console.error("Update stopped:");
  console.error(error.message);
  process.exit(1);
}
