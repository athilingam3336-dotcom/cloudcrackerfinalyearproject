import { apiClient } from '@/api/axios';
import { ENV } from '@/config/env';

export interface AboutSection {
  title: string;
  content: string;
}

export interface AboutData {
  version: string;
  description: string;
  sections: AboutSection[];
}

export class AboutService {
  async getAbout(): Promise<AboutData> {
    if (ENV.ENABLE_MOCK_API) {
      return {
        version: 'v2.4.0',
        description: 'Premier Pyrotechnics & Celebration Platform',
        sections: [
          {
            title: "🎆 Who We Are",
            content: "CloudCrackers is India's leading digital platform for premium, 100% legal, Sivakasi-manufactured green crackers and professional pyrotechnics."
          },
          {
            title: "🛡️ Safe & Compliant",
            content: "All our products strictly adhere to Supreme Court safety norms and NEERI green cracker formulations with reduced emissions and zero harmful heavy metals."
          },
          {
            title: "🚚 Hazmat Doorstep Delivery",
            content: "Specially packaged in shock-resistant and moisture-proof containers to guarantee safe, compliant transport straight to your doorstep."
          },
          {
            title: "💳 Safe Payments",
            content: "Integrated with Razorpay 256-bit encrypted checkout with instant HMAC verification."
          }
        ]
      };
    }
    const { data: res } = await apiClient.get('/about');
    return res.data;
  }

  async updateAbout(aboutData: AboutData): Promise<AboutData> {
    if (ENV.ENABLE_MOCK_API) {
      return aboutData;
    }
    const { data: res } = await apiClient.put('/about', aboutData);
    return res.data;
  }
}

export const aboutService = new AboutService();
export default aboutService;
