import { NextResponse } from 'next/server';

const API_BASE = "https://api.konkon.id";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ success: false, message: "Username required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/stats/${encodeURIComponent(username)}`, { cache: "no-store" });
    const data = await res.json();
    
    // Stats API returns data directly, check created_at to verify existence
    if (!data.created_at) {
       return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("User stats API error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
