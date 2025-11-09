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
export declare const pushTemplates: {
    emergencyAlert: {
        title: (data: TemplateData) => string;
        body: (data: TemplateData) => string;
    };
    acknowledgment: {
        title: (data: TemplateData) => string;
        body: (data: TemplateData) => string;
    };
    escalation: {
        title: (data: TemplateData) => string;
        body: (data: TemplateData) => string;
    };
    followUp: {
        title: (data: TemplateData) => string;
        body: (_data: TemplateData) => string;
    };
};
/**
 * SMS templates
 */
export declare const smsTemplates: {
    emergencyAlert: (data: TemplateData) => string;
    acknowledgment: (data: TemplateData) => string;
    escalation: (data: TemplateData) => string;
    followUp: (data: TemplateData) => string;
    locationUpdate: (data: TemplateData) => string;
};
/**
 * Email templates
 */
export declare const emailTemplates: {
    emergencyAlert: {
        subject: (data: TemplateData) => string;
        text: (data: TemplateData) => string;
        html: (data: TemplateData) => string;
    };
    escalation: {
        subject: (data: TemplateData) => string;
        text: (data: TemplateData) => string;
        html: (_data: TemplateData) => string;
    };
    followUp: {
        subject: (data: TemplateData) => string;
        text: (data: TemplateData) => string;
    };
};
/**
 * WebSocket message templates
 */
export declare const websocketTemplates: {
    emergencyAlert: (data: TemplateData) => {
        type: string;
        title: string;
        message: string;
        emergencyId: string | undefined;
        userName: string;
        emergencyType: string;
        location: string;
        address: string | undefined;
        link: string;
        timestamp: string;
        priority: string;
    };
    locationUpdate: (data: TemplateData) => {
        type: string;
        emergencyId: string | undefined;
        location: string;
        address: string | undefined;
        timestamp: string;
    };
    acknowledgment: (data: TemplateData) => {
        type: string;
        message: string;
        acknowledgedBy: string | undefined;
        timestamp: string;
    };
};
/**
 * Get template by type and channel
 */
export declare function getTemplate(type: 'emergencyAlert' | 'escalation' | 'followUp' | 'acknowledgment' | 'locationUpdate', channel: 'PUSH' | 'SMS' | 'EMAIL' | 'WEBSOCKET', data: TemplateData): any;
//# sourceMappingURL=emergency-alert.d.ts.map