/**
 * Notification templates for emergency alerts
 */

export interface TemplateData {
  userName: string;
  emergencyType: string;
  location: string;
  address?: string;
  emergencyLink: string;
  acknowledgedBy?: string;
  [key: string]: any;
}

/**
 * Push notification templates
 */
export const pushTemplates = {
  emergencyAlert: {
    title: (data: TemplateData) =>
      `🆘 EMERGENCY: ${data.userName} needs help!`,
    body: (data: TemplateData) =>
      `${data.emergencyType} emergency at ${data.address || data.location}. Tap to respond immediately.`,
  },

  acknowledgment: {
    title: (data: TemplateData) =>
      `${data.acknowledgedBy} has acknowledged your emergency`,
    body: (data: TemplateData) =>
      `${data.acknowledgedBy} received your alert and is responding.`,
  },

  escalation: {
    title: (data: TemplateData) =>
      `🚨 URGENT: ${data.userName} still needs help!`,
    body: (data: TemplateData) =>
      `${data.emergencyType} emergency - primary contacts haven't responded. Immediate assistance needed.`,
  },

  followUp: {
    title: (data: TemplateData) =>
      `⚠️ REMINDER: ${data.userName} needs help`,
    body: (_data: TemplateData) =>
      `Emergency still active. Please acknowledge and respond if you can assist.`,
  },
};

/**
 * SMS templates
 */
export const smsTemplates = {
  emergencyAlert: (data: TemplateData) =>
    `🆘 EMERGENCY ALERT!\n\n` +
    `${data.userName} has triggered a ${data.emergencyType} emergency.\n\n` +
    `Location: ${data.address || data.location}\n\n` +
    `View details and respond: ${data.emergencyLink}\n\n` +
    `This is an automated emergency notification from SOS App.`,

  acknowledgment: (data: TemplateData) =>
    `✓ ${data.acknowledgedBy} has acknowledged your emergency alert and is responding.\n\n` +
    `Emergency ID: ${data.emergencyLink}`,

  escalation: (data: TemplateData) =>
    `🚨 URGENT ESCALATION\n\n` +
    `${data.userName}'s ${data.emergencyType} emergency has been escalated. ` +
    `Primary contacts haven't responded.\n\n` +
    `Location: ${data.address || data.location}\n\n` +
    `IMMEDIATE RESPONSE NEEDED: ${data.emergencyLink}`,

  followUp: (data: TemplateData) =>
    `⚠️ EMERGENCY REMINDER\n\n` +
    `${data.userName} still needs help. Emergency is active.\n\n` +
    `Please acknowledge: ${data.emergencyLink}`,

  locationUpdate: (data: TemplateData) =>
    `📍 Location Update\n\n` +
    `${data.userName}'s location: ${data.address || data.location}\n\n` +
    `Track: ${data.emergencyLink}`,
};

/**
 * Email templates
 */
