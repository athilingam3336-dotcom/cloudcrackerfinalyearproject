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
        description: 'Meera Crackers World — Fireworks Wholesale & Retailer',
        sections: [
          {
            title: "🎆 Who We Are",
            content: "Meera Crackers World is your trusted platform for 100% legal, Sivakasi-manufactured green crackers and professional pyrotechnics. Happy & Safety Guarantee for all celebrations."
          },
          {
            title: "📍 Contact & Location",
            content: "Email: Meeracrackers@gmail.com | Phone: 7339624431, 94421 72314, 96268 24431\nLic No: E/SC/TN/24/685 (E 54389)\nLocation: https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw"
          },
          {
            title: "🛡️ Safe & Compliant",
            content: "All products strictly adhere to Supreme Court safety norms and NEERI green cracker formulations with reduced emissions."
          },
          {
            title: "🚚 Delivery & Availability",
            content: "All Days Available! Specially packaged in shock-resistant and moisture-proof containers."
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
