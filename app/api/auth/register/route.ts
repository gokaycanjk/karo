import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Lütfen tüm alanları doldurun." },
        { status: 400 }
      );
    }

    // Kullanıcı adı veya e-posta zaten kayıtlı mı kontrolü
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.trim().toLowerCase() },
          { username: username.trim() }
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu kullanıcı adı veya e-posta zaten kayıtlı." },
        { status: 400 }
      );
    }

    // Şifreyi hashleme
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: "Kayıt başarılı!", username: user.username },
      { status: 201 }
    );
  } catch (error) {
    console.error("Kayıt hatası:", error);
    return NextResponse.json(
      { error: "Kayıt sırasında bir hata meydana geldi." },
      { status: 500 }
    );
  }
}