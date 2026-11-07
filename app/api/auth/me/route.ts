import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "karo-super-gizli-anahtar-2026";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("karo_token")?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      email: string;
    };
    return NextResponse.json({
      user: { username: decoded.username, email: decoded.email },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}