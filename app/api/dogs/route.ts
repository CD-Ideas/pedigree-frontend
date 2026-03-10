import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("dogs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/dogs error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("GET /api/dogs error:", error);
    return NextResponse.json(
      { error: "Failed to load dogs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("POST /api/dogs body:", body);

    const { name, breed, sex, dateOfBirth, sire, dam } = body;

    if (!name || !breed || !sex || !dateOfBirth) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("dogs")
      .insert([
        {
          name: String(name).trim(),
          breed: String(breed).trim(),
          sex: String(sex).trim(),
          dateOfBirth,
          sire: sire ? String(sire).trim() : "",
          dam: dam ? String(dam).trim() : "",
        },
      ])
      .select();

    if (error) {
      console.error("POST /api/dogs error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Dog saved successfully!", data },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/dogs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
