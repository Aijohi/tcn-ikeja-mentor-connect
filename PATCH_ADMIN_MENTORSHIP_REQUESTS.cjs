const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "src",
  "pages",
  "AdminDashboard.jsx",
);

if (!fs.existsSync(file)) {
  console.error("Could not find src/pages/AdminDashboard.jsx");
  process.exit(1);
}

const backup = `${file}.before-admin-request-rpc-fix`;

if (!fs.existsSync(backup)) {
  fs.copyFileSync(file, backup);
}

let source = fs.readFileSync(file, "utf8");

/* =========================================================
   1. RequestsPage list
========================================================= */

const requestsStart = source.indexOf(
  "function RequestsPage()",
);

const detailsStart = source.indexOf(
  "function RequestDetailsPage",
  requestsStart,
);

if (
  requestsStart === -1 ||
  detailsStart === -1
) {
  console.error(
    "Could not locate RequestsPage or RequestDetailsPage.",
  );
  process.exit(1);
}

let requestsSection = source.slice(
  requestsStart,
  detailsStart,
);

const oldListQuery =
  /const \{ data, error: requestError \} = await supabase[\s\S]*?\.from\("mentorship_requests"\)[\s\S]*?\.order\("created_at", \{\s*ascending: false,\s*\}\);/m;

if (!oldListQuery.test(requestsSection)) {
  console.error(
    "Could not find the mentorship_requests query inside RequestsPage.",
  );
  process.exit(1);
}

requestsSection =
  requestsSection.replace(
    oldListQuery,
`const {
        data,
        error: requestError,
      } = await supabase.rpc(
        "get_admin_mentorship_requests",
      );`,
  );

source =
  source.slice(0, requestsStart) +
  requestsSection +
  source.slice(detailsStart);


/* =========================================================
   2. RequestDetailsPage main request
========================================================= */

const updatedDetailsStart =
  source.indexOf(
    "function RequestDetailsPage",
  );

const detailsEndCandidates = [
  source.indexOf(
    "function RequestParticipant",
    updatedDetailsStart,
  ),
  source.indexOf(
    "function MessagesPage",
    updatedDetailsStart,
  ),
].filter(
  (index) =>
    index !== -1,
);

const detailsEnd =
  detailsEndCandidates.length > 0
    ? Math.min(
        ...detailsEndCandidates,
      )
    : source.length;

let detailsSection =
  source.slice(
    updatedDetailsStart,
    detailsEnd,
  );

const detailBlock =
  /const detailedSelection = `[\s\S]*?if \(!isMounted\) \{\s*return;\s*\}/m;

if (!detailBlock.test(detailsSection)) {
  console.error(
    "Could not find the request-details query block.",
  );
  process.exit(1);
}

detailsSection =
  detailsSection.replace(
    detailBlock,
`const {
        data: requestData,
        error: requestError,
      } = await supabase.rpc(
        "get_admin_mentorship_request",
        {
          p_request_id:
            requestId,
        },
      );

      const result = {
        data:
          requestData ??
          null,
        error:
          requestError,
      };

      if (!isMounted) {
        return;
      }`,
  );


/* =========================================================
   3. RequestDetailsPage referral history
========================================================= */

const referralBlock =
  /const \{\s*data: referralRows,\s*error: referralHistoryError,\s*\} = await supabase[\s\S]*?\.from\("mentorship_request_referrals"\)[\s\S]*?\.order\("created_at", \{\s*ascending: true,\s*\}\);/m;

if (referralBlock.test(detailsSection)) {
  detailsSection =
    detailsSection.replace(
      referralBlock,
`const {
        data: referralRows,
        error: referralHistoryError,
      } = await supabase.rpc(
        "get_admin_mentorship_request_referrals",
        {
          p_request_id:
            requestId,
        },
      );`,
    );
}

source =
  source.slice(
    0,
    updatedDetailsStart,
  ) +
  detailsSection +
  source.slice(
    detailsEnd,
  );

fs.writeFileSync(
  file,
  source,
  "utf8",
);

console.log("");
console.log("Admin mentorship request fix applied.");
console.log("");
console.log("Updated:");
console.log("- RequestsPage list now uses get_admin_mentorship_requests()");
console.log("- RequestDetailsPage now uses get_admin_mentorship_request()");
console.log("- Referral history now uses get_admin_mentorship_request_referrals()");
console.log("");
console.log("Backup:");
console.log(backup);
console.log("");
console.log("Next run:");
console.log("npm run build");
