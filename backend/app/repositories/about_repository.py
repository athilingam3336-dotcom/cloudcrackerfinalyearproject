from typing import Any, Dict, Optional
from datetime import datetime
from app.models.about import About, AboutSection


class AboutRepository:
    async def get_about(self) -> About:
        """Retrieve the About document. If none exists, create and return a default one."""
        about = await About.find_all().first_or_none()
        if not about:
            # Seed default values inline
            about = About(
                version="v2.4.0",
                description="Meera Crackers World — Fireworks Wholesale & Retailer",
                sections=[
                    AboutSection(
                        title="🎆 Who We Are",
                        content="Meera Crackers World is your premier platform for 100% legal, Sivakasi-manufactured green crackers and professional pyrotechnics. Happy & Safety Guarantee for all your festive celebrations."
                    ),
                    AboutSection(
                        title="📍 Contact & Store Location",
                        content="Email: Meeracrackers@gmail.com | Phone: 7339624431, 94421 72314, 96268 24431\nLic No: E/SC/TN/24/685 (E 54389)\nLocation: https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw"
                    ),
                    AboutSection(
                        title="🛡️ Safe & Compliant",
                        content="All our products strictly adhere to Supreme Court safety norms and NEERI green cracker formulations with reduced emissions and zero harmful heavy metals."
                    ),
                    AboutSection(
                        title="🚚 Delivery & Availability",
                        content="All Days Available! Specially packaged in shock-resistant and moisture-proof containers to guarantee safe transport straight to your doorstep."
                    )
                ]
            )
            await about.insert()
        return about

    async def update_about(self, about: About, update_data: Dict[str, Any], user_id: str) -> About:
        """Update fields of the About document."""
        # Convert dictionary sections to AboutSection models if passed
        if "sections" in update_data:
            sections_data = update_data["sections"]
            update_data["sections"] = [
                AboutSection(**s) if isinstance(s, dict) else s
                for s in sections_data
            ]
        
        for key, value in update_data.items():
            setattr(about, key, value)
            
        about.updated_at = datetime.utcnow()
        about.updated_by = user_id
        await about.save()
        return about
