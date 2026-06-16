import { NextResponse } from 'next/server';

const API_BASE = "https://api.konkon.id";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("authorization") || "";

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: "no-store"
    };

    if (authHeader) {
      (fetchOptions.headers as any)["Authorization"] = authHeader;
    }

    const res = await fetch(`${API_BASE}/api/relationships/request`, fetchOptions);
    
    let data;
    try {
      data = await res.json();
    } catch (err) {
      return NextResponse.json({ success: false, message: "Server backend mengembalikan respon yang tidak valid. Pastikan backend sudah di-deploy." }, { status: 502 });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
