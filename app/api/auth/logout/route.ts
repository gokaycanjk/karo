import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Çıkış başarılı." });
  response.cookies.delete("karo_token");
  return response;
}