export const emailTemplates = {
  emergencyAlert: {
    subject: (data: TemplateData) =>
      `🆘 EMERGENCY: ${data.userName} needs immediate help`,

    text: (data: TemplateData) =>
      `EMERGENCY ALERT\n\n` +
      `${data.userName} has triggered a ${data.emergencyType} emergency and needs your immediate assistance.\n\n` +
      `LOCATION:\n${data.address || data.location}\n\n` +
      `WHAT TO DO:\n` +
      `1. Click the link below to view the live emergency details\n` +
      `2. See ${data.userName}'s real-time location\n` +
      `3. Acknowledge that you've received this alert\n` +
      `4. Contact emergency services if needed\n\n` +
      `VIEW EMERGENCY:\n${data.emergencyLink}\n\n` +
      `This is an automated emergency notification from SOS App.\n` +
      `Time sent: ${new Date().toLocaleString()}\n\n` +
      `If you cannot respond, this alert will be escalated to other emergency contacts.`,

    html: (data: TemplateData) => {
      const locationText = data.address || data.location;
      const mapUrl = `https://maps.google.com/?q=${data.location}`;

      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🆘 EMERGENCY ALERT</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>${data.userName}</strong> has triggered a <strong style="color: #dc2626;">${data.emergencyType}</strong> emergency and needs your immediate assistance.
              </p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #991b1b; font-size: 16px;">📍 Location</h3>
                <p style="margin: 0; color: #333333; font-size: 15px;">${locationText}</p>
                <a href="${mapUrl}" style="display: inline-block; margin-top: 10px; color: #2563eb; text-decoration: none; font-size: 14px;">View on Google Maps →</a>
              </div>
              <h3 style="color: #333333; font-size: 18px; margin: 30px 0 15px 0;">What to do:</h3>
              <ol style="color: #555555; font-size: 15px; line-height: 1.8; padding-left: 20px;">
                <li>Click the button below to view live emergency details</li>
                <li>See ${data.userName}'s real-time location</li>
                <li>Acknowledge that you've received this alert</li>
                <li>Contact emergency services if needed</li>
              </ol>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${data.emergencyLink}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">VIEW EMERGENCY DETAILS</a>
              </div>
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #78350f; font-size: 14px;">
                  ⚠️ <strong>Important:</strong> If you cannot respond, this alert will be escalated to other emergency contacts.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
                This is an automated emergency notification from SOS App
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Time sent: ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;
    },
  },

  escalation: {
    subject: (data: TemplateData) =>
      `🚨 URGENT ESCALATION: ${data.userName} needs immediate help`,

    text: (data: TemplateData) =>
      `URGENT ESCALATION\n\n` +
      `${data.userName}'s ${data.emergencyType} emergency has been escalated because primary contacts have not responded.\n\n` +
      `IMMEDIATE ASSISTANCE REQUIRED\n\n` +
      `Location: ${data.address || data.location}\n\n` +
      `Please respond immediately: ${data.emergencyLink}\n\n` +
      `Time sent: ${new Date().toLocaleString()}`,

    html: (_data: TemplateData) =>
      `<!-- Similar HTML structure with urgent styling -->`,
  },

  followUp: {
    subject: (data: TemplateData) =>
      `⚠️ REMINDER: ${data.userName} still needs help`,

    text: (data: TemplateData) =>
      `EMERGENCY REMINDER\n\n` +
      `${data.userName}'s emergency is still active and requires attention.\n\n` +
      `Please acknowledge: ${data.emergencyLink}`,
  },
};

/**
 * WebSocket message templates
 */
export const websocketTemplates = {
  emergencyAlert: (data: TemplateData) => ({
    type: 'EMERGENCY_ALERT',
    title: `${data.userName} needs help!`,
    message: `${data.emergencyType} emergency at ${data.address || data.location}`,
    emergencyId: data.emergencyLink.split('/').pop(),
    userName: data.userName,
    emergencyType: data.emergencyType,
    location: data.location,
    address: data.address,
    link: data.emergencyLink,
    timestamp: new Date().toISOString(),
    priority: 'EMERGENCY',
  }),

  locationUpdate: (data: TemplateData) => ({
    type: 'LOCATION_UPDATE',
    emergencyId: data.emergencyLink.split('/').pop(),
    location: data.location,
    address: data.address,
    timestamp: new Date().toISOString(),
  }),

  acknowledgment: (data: TemplateData) => ({
    type: 'ACKNOWLEDGMENT',
    message: `${data.acknowledgedBy} has acknowledged your emergency`,
    acknowledgedBy: data.acknowledgedBy,
    timestamp: new Date().toISOString(),
  }),
};

/**
 * Get template by type and channel
 */
export function getTemplate(
  type: 'emergencyAlert' | 'escalation' | 'followUp' | 'acknowledgment' | 'locationUpdate',
  channel: 'PUSH' | 'SMS' | 'EMAIL' | 'WEBSOCKET',
  data: TemplateData
): any {
  switch (channel) {
    case 'PUSH':
      return (pushTemplates as any)[type] ? (pushTemplates as any)[type] : pushTemplates.emergencyAlert;

    case 'SMS':
      return (smsTemplates as any)[type] ? (smsTemplates as any)[type](data) : smsTemplates.emergencyAlert(data);

    case 'EMAIL':
      return (emailTemplates as any)[type] || emailTemplates.emergencyAlert;

    case 'WEBSOCKET':
      return (websocketTemplates as any)[type] ? (websocketTemplates as any)[type](data) : websocketTemplates.emergencyAlert(data);

    default:
      return null;
  }
}
