export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

export async function GET() {
  const q = query(collection(db, "videos"), orderBy("createdAt", "desc"), limit(5));
  const snap = await getDocs(q);
  return NextResponse.json(snap.docs.map(d => ({id: d.id, ...d.data()})));
}
