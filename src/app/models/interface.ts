export interface FeeReceipt {
  number: string;
  issuedAt: string;
  studentName: string;
  email: string;
  contact: string;
  class: string;
  year: string;
  items: { subject: string; amount: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  pending: number;
  paymentDate: string | null;
  paymentMode: string | null;
  paymentMethod: string | null;
  remarks: string;
}
