import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

const DAYS_SV = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
const MONTHS_SV = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

function swedishDate(date: Date, arena: string | null | undefined): string {
  const day = DAYS_SV[date.getDay()];
  const month = MONTHS_SV[date.getMonth()];
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${day} ${date.getDate()} ${month} | ${h}.${m} | ${arena ?? ""}`;
}

const PRESS_TYPES = new Set(["Media", "Flash", "Mixed zone", "Fri passage"]);
const FOTO_TYPES  = new Set(["Foto", "TV", "Bortalag", "Klubbmedia"]);

const GREEN    = "FF048A37";
const LAVENDER = "FFE584FF";
const WHITE    = "FFFFFFFF";
const BLACK    = "FF000000";
const DEMI     = "Franklin Gothic Demi Cond";
const MED      = "Franklin Gothic Medium Cond";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const acklista = req.nextUrl.searchParams.get("acklista");
  if (acklista !== "press" && acklista !== "foto") {
    return NextResponse.json({ error: "Invalid acklista type" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      submissions: {
        where: { status: "Approved" },
        include: { accredited: true },
        orderBy: [{ company: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const typeSet = acklista === "press" ? PRESS_TYPES : FOTO_TYPES;
  const rows = event.submissions.filter((s) => typeSet.has(s.accreditationType ?? ""));

  const isPress = acklista === "press";

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Acklista");

  // Column widths
  ws.getColumn("A").width = isPress ? 37.5  : 38.33;
  ws.getColumn("B").width = isPress ? 31.66 : 28.5;
  ws.getColumn("C").width = isPress ? 19.33 : 17.83;
  if (!isPress) ws.getColumn("D").width = 17.5;

  const greenFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  const dataFill:  ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: LAVENDER } };
  const headerCols = isPress ? ["A", "B", "C"] : ["A", "B", "C", "D"];

  /* ── Helper: style a green header cell ─────────────────────────── */
  function gh(cell: ExcelJS.Cell, value: string, size: number, font = DEMI, vAlign: ExcelJS.Alignment["vertical"] = "middle") {
    cell.value = value;
    cell.font = { name: font, size, color: { argb: WHITE } };
    cell.fill = greenFill;
    cell.alignment = { vertical: vAlign };
  }

  /* ── Helper: style a data cell ──────────────────────────────────── */
  function dc(cell: ExcelJS.Cell, value: string, size: number) {
    cell.value = value;
    cell.font = { name: DEMI, size, color: { argb: BLACK } };
    if (!isPress) cell.fill = dataFill;
    cell.alignment = { vertical: "middle" };
  }

  /* ── Row 1: title ───────────────────────────────────────────────── */
  ws.getRow(1).height = isPress ? 28.5 : 42.0;
  headerCols.forEach(c => ws.getCell(`${c}1`).fill = greenFill);
  gh(ws.getCell("A1"), isPress ? "ACKREDITERING: PRESSLÄKTAREN" : "ACKREDITERING: FOTO", 24);

  /* ── Row 2: event name ──────────────────────────────────────────── */
  ws.getRow(2).height = isPress ? 24.0 : 22.0;
  headerCols.forEach(c => ws.getCell(`${c}2`).fill = greenFill);
  gh(ws.getCell("A2"), event.eventName.toUpperCase(), 20, MED, "top");

  /* ── Row 3: date ────────────────────────────────────────────────── */
  ws.getRow(3).height = isPress ? 23.5 : 24.75;
  headerCols.forEach(c => ws.getCell(`${c}3`).fill = greenFill);
  gh(ws.getCell("A3"), swedishDate(new Date(event.eventDate), event.arena), 16, MED, "center");

  /* ── Row 4: spacer ──────────────────────────────────────────────── */
  ws.getRow(4).height = isPress ? 8.5 : 7.5;

  /* ── Rows 5–6: column headers (merged) ──────────────────────────── */
  ws.getRow(5).height = 21.0;
  ws.getRow(6).height = isPress ? 1.0 : 15.75;
  ws.mergeCells("A5:A6");
  ws.mergeCells("B5:B6");
  ws.mergeCells("C5:C6");

  const hdrSize = isPress ? 16 : 15;
  dc(ws.getCell("A5"), "MEDIA",                       hdrSize);
  dc(ws.getCell("B5"), "NAMN",                        hdrSize);
  dc(ws.getCell("C5"), isPress ? "BRICKA" : "VÄST",   hdrSize);

  /* ── Data rows ───────────────────────────────────────────────────── */
  const dataSize  = isPress ? 14 : 16;
  const rowHeight = isPress ? 19.0 : 20.0;

  rows.forEach((s, i) => {
    const r = 7 + i;
    ws.getRow(r).height = rowHeight;
    const name = `${s.accredited?.firstName ?? ""} ${s.accredited?.lastName ?? ""}`.trim();
    dc(ws.getCell(`A${r}`), s.company ?? "", dataSize);
    dc(ws.getCell(`B${r}`), name,            dataSize);
    if (s.accreditationType) dc(ws.getCell(`C${r}`), s.accreditationType, dataSize);
  });

  /* ── Stream response ─────────────────────────────────────────────── */
  const buffer   = await wb.xlsx.writeBuffer();
  const slug     = event.eventName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const filename = `acklista-${acklista}-${slug}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
