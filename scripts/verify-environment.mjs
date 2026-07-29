const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

let projectRef = "";
try {
  projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  process.exit(1);
}

const expectedRef = process.env.EXPECTED_SUPABASE_PROJECT_REF;
if (!expectedRef) {
  console.error("EXPECTED_SUPABASE_PROJECT_REF must be set for each deployment environment.");
  process.exit(1);
}

if (projectRef !== expectedRef) {
  console.error(
    `Environment mismatch: Supabase URL points to "${projectRef}", expected "${expectedRef}".`
  );
  process.exit(1);
}

const deploymentEnvironment =
  process.env.DEPLOYMENT_ENVIRONMENT ?? process.env.VERCEL_ENV ?? "local";
const protectedProductionRef = process.env.PRODUCTION_SUPABASE_PROJECT_REF;

if (
  deploymentEnvironment !== "production" &&
  protectedProductionRef &&
  projectRef === protectedProductionRef
) {
  console.error(
    `Refusing to use production Supabase project "${projectRef}" from "${deploymentEnvironment}".`
  );
  process.exit(1);
}

console.log(
  `Environment verified: ${deploymentEnvironment} -> Supabase project ${projectRef}.`
);
