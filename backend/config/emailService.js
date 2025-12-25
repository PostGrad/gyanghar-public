const axios = require("axios");
const { logger } = require("./logger");

class EmailService {
  constructor() {
    this.brevoApiKey = process.env.BREVO_API_KEY;
    this.senderEmail = process.env.BREVO_SENDER_EMAIL;
    this.senderName = process.env.BREVO_SENDER_NAME || "Gyan Ghar App";
    this.brevoApiUrl = "https://api.brevo.com/v3/smtp/email";
    this.initialized = false;
    this.initializeBrevoAPI();
  }

  initializeBrevoAPI() {
    try {
      // Check if API key is available
      if (!this.brevoApiKey) {
        logger.error("BREVO_API_KEY environment variable is not set");
        return;
      }

      if (!this.senderEmail) {
        logger.error("BREVO_SENDER_EMAIL environment variable is not set");
        return;
      }

      this.initialized = true;
      logger.info("Brevo API email service initialized successfully", {
        senderEmail: this.senderEmail,
        senderName: this.senderName,
        apiKeyConfigured: !!this.brevoApiKey,
      });
    } catch (error) {
      logger.error("Failed to initialize Brevo API:", error);
      this.initialized = false;
    }
  }

  async sendPasswordResetEmail(to, resetToken, userName) {
    try {
      if (!this.initialized) {
        throw new Error(
          "Email service not initialized. Check BREVO_API_KEY and BREVO_SENDER_EMAIL environment variables."
        );
      }

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3cd; border: 1px solid #fde047; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>We received a request to reset your password for your Gyan Ghar App account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button" style="color: white;">Reset Password</a>
              </div>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3B82F6;">${resetUrl}</p>
              <div class="warning">
                <strong>Important:</strong>
                <ul>
                  <li>This link will expire in 30 minutes</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated email from Gyan Ghar App Administrator</p>
              <p>If you have any questions, please contact the administrator</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await axios.post(
        this.brevoApiUrl,
        {
          sender: {
            name: this.senderName,
            email: this.senderEmail,
          },
          to: [
            {
              email: to,
              name: userName,
            },
          ],
          subject: "Password Reset Request - Gyan Ghar App",
          htmlContent: htmlContent,
        },
        {
          headers: {
            accept: "application/json",
            "api-key": this.brevoApiKey,
            "content-type": "application/json",
          },
        }
      );

      logger.info("Password reset email sent successfully", {
        to: to,
        messageId: response.data.messageId,
      });
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      logger.error("Failed to send password reset email", {
        to: to,
        error: error.response?.data || error.message,
      });
      throw new Error("Failed to send email");
    }
  }

  async sendPasswordChangeConfirmation(to, userName) {
    try {
      if (!this.initialized) {
        logger.warn("Email service not initialized, skipping password change confirmation");
        return { success: false, error: "Email service not initialized" };
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .security-notice { background: #fef3cd; border: 1px solid #fde047; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Changed Successfully</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>Your password for Gyan Ghar App has been successfully changed.</p>
              <p>If you made this change, no further action is required.</p>
              <div class="security-notice">
                <strong>Security Notice:</strong><br>
                If you did not make this change, please contact the administrator immediately as your account may have been compromised.
              </div>
              <p>Thank you for keeping your account secure!</p>
            </div>
            <div class="footer">
              <p>This is an automated email from Gyan Ghar App Administrator</p>
              <p>Time: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await axios.post(
        this.brevoApiUrl,
        {
          sender: {
            name: this.senderName,
            email: this.senderEmail,
          },
          to: [
            {
              email: to,
              name: userName,
            },
          ],
          subject: "Password Changed Successfully - Gyan Ghar App",
          htmlContent: htmlContent,
        },
        {
          headers: {
            accept: "application/json",
            "api-key": this.brevoApiKey,
            "content-type": "application/json",
          },
        }
      );

      logger.info("Password change confirmation sent", {
        to: to,
        messageId: response.data.messageId,
      });
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      logger.error("Failed to send password change confirmation", {
        to: to,
        error: error.response?.data || error.message,
      });
      // Don't throw error for confirmation emails - it's not critical
      return { success: false, error: error.message };
    }
  }

  async sendEmail({ to, cc = [], subject, html }) {
    try {
      // Check if email service is properly initialized
      if (!this.initialized) {
        const error = new Error(
          "Email service not initialized. Check BREVO_API_KEY and BREVO_SENDER_EMAIL environment variables."
        );
        logger.error("Email service not initialized", {
          to: to,
          cc: cc,
          subject: subject,
          initialized: this.initialized,
          brevoApiKey: !!this.brevoApiKey,
          brevoSenderEmail: !!this.senderEmail,
        });
        throw error;
      }

      // Convert to array if single email provided
      const toEmails = Array.isArray(to) ? to : [to];
      
      // Build recipient list for Brevo API
      const recipients = toEmails.map(email => ({ email }));
      
      // Build request body
      const requestBody = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: recipients,
        subject: subject,
        htmlContent: html,
      };

      // Add CC recipients if provided
      if (cc && cc.length > 0) {
        requestBody.cc = cc.map(email => ({ email }));
      }

      const response = await axios.post(
        this.brevoApiUrl,
        requestBody,
        {
          headers: {
            accept: "application/json",
            "api-key": this.brevoApiKey,
            "content-type": "application/json",
          },
        }
      );

      logger.info("Email sent successfully", {
        to: toEmails,
        cc: cc,
        subject: subject,
        messageId: response.data.messageId,
      });

      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      logger.error("Failed to send email", {
        to: to,
        cc: cc,
        subject: subject,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }
}

module.exports = new EmailService();
