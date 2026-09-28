// Shared ACE IoT workbook styles and formula-safe cell builder.
export const STYLES = {
  brandHeader: {
    font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: 'C1D200' } }, // Brand Lime Green
    fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } }, // Slate 900
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 }
  },
  title: {
    font: { name: 'Segoe UI', sz: 15, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } }, // Slate 900
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 }
  },
  subtitle: {
    font: { name: 'Segoe UI', sz: 9.5, italic: true, color: { rgb: '94A3B8' } },
    fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } }, // Slate 900
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 }
  },
  sectionHeader: {
    font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } }, // Slate 800
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    border: {
      bottom: { style: 'medium', color: { rgb: 'C1D200' } } // Lime Accent Line
    }
  },
  tableHeader: {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '334155' } }, // Slate 700
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      bottom: { style: 'medium', color: { rgb: 'C1D200' } }, // Lime Accent Line
      top: { style: 'thin', color: { rgb: '475569' } },
      left: { style: 'thin', color: { rgb: '475569' } },
      right: { style: 'thin', color: { rgb: '475569' } }
    }
  },
  propLabel: {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1E293B' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } }, // Slate 100
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    border: {
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  propValue: {
    font: { name: 'Segoe UI', sz: 10, color: { rgb: '0F172A' } },
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    border: {
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  dataCell: {
    font: { name: 'Segoe UI', sz: 10, color: { rgb: '334155' } },
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    border: {
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  dataCellAlt: {
    font: { name: 'Segoe UI', sz: 10, color: { rgb: '334155' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } }, // Slate 50 Zebra
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    border: {
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  systemReservation: {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '859300' } }, // Accent dark lime
    fill: { patternType: 'solid', fgColor: { rgb: 'F9FED8' } }, // Soft lime highlights
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    border: {
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  bmsReservation: {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1D4ED8' } }, // Blue accent
    fill: { patternType: 'solid', fgColor: { rgb: 'EFF6FF' } }, // Soft Blue
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    border: {
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  brandCardHeader: {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } }, // Dark Charcoal
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    border: {
      top: { style: 'medium', color: { rgb: 'C1D200' } }, // Highlighted border
      left: { style: 'medium', color: { rgb: 'C1D200' } },
      right: { style: 'medium', color: { rgb: 'C1D200' } }
    }
  },
  brandCardBody: {
    font: { name: 'Segoe UI', sz: 9.5, color: { rgb: '334155' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } }, // Zebra highlight
    alignment: { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 },
    border: {
      left: { style: 'medium', color: { rgb: 'C1D200' } },
      right: { style: 'medium', color: { rgb: 'C1D200' } },
      bottom: { style: 'medium', color: { rgb: 'C1D200' } }
    }
  }
};

export type CellValue = string | number | boolean | null | undefined;
export type RowCell = ReturnType<typeof makeCell> | string | number | boolean;

export function makeCell(val: CellValue, styleName: keyof typeof STYLES) {
  let sanitizedVal: string | number | boolean = "";
  if (val !== null && val !== undefined) {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
        sanitizedVal = `'` + val;
      } else {
        sanitizedVal = val;
      }
    } else {
      sanitizedVal = val;
    }
  }
  return {
    v: sanitizedVal,
    t: (typeof sanitizedVal === 'number' ? 'n' : (typeof sanitizedVal === 'boolean' ? 'b' : 's')) as 'n' | 'b' | 's',
    s: STYLES[styleName] || STYLES.dataCell
  };
}
