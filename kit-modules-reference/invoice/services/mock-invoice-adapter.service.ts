import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import {
  InvoiceAdapter,
  IssueInvoicePayload,
  IssueInvoiceResult,
} from './invoice-adapter.interface.js';

@Injectable()
export class MockInvoiceAdapterService implements InvoiceAdapter {
  private readonly logger = new Logger(MockInvoiceAdapterService.name);
  private invoiceCounter = 1000;

  async issueInvoice(payload: IssueInvoicePayload): Promise<IssueInvoiceResult> {
    this.logger.log(`[MockInvoiceAdapter] Issuing invoice for code: ${payload.invoiceCode}`);

    this.invoiceCounter++;
    const invoiceNumber = this.invoiceCounter.toString().padStart(7, '0');
    const invoiceSeries = '1C26TAA';
    const lookupCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const pdfUrl = `https://einvoice.mock.vn/view/${invoiceSeries}/${invoiceNumber}?lookup=${lookupCode}`;
    const xmlUrl = `https://einvoice.mock.vn/xml/${invoiceSeries}/${invoiceNumber}.xml`;

    return {
      invoiceNumber,
      invoiceSeries,
      lookupCode,
      pdfUrl,
      xmlUrl,
      issuedAt: new Date(),
    };
  }

  async cancelInvoice(invoiceNumber: string, reason: string): Promise<boolean> {
    this.logger.log(
      `[MockInvoiceAdapter] Cancelled invoice ${invoiceNumber} with reason: ${reason}`,
    );
    return true;
  }

  async getPdfUrl(invoiceNumber: string, lookupCode: string): Promise<string> {
    const invoiceSeries = '1C26TAA';
    return `https://einvoice.mock.vn/view/${invoiceSeries}/${invoiceNumber}?lookup=${lookupCode}`;
  }
}
