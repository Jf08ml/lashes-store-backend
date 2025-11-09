import axios from 'axios';

interface EmailData {
  to: string;
  subject: string;
  htmlContent: string;
  fromName?: string;
}

class EmailService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.EMAIL_SERVICE_URL || 'https://api-email-sending.vercel.app/send-email';
  }

  async sendEmail({ to, subject, htmlContent, fromName = 'Galaxia Glamour Store' }: EmailData) {
    try {
      const response = await axios.post(this.apiUrl, {
        to,
        subject,
        htmlContent,
        fromName
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error sending email:', error.response?.data || error.message);
      throw new Error('Error sending email: ' + (error.response?.data || error.message));
    }
  }
}

export default new EmailService();