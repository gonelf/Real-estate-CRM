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

// Helper to check if a row is empty
function isEmptyRow(row: any[]): boolean {
  if (!row || row.length === 0) return true;
  return row.every((cell: any) => !cell || String(cell).trim() === "");
}

// Helper to detect property sections based on empty row separators
function findPropertySections(rows: any[][]): Array<{ startRow: number; endRow: number }> {
  const sections: Array<{ startRow: number; endRow: number }> = [];
  let currentSectionStart = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isEmpty = isEmptyRow(row);

    if (!isEmpty && currentSectionStart === -1) {
      // Start of a new section
      currentSectionStart = i;
    } else if (isEmpty && currentSectionStart !== -1) {
      // End of current section
      sections.push({
        startRow: currentSectionStart,
        endRow: i,
      });
      currentSectionStart = -1;
    }
  }

  // Handle last section if it doesn't end with empty row
  if (currentSectionStart !== -1) {
    sections.push({
      startRow: currentSectionStart,
      endRow: rows.length,
    });
  }

  return sections;
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

    // Process each sheet - may contain multiple properties separated by empty rows
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      // Convert sheet to array of arrays
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });

      if (rows.length === 0) continue;

      // Find property sections (separated by empty rows)
      const sections = findPropertySections(rows);

      // If no sections found, treat entire sheet as one property (fallback)
      if (sections.length === 0) {
        sections.push({ startRow: 0, endRow: rows.length });
      }

      // Process each property section
      for (const section of sections) {
        const sectionRows = rows.slice(section.startRow, section.endRow);

        if (sectionRows.length === 0) continue;

        // First row of section = property address
        let address = sheetName.trim();
        const firstRow = sectionRows[0];

        for (const cell of firstRow) {
          const cellStr = String(cell || "").trim();
          if (cellStr) {
            address = cellStr;
            break;
          }
        }

        const propertyStatus: PropertyStatus = "available";

        // Determine where lead data starts (skip property name row)
        let dataStartIndex = 1;

        // Check if second row is a header row (name, email, phone, etc.)
        if (dataStartIndex < sectionRows.length) {
          const nextRow = sectionRows[dataStartIndex];
          const nextRowText = nextRow.join(" ").toLowerCase();
          if (
            nextRowText.includes("name") ||
            nextRowText.includes("email") ||
            nextRowText.includes("phone") ||
            nextRowText.includes("contact") ||
            nextRowText.includes("comment")
          ) {
            dataStartIndex++; // Skip header row
          }
        }

        // Parse leads from remaining rows in this section
        const leads: ParsedLead[] = [];

        for (let i = dataStartIndex; i < sectionRows.length; i++) {
          const row = sectionRows[i];
          const actualRowIndex = section.startRow + i;

          // Skip empty rows
          if (isEmptyRow(row)) continue;

          // Collect all non-empty cells
          const cells = row.map((cell: any) => String(cell || "").trim()).filter((c: string) => c !== "");

          if (cells.length === 0) continue;

          // Last cell is the comment (if there are multiple cells)
          const comment = cells.length > 1 ? cells[cells.length - 1] : "";

          // Process cells (excluding last one if it's likely a comment)
          const dataCells = cells.length > 1 ? cells.slice(0, -1) : cells;

          // Try to extract name, email, phone from available data
          let name = "";
          let email = "";
          let phone = "";

          for (const cellStr of dataCells) {
            // Check if cell contains both name and email
            const emailMatch = cellStr.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

            if (emailMatch && !email) {
              email = emailMatch[1];
              const textBeforeEmail = cellStr.substring(0, emailMatch.index).trim();
              if (!name && textBeforeEmail) {
                name = textBeforeEmail;
              }
            }
            // Phone detection
            else if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4}|\+?\d{10,}/.test(cellStr) && !phone) {
              phone = cellStr;
            }
            // Name detection
            else if (!name && /[a-zA-Z]{2,}/.test(cellStr) && !cellStr.includes("@") && !/^\d+$/.test(cellStr)) {
              name = cellStr;
            }
          }

          // If still no name, use first cell as name (fallback)
          if (!name && dataCells.length > 0) {
            name = dataCells[0];
          }

          // Skip row if still no name (completely empty lead)
          if (!name) continue;

          // Get row color by checking any cell in the row
          let leadStatus: LeadStatus = "maybe";

          // Check all cells in the row to find one with a background color
          for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const cellRef = XLSX.utils.encode_cell({ r: actualRowIndex, c: colIndex });
            const cell = sheet[cellRef];

            if (cell && cell.s) {
              let colorFound = false;

              // Check foreground color first
              if (cell.s.fgColor && cell.s.fgColor.rgb) {
                leadStatus = getLeadStatusFromColor(cell.s.fgColor.rgb);
                colorFound = true;
              }
              // Then check background color
              else if (cell.s.bgColor && cell.s.bgColor.rgb) {
                leadStatus = getLeadStatusFromColor(cell.s.bgColor.rgb);
                colorFound = true;
              }

              // If we found a color, stop searching
              if (colorFound && leadStatus !== "maybe") {
                break;
              }
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
