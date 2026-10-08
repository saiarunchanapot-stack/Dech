import { WaterRequest, RequestStatus } from '../types';

function toBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Normalizes email recipient(s) into RFC 2822 comma-separated string
 */
export function formatRecipients(recipients: string | string[] | undefined | null): string {
  if (!recipients) return 'saiarunchanapot@gmail.com';
  let list: string[] = [];
  if (Array.isArray(recipients)) {
    list = recipients;
  } else if (typeof recipients === 'string') {
    list = recipients.split(/[,;\s]+/);
  }
  const clean = Array.from(
    new Set(
      list
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 3 && e.includes('@'))
    )
  );
  return clean.length > 0 ? clean.join(', ') : 'saiarunchanapot@gmail.com';
}

/**
 * Sends real-time Gmail alert for new water request to admin email(s)
 */
export async function sendWaterRequestEmail(
  accessToken: string,
  req: WaterRequest,
  recipients: string | string[] = 'saiarunchanapot@gmail.com'
): Promise<boolean> {
  const toHeader = formatRecipients(recipients);

  const urgencyColor =
    req.urgency === 'เร่งด่วนมาก'
      ? '#b91c1c'
      : req.urgency === 'สูง'
      ? '#c2410c'
      : req.urgency === 'ปานกลาง'
      ? '#d97706'
      : '#0284c7';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; padding: 24px; text-align: left; }
    .title { margin: 0; font-size: 22px; font-weight: bold; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 13px; color: white; background: ${urgencyColor}; margin-top: 10px; }
    .admin-bar { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 10px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 12px; }
    .content { padding: 24px; }
    .item { margin-bottom: 16px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 12px; }
    .item-label { font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .item-val { font-size: 15px; color: #0f172a; font-weight: 500; }
    .maps-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; margin-top: 14px; box-shadow: 0 2px 6px rgba(37,99,235,0.3); }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">🚨 มีการแจ้งปัญหาความต้องการน้ำ</div>
      <div style="font-size: 14px; opacity: 0.9; margin-top: 4px;">รหัสคำร้อง: <strong>${req.request_number}</strong></div>
      <span class="badge">ความเร่งด่วน: ${req.urgency}</span>
    </div>
    <div class="content">
      <div class="admin-bar">
        📢 <strong>แจ้งเตือนผู้ดูแลระบบ:</strong> ส่งถึง <code>${toHeader}</code> ตามการตั้งค่าเมลผู้ดูแลระบบล่าสุด
      </div>

      <div class="item">
        <div class="item-label">👤 ผู้แจ้ง</div>
        <div class="item-val">${req.reporter_name}</div>
      </div>
      <div class="item">
        <div class="item-label">📞 เบอร์โทรศัพท์ติดต่อ</div>
        <div class="item-val"><a href="tel:${req.phone}" style="color: #0284c7; text-decoration: none; font-weight: bold;">${req.phone}</a></div>
      </div>
      <div class="item">
        <div class="item-label">✉️ อีเมลผู้แจ้ง</div>
        <div class="item-val">${req.email || '-'}</div>
      </div>
      <div class="item">
        <div class="item-label">📍 ที่อยู่ / สถานที่เกิดเหตุ</div>
        <div class="item-val">${req.address || '-'}</div>
      </div>
      <div class="item">
        <div class="item-label">🌐 พิกัดสถานที่ (GPS)</div>
        <div class="item-val">${req.latitude.toFixed(6)}, ${req.longitude.toFixed(6)}</div>
      </div>
      <div class="item">
        <div class="item-label">📝 รายละเอียดปัญหา</div>
        <div class="item-val" style="white-space: pre-line; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">${req.problem_details}</div>
      </div>
      <div class="item">
        <div class="item-label">⏰ เวลาที่แจ้ง</div>
        <div class="item-val">${new Date(req.reported_at).toLocaleString('th-TH')}</div>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="${req.google_maps_url}" target="_blank" class="maps-btn">
          🗺️ เปิดตำแหน่งบน Google Maps แบบเรียลไทม์
        </a>
      </div>
    </div>
    <div class="footer">
      ระบบรับแจ้งปัญหาความต้องการน้ำ &bull; ระบบแจ้งเตือนอัตโนมัติตามเมลผู้ดูแลระบบ
    </div>
  </div>
</body>
</html>
  `.trim();

  const rawSubject = `[แจ้งเหตุด่วน ${req.urgency}] ${req.request_number} แจ้งปัญหาน้ำ: ${req.reporter_name}`;
  const encodedSubject = `=?UTF-8?B?${toBase64Url(rawSubject)}?=`;

  const messageParts = [
    `To: ${toHeader}`,
    `Subject: ${encodedSubject}`,
    'Content-Type: text/html; charset=UTF-8',
    'MIME-Version: 1.0',
    '',
    htmlBody,
  ];

  const rawMessage = messageParts.join('\r\n');
  const base64UrlMessage = toBase64Url(rawMessage);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64UrlMessage,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Gmail send error:', errorData);
    throw new Error(errorData?.error?.message || 'ส่งอีเมลแจ้งเตือนไม่สำเร็จ');
  }

  return true;
}

/**
 * Sends real-time Gmail alert when status or request details are modified by an admin
 */
export async function sendRequestStatusUpdateEmail(
  accessToken: string,
  req: WaterRequest,
  oldStatus: RequestStatus,
  newStatus: RequestStatus,
  adminEmail: string,
  recipients: string | string[] = 'saiarunchanapot@gmail.com',
  notes?: string
): Promise<boolean> {
  const toHeader = formatRecipients(recipients);

  const statusColor =
    newStatus === 'เสร็จสิ้น'
      ? '#16a34a'
      : newStatus === 'กำลังดำเนินการ'
      ? '#2563eb'
      : '#d97706';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; padding: 24px; text-align: left; }
    .title { margin: 0; font-size: 20px; font-weight: bold; }
    .status-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 13px; color: white; background: ${statusColor}; margin-top: 10px; }
    .content { padding: 24px; }
    .change-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .item { margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; }
    .item-label { font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .item-val { font-size: 14px; color: #0f172a; font-weight: 500; }
    .maps-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 12px; }
    .footer { background: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">🔄 มีการเปลี่ยนแปลงสถานะคำร้องความต้องการน้ำ</div>
      <div style="font-size: 14px; opacity: 0.85; margin-top: 4px;">รหัสคำร้อง: <strong>${req.request_number}</strong></div>
      <span class="status-badge">สถานะใหม่: ${newStatus}</span>
    </div>
    <div class="content">
      <div class="change-box">
        <div style="font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 6px;">
          🛠️ รายละเอียดการเปลี่ยนแปลงโดยผู้ดูแลระบบ
        </div>
        <div style="font-size: 13px; color: #475569;">
          สถานะเดิม: <strong style="color: #64748b;">${oldStatus}</strong> &rarr; สถานะใหม่: <strong style="color: ${statusColor};">${newStatus}</strong>
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
          ดำเนินการโดย: <strong>${adminEmail}</strong> เมื่อ ${new Date().toLocaleString('th-TH')}
        </div>
        ${
          notes
            ? `<div style="margin-top: 8px; font-size: 13px; background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;"><strong>หมายเหตุเจ้าหน้าที่:</strong> ${notes}</div>`
            : ''
        }
      </div>

      <div class="item">
        <div class="item-label">👤 ผู้แจ้ง</div>
        <div class="item-val">${req.reporter_name} (เบอร์โทร: <a href="tel:${req.phone}">${req.phone}</a>)</div>
      </div>
      <div class="item">
        <div class="item-label">📍 สถานที่เกิดเหตุ</div>
        <div class="item-val">${req.address || '-'}</div>
      </div>
      <div class="item">
        <div class="item-label">💬 ปัญหาที่แจ้ง</div>
        <div class="item-val">${req.problem_details}</div>
      </div>

      <div style="text-align: center; margin-top: 16px;">
        <a href="${req.google_maps_url}" target="_blank" class="maps-btn">
          🗺️ เปิดดูพิกัดบน Google Maps
        </a>
      </div>
    </div>
    <div class="footer">
      ส่งแจ้งเตือนตามรายชื่ออีเมลผู้ดูแลระบบ: ${toHeader}
    </div>
  </div>
</body>
</html>
  `.trim();

  const rawSubject = `[อัปเดตสถานะ ${newStatus}] คำร้อง ${req.request_number} โดย ${adminEmail}`;
  const encodedSubject = `=?UTF-8?B?${toBase64Url(rawSubject)}?=`;

  const messageParts = [
    `To: ${toHeader}`,
    `Subject: ${encodedSubject}`,
    'Content-Type: text/html; charset=UTF-8',
    'MIME-Version: 1.0',
    '',
    htmlBody,
  ];

  const rawMessage = messageParts.join('\r\n');
  const base64UrlMessage = toBase64Url(rawMessage);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64UrlMessage,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Gmail status alert send error:', errorData);
    throw new Error(errorData?.error?.message || 'ส่งอีเมลแจ้งเตือนการเปลี่ยนแปลงไม่สำเร็จ');
  }

  return true;
}
