export interface IssueInvoicePayload {
  invoiceCode: string;
  orderId: string;
  buyerInfo: {
    name: string;
    buyerType: string;
    companyName?: string;
    taxCode?: string;
    address?: string;
    email?: string;
  };
  items: Array<{
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    vatRate: number;
    vatAmount: number;
  }>;
  totalAmount: number;
}

export interface IssueInvoiceResult {
  invoiceNumber: string;
  invoiceSeries: string;
  lookupCode: string;
  pdfUrl: string;
  xmlUrl?: string;
  issuedAt: Date;
}

export interface InvoiceAdapter {
  issueInvoice(payload: IssueInvoicePayload): Promise<IssueInvoiceResult>;
  cancelInvoice(invoiceNumber: string, reason: string): Promise<boolean>;
  getPdfUrl(invoiceNumber: string, lookupCode: string): Promise<string>;
}

export const INVOICE_ADAPTER = Symbol('INVOICE_ADAPTER');
