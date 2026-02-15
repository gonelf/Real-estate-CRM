import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { PropertyStatus, LeadStatus } from "@/lib/types";

interface ParsedLead {
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  comment: string;
}

interface ParsedProperty {
  address: string;
  status: PropertyStatus;
  leads: ParsedLead[];
}

// Helper to determine lead status from cell background color
function getLeadStatusFromColor(color: string | undefined): LeadStatus {
  if (!color) return "maybe";

  // Excel colors are in format "RRGGBB" (hex)
  const hex = color.toUpperCase();

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  // Green shades (high green, low red/blue)
  if (g > 150 && g > r + 50 && g > b + 50) {
    return "good";
  }

  // Red shades (high red, low green/blue)
  if (r > 150 && r > g + 50 && r > b + 50) {
    return "bad";
  }

  // Default to maybe for yellow, orange, white, or unclear colors
  return "maybe";
}

// Helper to extract property status from text
function extractPropertyStatus(text: string): PropertyStatus {
  const lower = text.toLowerCase().trim();
  if (lower.includes("available")) return "available";
  if (lower.includes("cpcv")) return "cpcv";
  if (lower.includes("sold")) return "sold";
  return "available"; // Default
}

// Helper to find header row index (looks for common header keywords)
function findHeaderRow(rows: any[][]): number {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const rowStr = row.join(" ").toLowerCase();
    if (
      rowStr.includes("name") ||
      rowStr.includes("email") ||
      rowStr.includes("phone") ||
      rowStr.includes("contact")
    ) {
      return i;
    }
  }
  return 0; // Default to first row
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel file with cell styles to extract colors
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellStyles: true,
      cellNF: true,
    });

    const properties: ParsedProperty[] = [];

    // Process each sheet as a property
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      // Convert sheet to array of arrays
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });

      if (rows.length === 0) continue;

      // Extract property address from sheet name or first cell
      let address = sheetName.trim();
      let propertyStatus: PropertyStatus = "available";
      let dataStartIndex = 1; // Start from row 1 by default (row 0 is property info)

      // First row is property information
      const firstRow = rows[0];
      if (firstRow && firstRow.length > 0) {
        const firstCell = String(firstRow[0]).trim();
        if (firstCell) {
          // First cell is the property address
          address = firstCell;
        }

        // Check if status is in the first row
        const firstRowText = firstRow.join(" ");
        if (firstRowText.toLowerCase().includes("status")) {
          propertyStatus = extractPropertyStatus(firstRowText);
        }
      }

      // Check if second row is a header row (contains "name", "email", "phone", etc.)
      if (rows.length > 1) {
        const secondRow = rows[1];
        const secondRowText = secondRow.join(" ").toLowerCase();
        if (
          secondRowText.includes("name") ||
          secondRowText.includes("email") ||
          secondRowText.includes("phone") ||
          secondRowText.includes("contact")
        ) {
          // Skip the header row, start data from row 2
          dataStartIndex = 2;
        }
      }

      // Parse leads from rows
      const leads: ParsedLead[] = [];

      for (let rowIndex = dataStartIndex; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];

        // Skip empty rows
        if (!row || row.length === 0 || row.every((cell: any) => !cell || String(cell).trim() === "")) {
          continue;
        }

        // Last column is always the comment (if row has more than 1 column)
        const dataEndIndex = row.length > 1 ? row.length - 1 : row.length;
        const comment = row.length > 1 ? String(row[row.length - 1] || "").trim() : "";

        // Try to extract name, email, phone from the row (excluding last column)
        let name = "";
        let email = "";
        let phone = "";

        // Process all columns except the last one (which is the comment)
        for (let i = 0; i < dataEndIndex; i++) {
          const cellStr = String(row[i] || "").trim();
          if (!cellStr) continue;

          // Email detection
          if (cellStr.includes("@") && !email) {
            email = cellStr;
          }
          // Phone detection (contains digits and common phone patterns)
          else if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/.test(cellStr) && !phone) {
            phone = cellStr;
          }
          // Name detection (not email, not phone, has letters)
          else if (!name && /[a-zA-Z]{2,}/.test(cellStr) && !cellStr.includes("@")) {
            name = cellStr;
          }
        }

        // Skip row if no name found (avoid creating empty leads)
        if (!name) continue;

        // Get row color from first cell with content
        let leadStatus: LeadStatus = "maybe";

        // Get the Excel cell reference for the first cell in this row
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
        const cell = sheet[cellRef];

        if (cell && cell.s) {
          if (cell.s.fgColor && cell.s.fgColor.rgb) {
            leadStatus = getLeadStatusFromColor(cell.s.fgColor.rgb);
          } else if (cell.s.bgColor && cell.s.bgColor.rgb) {
            leadStatus = getLeadStatusFromColor(cell.s.bgColor.rgb);
          }
        }

        leads.push({
          name,
          email,
          phone,
          status: leadStatus,
          comment,
        });
      }

      // Only add property if it has leads
      if (leads.length > 0) {
        properties.push({
          address,
          status: propertyStatus,
          leads,
        });
      }
    }

    if (properties.length === 0) {
      return NextResponse.json(
        { error: "No properties with leads found in the file" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      properties,
      count: properties.length,
      totalLeads: properties.reduce((sum, p) => sum + p.leads.length, 0),
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
