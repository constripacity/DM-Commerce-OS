import { NextResponse } from "next/server";

export function databaseMutationError(error: unknown, entity: string) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : null;
  if (code === "P2002") {
    return NextResponse.json({ error: `${entity} already exists` }, { status: 409 });
  }
  if (code === "P2025") {
    return NextResponse.json({ error: `${entity} not found` }, { status: 404 });
  }
  if (code === "P2003") {
    return NextResponse.json(
      { error: `${entity} is still referenced by other records` },
      { status: 409 },
    );
  }
  console.error(`Unexpected ${entity.toLowerCase()} database mutation failure`, error);
  return NextResponse.json({ error: `Unable to save ${entity.toLowerCase()}` }, { status: 500 });
}
