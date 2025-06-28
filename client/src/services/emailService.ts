// Email service for sending notifications
// This is a mock implementation - replace with actual email service

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private static instance: EmailService;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private getTemplate(type: string, data: any): EmailTemplate {
    const templates = {
      trial_reminder: {
        subject: `Your Thanga Malar trial expires in ${data.daysLeft} days`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #B8860B;">Your trial expires soon!</h2>
            <p>Hi ${data.email},</p>
            <p>Your free trial of Thanga Malar Jewellery Management System expires in <strong>${data.daysLeft} days</strong>.</p>
            <p>Don't lose access to your jewelry business management tools. Upgrade now to continue:</p>
            <ul>
              <li>Unlimited inventory management</li>
              <li>Advanced sales tracking</li>
              <li>Customer management</li>
              <li>Detailed reports and analytics</li>
            </ul>
            <a href="${data.upgradeUrl}" style="background-color: #B8860B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
              Upgrade Now
            </a>
            <p>Best regards,<br>The Thanga Malar Team</p>
          </div>
        `,
        text: `Your Thanga Malar trial expires in ${data.daysLeft} days. Upgrade now to continue using all features.`,
      },
      trial_expired: {
        subject: 'Your Thanga Malar trial has expired',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #B8860B;">Your trial has expired</h2>
            <p>Hi ${data.email},</p>
            <p>Your free trial of Thanga Malar Jewellery Management System has expired.</p>
            <p>Upgrade now to regain access to your business data and continue managing your jewelry business efficiently.</p>
            <a href="${data.upgradeUrl}" style="background-color: #B8860B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
              Upgrade Now
            </a>
            <p>Best regards,<br>The Thanga Malar Team</p>
          </div>
        `,
        text: `Your Thanga Malar trial has expired. Upgrade now to continue using the system.`,
      },
      upgrade_success: {
        subject: 'Welcome to Thanga Malar Professional!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #B8860B;">Welcome to Professional!</h2>
            <p>Hi ${data.email},</p>
            <p>Thank you for upgrading to Thanga Malar Professional! You now have access to:</p>
            <ul>
              <li>1,000 inventory items</li>
              <li>500 customers</li>
              <li>1,000 sales per month</li>
              <li>Advanced reports and analytics</li>
              <li>Priority support</li>
            </ul>
            <p>Start exploring your new features today!</p>
            <a href="${data.dashboardUrl}" style="background-color: #B8860B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
              Go to Dashboard
            </a>
            <p>Best regards,<br>The Thanga Malar Team</p>
          </div>
        `,
        text: `Welcome to Thanga Malar Professional! You now have access to all professional features.`,
      },
      feature_limit_warning: {
        subject: 'You\'re approaching your plan limits',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #B8860B;">Plan limit warning</h2>
            <p>Hi ${data.email},</p>
            <p>You're approaching the limits of your current plan:</p>
            <ul>
              <li>Inventory: ${data.usage.inventory}/${data.limits.inventory}</li>
              <li>Customers: ${data.usage.customers}/${data.limits.customers}</li>
              <li>Sales this month: ${data.usage.sales}/${data.limits.sales}</li>
            </ul>
            <p>Consider upgrading to continue growing your business without interruption.</p>
            <a href="${data.upgradeUrl}" style="background-color: #B8860B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
              Upgrade Plan
            </a>
            <p>Best regards,<br>The Thanga Malar Team</p>
          </div>
        `,
        text: `You're approaching your plan limits. Consider upgrading to continue growing your business.`,
      },
    };

    return templates[type as keyof typeof templates] || templates.trial_reminder;
  }

  async sendEmail(to: string, type: string, data: any): Promise<boolean> {
    try {
      const template = this.getTemplate(type, data);
      
      // Mock email sending - replace with actual email service
      console.log('Sending email:', {
        to,
        subject: template.subject,
        html: template.html,
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In production, integrate with:
      // - SendGrid: https://sendgrid.com/
      // - AWS SES: https://aws.amazon.com/ses/
      // - Mailgun: https://www.mailgun.com/
      // - Resend: https://resend.com/

      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendBulkEmails(emails: Array<{ to: string; type: string; data: any }>): Promise<void> {
    const promises = emails.map(email => 
      this.sendEmail(email.to, email.type, email.data)
    );
    
    await Promise.all(promises);
  }
}

export const emailService = EmailService.getInstance();