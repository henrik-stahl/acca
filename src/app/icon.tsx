import { readFileSync } from "fs";
import { join } from "path";

export const contentType = "image/png";

export default function Icon() {
  const isStaging = process.env.NEXT_PUBLIC_ENVIRONMENT === "staging";
  const filename = isStaging ? "favicon-staging.png" : "favicon-prod.png";
  const filePath = join(process.cwd(), "public", filename);
  const fileBuffer = readFileSync(filePath);

  return new Response(fileBuffer, {
    headers: { "Content-Type": "image/png" },
  });
}
