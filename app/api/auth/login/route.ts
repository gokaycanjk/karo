import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "karo-super-gizli-anahtar-2026";

export async function POST(req: Request) {
  try {
    const { emailOrUser, password } = await req.json();

    if (!emailOrUser || !password) {
      return NextResponse.json(
        { error: "Lütfen tüm alanları doldurun." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUser.trim().toLowerCase() },
          { username: emailOrUser.trim() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı adı veya şifre hatalı." },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Kullanıcı adı veya şifre hatalı." },
        { status: 401 }
      );
    }

    // JWT token üretimi
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({
      message: "Giriş başarılı!",
      user: { username: user.username, email: user.email },
    });

    // Oturum çerezini kaydet
    response.cookies.set("karo_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 gün
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Giriş hatası:", error);
    return NextResponse.json(
      { error: "Giriş sırasında hata oluştu." },
      { status: 500 }
    );
  }
}