import { WaterRequest } from '../types';

export const SHEET_HEADERS = [
  'เลขที่คำร้อง',
  'วันที่แจ้ง',
  'ผู้แจ้ง',
  'เบอร์โทร',
  'อีเมล',
  'ระดับความเร่งด่วน',
  'รายละเอียดปัญหา',
  'ที่อยู่',
  'ละติจูด',
  'ลองจิจูด',
  'ลิงก์ Google Maps',
  'สถานะ',
  'วันที่เสร็จสิ้น',
];

export async function createWaterRequestSpreadsheet(
  accessToken: string,
  title = 'บันทึกแจ้งปัญหาความต้องการน้ำ - Water Requests'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'คำร้องขอความช่วยเหลือ',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: SHEET_HEADERS.map((header) => ({
                    userEnteredValue: { stringValue: header },
                    userEnteredFormat: {
                      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                      backgroundColor: { red: 0.05, green: 0.42, blue: 0.72 },
                      horizontalAlignment: 'CENTER',
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'ไม่สามารถสร้าง Google Sheets ได้');
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

export async function appendRequestToSheet(
  accessToken: string,
  spreadsheetId: string,
  req: WaterRequest,
  sheetName = 'คำร้องขอความช่วยเหลือ'
): Promise<boolean> {
  const row = [
    req.request_number,
    req.reported_at,
    req.reporter_name,
    req.phone,
    req.email,
    req.urgency,
    req.problem_details,
    req.address,
    req.latitude.toFixed(6),
    req.longitude.toFixed(6),
    req.google_maps_url,
    req.status,
    req.completed_at || '',
  ];

  const range = `${encodeURIComponent(sheetName)}!A:M`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'ไม่สามารถบันทึกข้อมูลลง Google Sheets ได้');
  }

  return true;
}

export async function fetchRequestsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName = 'คำร้องขอความช่วยเหลือ'
): Promise<WaterRequest[]> {
  const range = `${encodeURIComponent(sheetName)}!A2:M1000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];

  return rows.map((row, idx) => {
    return {
      id: `sheet-row-${idx + 2}`,
      request_number: row[0] || `WTR-${idx + 1}`,
      reported_at: row[1] || new Date().toISOString(),
      reporter_name: row[2] || '',
      phone: row[3] || '',
      email: row[4] || '',
      urgency: (row[5] as WaterRequest['urgency']) || 'ปานกลาง',
      problem_details: row[6] || '',
      address: row[7] || '',
      latitude: parseFloat(row[8]) || 13.7563,
      longitude: parseFloat(row[9]) || 100.5018,
      google_maps_url: row[10] || '',
      status: (row[11] as WaterRequest['status']) || 'รอดำเนินการ',
      completed_at: row[12] || '',
      sheetRowIndex: idx + 2,
    };
  });
}

export async function updateRequestStatusInSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetRowIndex: number,
  status: WaterRequest['status'],
  completedAt: string = '',
  sheetName = 'คำร้องขอความช่วยเหลือ'
): Promise<boolean> {
  const range = `${encodeURIComponent(sheetName)}!L${sheetRowIndex}:M${sheetRowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[status, completedAt]],
    }),
  });

  return response.ok;
}
