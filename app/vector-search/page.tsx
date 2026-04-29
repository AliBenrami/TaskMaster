import { connection } from "next/server";
import { requireServerSession } from "@/lib/auth-session";
import { VectorSearchClient } from "./vector-search-client";

export default async function VectorSearchPage() {
  await connection();
  const session = await requireServerSession("/vector-search");

  return (
    <VectorSearchClient
      displayName={session.user.name || session.user.email}
    />
  );
}
