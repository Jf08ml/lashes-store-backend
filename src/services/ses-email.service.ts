import axios from 'axios';

interface EmailData {
  to: string;
  subject: string;
  htmlContent: string;
  fromName?: string;
  accountKey?: string;
}

class EmailService {
  private apiUrl: string;
  private accountKey: string;

  constructor() {
    this.apiUrl = process.env.EMAIL_SERVICE_URL || 'https://api-email-sending.vercel.app/send-email';
    this.accountKey = process.env.EMAIL_ACCOUNT_KEY || 'account2';
  }

  async sendEmail({ to, subject, htmlContent, fromName = 'Galaxia Glamour Store', accountKey }: EmailData) {
    try {
      
      const response = await axios.post(this.apiUrl, {
        to,
        subject,
        htmlContent,
        fromName,
        accountKey: accountKey || this.accountKey
      });
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Error sending email:', error.response?.data || error.message);
      console.error('Stack trace:', error.stack);
      throw new Error('Error sending email: ' + (error.response?.data || error.message));
    }
  }
}

export default new EmailService();