import "dotenv/config";
import { vectorService } from "@/lib/vector";

const userId = process.argv[2] ?? "abNtuxr8fbdzjdIgRtNBz0p4ehdY66qC";
const queryText = process.argv[3] ?? "bottom-up parsing in compilers";
const topK = Number(process.argv[4] ?? 5);

async function main() {
  console.log(
    `\nQuery: "${queryText}"\nuserId=${userId}  sourceType=note  topK=${topK}\n`,
  );
  const hits = await vectorService.query({
    userId,
    sourceType: "note",
    queryText,
    topK,
  });

  console.log(`Got ${hits.length} hit(s):\n`);
  for (const [index, hit] of hits.entries()) {
    const preview = hit.content.replace(/\s+/g, " ").slice(0, 240);
    console.log(`#${index + 1}  score=${hit.score.toFixed(4)}`);
    console.log(`    sourceType=${hit.sourceType}  sourceId=${hit.sourceId}  chunk=${hit.chunkIndex}`);
    console.log(`    metadata=${JSON.stringify(hit.metadata)}`);
    console.log(`    content: ${preview}${hit.content.length > 240 ? "..." : ""}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
