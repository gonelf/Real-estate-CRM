import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const propertyId = formData.get("propertyId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!propertyId) {
      return NextResponse.json({ error: "No propertyId provided" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse with xlsx (handles .xlsx, .xls, .csv)
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Extract data from all sheets
    const allData: string[][] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });
      if (rows.length > 0) {
        allData.push(...rows);
      }
    }

    if (allData.length === 0) {
      return NextResponse.json({ error: "File is empty or unreadable" }, { status: 400 });
    }

    // Convert to a text representation for Gemini
    const csvText = allData
      .map((row) => row.join(" | "))
      .join("\n");

    // Send to Gemini 2.5 for lead detection
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a data extraction assistant for a real estate CRM. Analyze the following spreadsheet data and extract all leads (people/contacts) you can find.

The file may have any format, column names, or layout. Look for patterns that indicate:
- Person names (first name, last name, full name)
- Email addresses
- Phone numbers
- Physical/mailing addresses (street, city, state, zip)

Return ONLY a valid JSON array of objects. Each object must have exactly these fields:
- "name": string (full name of the person, required - skip rows without a name)
- "email": string (email address, empty string if not found)
- "phone": string (phone number, empty string if not found)
- "address": string (full address if found, empty string if not found)

Rules:
- Extract ALL leads found in the data
- If a row has no identifiable person name, skip it
- Combine first name + last name into a single "name" field when they are separate columns
- Clean up phone numbers to a consistent format
- If multiple addresses exist, use the most complete one
- Do NOT include header rows as leads
- Do NOT include any explanation, only the JSON array
- If no leads are found, return an empty array: []

Spreadsheet data:
${csvText}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse Gemini response - extract JSON from potential markdown code blocks
    let jsonStr = responseText.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let detectedLeads: Array<{
      name: string;
      email: string;
      phone: string;
      address: string;
    }>;

    try {
      detectedLeads = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      );
    }

    if (!Array.isArray(detectedLeads)) {
      return NextResponse.json(
        { error: "Unexpected AI response format. Please try again." },
        { status: 500 }
      );
    }

    // Normalize leads
    const leads = detectedLeads
      .filter((l) => l.name && l.name.trim())
      .map((l) => ({
        name: l.name.trim(),
        email: (l.email || "").trim(),
        phone: (l.phone || "").trim(),
        address: (l.address || "").trim(),
        status: "maybe" as const,
      }));

    // Save to Supabase if configured
    const supabase = getSupabase();
    if (supabase && leads.length > 0) {
      const supabaseRows = leads.map((l) => ({
        property_id: propertyId,
        name: l.name,
        email: l.email,
        phone: l.phone,
        address: l.address,
        status: l.status,
        source: "upload",
        raw_data: { fileName: file.name },
      }));

      const { error: dbError } = await supabase.from("leads").insert(supabaseRows);
      if (dbError) {
        console.error("Supabase insert error:", dbError);
        // Continue anyway - leads are still returned to the client for localStorage
      }
    }

    return NextResponse.json({
      leads,
      count: leads.length,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process file. Please try again." },
      { status: 500 }
    );
  }
}
