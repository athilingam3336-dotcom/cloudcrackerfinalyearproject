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
                description="Premier Pyrotechnics & Celebration Platform",
                sections=[
                    AboutSection(
                        title="🎆 Who We Are",
                        content="CloudCrackers is India's leading digital platform for premium, 100% legal, Sivakasi-manufactured green crackers and professional pyrotechnics."
                    ),
                    AboutSection(
                        title="🛡️ Safe & Compliant",
                        content="All our products strictly adhere to Supreme Court safety norms and NEERI green cracker formulations with reduced emissions and zero harmful heavy metals."
                    ),
                    AboutSection(
                        title="🚚 Hazmat Doorstep Delivery",
                        content="Specially packaged in shock-resistant and moisture-proof containers to guarantee safe, compliant transport straight to your doorstep."
                    ),
                    AboutSection(
                        title="💳 Safe Payments",
                        content="Integrated with Razorpay 256-bit encrypted checkout with instant HMAC verification."
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
