import { createClient } from "@supabase/supabase-js";

console.log("🕵️‍♂️ Starting LeetCode GraphQL Scraper...");

const supabaseUrl =;
// ⚠️ IMPORTANT: Load your secret key from .env
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// A simple delay function so LeetCode doesn't block our IP for spamming
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The exact GraphQL query LeetCode uses under the hood to fetch problem data
const fetchLeetCodeDescription = async (titleSlug) => {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        content
      }
    }
  `;

  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        operationName: "questionData",
        variables: { titleSlug },
        query: query,
      }),
    });

    const data = await response.json();
    return data?.data?.question?.content || null;
  } catch (error) {
    console.error(`\n⚠️ Network error fetching ${titleSlug}:`, error.message);
    return null;
  }
};

const runScraper = async () => {
  console.log("🔍 Finding problems with missing descriptions in Supabase...");

  // 1. Fetch ONLY the problems that have our placeholder text
  const { data: missingProblems, error: fetchError } = await supabase
    .from("problems")
    .select("id, title")
    .eq(
      "description",
      "Description not available locally. Please view on LeetCode.",
    );

  if (fetchError) {
    return console.error("❌ Failed to query database:", fetchError.message);
  }

  if (!missingProblems || missingProblems.length === 0) {
    return console.log(
      "✅ All problems in the database already have descriptions!",
    );
  }

  console.log(
    `🎯 Found ${missingProblems.length} problems to scrape. Beginning fetch...\n`,
  );

  let successCount = 0;
  let failCount = 0;

  // 2. Loop through and scrape
  for (let i = 0; i < missingProblems.length; i++) {
    const problem = missingProblems[i];
    process.stdout.write(
      `Fetching [${i + 1}/${missingProblems.length}]: ${problem.id}... `,
    );

    // Call the LeetCode API
    const htmlContent = await fetchLeetCodeDescription(problem.id);

    if (htmlContent) {
      // 3. Update Supabase with the real description
      const { error: updateError } = await supabase
        .from("problems")
        .update({ description: htmlContent })
        .eq("id", problem.id);

      if (updateError) {
        console.log(`❌ DB Update Failed: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`✅ Success!`);
        successCount++;
      }
    } else {
      console.log(`⏭️ Skipped (Not found on LeetCode or premium locked)`);
      failCount++;
    }

    // ⏳ Wait 1.5 seconds before asking LeetCode for the next one to avoid getting banned
    await sleep(1500);
  }

  console.log(`\n🎉 Scraping Complete!`);
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`⚠️ Failed or Premium locked: ${failCount}`);
};

runScraper();
