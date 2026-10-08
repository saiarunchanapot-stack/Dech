export type UrgencyLevel = 'ต่ำ' | 'ปานกลาง' | 'สูง' | 'เร่งด่วนมาก';

export type RequestStatus = 'รอดำเนินการ' | 'กำลังดำเนินการ' | 'เสร็จสิ้น';

export interface WaterRequest {
  id: string;
  request_number: string;
  reporter_name: string;
  address: string;
  phone: string;
  email: string;
  problem_details: string;
  urgency: UrgencyLevel;
  latitude: number;
  longitude: number;
  google_maps_url: string;
  reported_at: string;
  status: RequestStatus;
  completed_at?: string;
  sheetRowIndex?: number;
  admin_notes?: string;
}
