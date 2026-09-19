import { ENV } from '@/config/env';
import { ProductService } from '@/services/productService';
import { ProductItem } from '@/constants/mockData';
import { adminService } from '@/services/adminService';

const productService = new ProductService();

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  recommendedProducts?: ProductItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CONTEXT TYPE
// ─────────────────────────────────────────────────────────────────────────────
interface AdminContext {
  todayRevenue: number;
  todayOrders: number;
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalUsers: number;
  totalProducts: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProducts: string[];
  outOfStockProducts: string[];
  topProducts: string[];
  activeCoupons: string[];
  recentOrders: string[];
  productCatalog: string;
}

export class AiChatService {
  private static instance: AiChatService;

  public static getInstance(): AiChatService {
    if (!AiChatService.instance) {
      AiChatService.instance = new AiChatService();
    }
    return AiChatService.instance;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GATHER LIVE ADMIN CONTEXT FROM ALL APIs
  // ───────────────────────────────────────────────────────────────────────────
  private async gatherAdminContext(): Promise<AdminContext> {
    const ctx: AdminContext = {
      todayRevenue: 0,
      todayOrders: 0,
      totalRevenue: 0,
      totalOrders: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalUsers: 0,
      totalProducts: 0,
      totalStockUnits: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      lowStockProducts: [],
      outOfStockProducts: [],
      topProducts: [],
      activeCoupons: [],
      recentOrders: [],
      productCatalog: '',
    };

    // 1. Business Analytics
    try {
      const analytics = await adminService.getBusinessAnalyticsData(true);
      ctx.totalRevenue = analytics.totalRevenue || 0;
      ctx.totalOrders = analytics.totalOrders || 0;
      ctx.todayRevenue = analytics.todayRevenue || 0;
      ctx.totalProducts = analytics.inventoryDistribution?.totalProducts || 0;
      ctx.totalStockUnits = analytics.inventoryDistribution?.totalStockUnits || 0;
      ctx.lowStockCount = analytics.inventoryDistribution?.lowStock || 0;
      ctx.outOfStockCount = analytics.inventoryDistribution?.outOfStock || 0;
      const breakdown = analytics.orderBreakdown || {};
      ctx.pendingOrders = breakdown.pendingOrders || 0;
      ctx.deliveredOrders = breakdown.completedOrders || 0;
      ctx.cancelledOrders = breakdown.cancelledOrders || 0;
      if (analytics.topProducts && analytics.topProducts.length > 0) {
        ctx.topProducts = analytics.topProducts.slice(0, 5).map(
          (p) => p.name + ' (Sold: ' + p.totalSold + ' units | Revenue: Rs.' + p.totalRevenue.toLocaleString('en-IN') + ')'
        );
      }
    } catch {}

    // 2. Today's Report
    try {
      const report = await adminService.getTodayReport();
      if (report && typeof report.today_revenue === 'number') {
        ctx.todayRevenue = report.today_revenue;
        ctx.todayOrders = report.today_orders;
      }
    } catch {}

    // 3. Orders summary
    try {
      const ordersRes = await adminService.getAdminOrders(1, 50);
      const orders = ordersRes.orders || [];
      if (ctx.pendingOrders === 0) ctx.pendingOrders = orders.filter((o) => o.orderStatus === 'Pending').length;
      ctx.confirmedOrders = orders.filter((o) => o.orderStatus === 'Confirmed').length;
      ctx.shippedOrders = orders.filter((o) => ['Shipped', 'In Transit'].includes(o.orderStatus)).length;
      if (ctx.deliveredOrders === 0) ctx.deliveredOrders = orders.filter((o) => o.orderStatus === 'Delivered').length;
      if (ctx.cancelledOrders === 0) ctx.cancelledOrders = orders.filter((o) => o.orderStatus === 'Cancelled').length;
      ctx.recentOrders = orders.slice(0, 5).map(
        (o) => 'Order #' + o.orderNumber + ' | ' + o.customerName + ' | Rs.' + o.totalAmount.toLocaleString('en-IN') + ' | ' + o.orderStatus + ' | Payment: ' + o.paymentStatus
      );
    } catch {}

    // 4. Users
    try {
      const usersRes = await adminService.getAdminUsers({ page: 1, limit: 1 });
      ctx.totalUsers = usersRes.total || 0;
    } catch {}

    // 5. Low stock products
    try {
      const lowStock = await adminService.getLowStockProducts();
      const lowArr = Array.isArray(lowStock) ? lowStock : [];
      ctx.lowStockProducts = lowArr.slice(0, 10).map(
        (p: any) => (p.name || p.title) + ' (Stock: ' + (p.stock ?? p.stock_left ?? '?') + ' units)'
      );
      ctx.lowStockCount = lowArr.length;
    } catch {}

    // 6. Out of stock products
    try {
      const outOfStock = await adminService.getOutOfStockProducts();
      const oos = Array.isArray(outOfStock) ? outOfStock : [];
      ctx.outOfStockProducts = oos.slice(0, 10).map((p: any) => p.name || p.title);
      ctx.outOfStockCount = oos.length;
    } catch {}

    // 7. Active coupons
    try {
      const couponsRes = await adminService.getAdminCoupons({ statusFilter: 'active', limit: 20 });
      const activeCoupons = (couponsRes.items || []).filter((c) => c.isActive);
      ctx.activeCoupons = activeCoupons.slice(0, 8).map(
        (c) =>
          c.couponCode + ' (' + (c.discountType === 'percentage' ? c.percentage + '% OFF' : 'Rs.' + c.fixedAmount + ' OFF') + ' | Min Order: Rs.' + c.minimumOrder + ' | Used: ' + c.usedCount + '/' + c.usageLimit + ')'
      );
    } catch {}

    // 8. Full product catalog with live stock
    try {
      const products = await productService.getProducts('all', '', 200);
      ctx.productCatalog = products
        .map((p) => {
          const stockNum = typeof p.stock === 'number' ? p.stock : null;
          const stockLabel =
            stockNum === null ? 'Stock Unknown' : stockNum === 0 ? 'Out of Stock' : stockNum <= 5 ? 'Low Stock (' + stockNum + ' left)' : 'In Stock (' + stockNum + ' units)';
          const discount = p.originalPrice ? ' | Original: Rs.' + p.originalPrice : '';
          const badge = p.badge ? ' [' + p.badge + ']' : '';
          return '- ID:' + p.id + ' | ' + p.title + ' | Cat: ' + p.category + ' | Price: Rs.' + p.price + discount + badge + ' | ' + stockLabel + ' | Rating: ' + p.rating + 'star';
        })
        .join('\n');
    } catch {}

    return ctx;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BUILD THE COMPREHENSIVE ADMIN SYSTEM PROMPT
  // ───────────────────────────────────────────────────────────────────────────
  private buildAdminSystemPrompt(ctx: AdminContext): string {
    const lowStockSection =
      ctx.lowStockProducts.length > 0
        ? ctx.lowStockProducts.join('\n')
        : 'None currently';

    const outOfStockSection =
      ctx.outOfStockProducts.length > 0
        ? ctx.outOfStockProducts.join('\n')
        : 'None currently';

    const topProductsSection =
      ctx.topProducts.length > 0
        ? ctx.topProducts.join('\n')
        : 'No sales data yet';

    const activeCouponsSection =
      ctx.activeCoupons.length > 0
        ? ctx.activeCoupons.join('\n')
        : 'No active coupons';

    const recentOrdersSection =
      ctx.recentOrders.length > 0
        ? ctx.recentOrders.join('\n')
        : 'No recent orders';

    return `You are "Meera Admin AI" - the full-stack administrative intelligence assistant for Meera Crackers, a premier Sivakasi Pyrotechnics & Fireworks store in Tamil Nadu, India.

You are speaking with the STORE ADMIN. You have complete knowledge of the business and access to all live data.

LIVE BUSINESS DASHBOARD (as of right now):
- Today's Revenue: Rs.${ctx.todayRevenue.toLocaleString('en-IN')}
- Today's Orders: ${ctx.todayOrders}
- Total Revenue (All Time): Rs.${ctx.totalRevenue.toLocaleString('en-IN')}
- Total Orders (All Time): ${ctx.totalOrders}
- Total Registered Users: ${ctx.totalUsers}
- Total Products: ${ctx.totalProducts}
- Total Stock Units: ${ctx.totalStockUnits.toLocaleString('en-IN')}

ORDER STATUS BREAKDOWN:
- Pending: ${ctx.pendingOrders}
- Confirmed: ${ctx.confirmedOrders}
- Shipped/In Transit: ${ctx.shippedOrders}
- Delivered: ${ctx.deliveredOrders}
- Cancelled: ${ctx.cancelledOrders}

RECENT ORDERS (Latest 5):
${recentOrdersSection}

TOP SELLING PRODUCTS:
${topProductsSection}

LOW STOCK ALERTS (${ctx.lowStockCount} products need attention):
${lowStockSection}

OUT OF STOCK (${ctx.outOfStockCount} products):
${outOfStockSection}

ACTIVE COUPONS:
${activeCouponsSection}

FULL PRODUCT CATALOG WITH LIVE STOCK:
${ctx.productCatalog}

STORE INFORMATION:
- Brand: Meera Crackers (Sivakasi Pyrotechnics Store)
- Phone/WhatsApp: +91 7339624431
- Email: Meeracrackers@gmail.com
- Location: Sivakasi, Tamil Nadu, India
- Backend: FastAPI + MongoDB Atlas
- Frontend: React Native (Expo) + TypeScript
- Features: Admin Dashboard, Inventory Management, Order Management, Coupon System, AI Chat, UPI Payments, GST Invoices, Daily Email Reports at 12 AM, Google Auth

CRITICAL LANGUAGE INSTRUCTIONS:
The admin may ask questions in English, Tamil, or Thanglish (Tamil words written in English letters like "evlo iruku", "sollu", "irukkura", "pannu", "paaru").
Examples:
- "low stock products sollu" means "tell me which products have low stock"
- "today revenue evlo?" means "what is today's revenue?"
- "pending orders evlo iruku?" means "how many pending orders are there?"
- "total users count sollu" means "tell me the total user count"
- "top products paaru" means "show me the top products"
- "out of stock ethu?" means "which products are out of stock?"

RULES:
1. Always understand the question regardless of which language (English/Tamil/Thanglish)
2. ALWAYS reply ONLY in English - never reply in Tamil or Thanglish
3. Be concise, data-driven, and give actionable insights
4. Use relevant emojis (business context: charts, boxes, money bags)
5. Always give exact numbers from the live data above
6. Format large numbers with Indian number formatting
7. Proactively give business advice - warn about low stock, suggest restocking, etc.
8. Be a smart business advisor, not just a data retrieval tool
9. If pending orders > 5, mention it as urgent
10. If out of stock count is high, suggest immediate restocking`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MAIN SEND MESSAGE
  // ───────────────────────────────────────────────────────────────────────────
  public async sendMessage(
    userText: string,
    chatHistory: ChatMessage[] = []
  ): Promise<{ text: string; recommendedProducts: ProductItem[] }> {
    const apiKey = ENV.OPENAI_API_KEY;

    // Gather live admin context
    const ctx = await this.gatherAdminContext();

    // Find recommended products for display
    let products: ProductItem[] = [];
    try {
      products = await productService.getProducts('all', '', 200);
    } catch {}
    const matchedProducts = this.matchProducts(products, userText.toLowerCase());

    // If no API key, use smart fallback
    if (!apiKey || apiKey.includes('your-api-key')) {
      return this.generateAdminFallbackResponse(userText, matchedProducts, ctx);
    }

    try {
      const systemPrompt = this.buildAdminSystemPrompt(ctx);

      const conversationPayload = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-8).map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })),
        { role: 'user', content: userText },
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: conversationPayload,
          temperature: 0.6,
          max_tokens: 700,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('[AdminAiChat] OpenAI error:', response.status, errorData);
        if (response.status === 404 || response.status === 429) {
          const fallbackRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + apiKey,
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: conversationPayload,
              temperature: 0.6,
              max_tokens: 700,
            }),
          });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            return { text: data.choices[0]?.message?.content || '', recommendedProducts: matchedProducts };
          }
        }
        return this.generateAdminFallbackResponse(userText, matchedProducts, ctx);
      }

      const data = await response.json();
      const aiText = data.choices[0]?.message?.content || 'I have the latest data ready. Please ask me anything!';
      return { text: aiText, recommendedProducts: matchedProducts };
    } catch (err) {
      console.error('[AdminAiChat] Exception:', err);
      return this.generateAdminFallbackResponse(userText, matchedProducts, ctx);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRODUCT MATCHING
  // ───────────────────────────────────────────────────────────────────────────
  private matchProducts(products: ProductItem[], lowerText: string): ProductItem[] {
    const keywords: Record<string, (p: ProductItem) => boolean> = {
      rocket: (p) => p.title.toLowerCase().includes('rocket'),
      sparkler: (p) => p.title.toLowerCase().includes('sparkler'),
      bomb: (p) => p.title.toLowerCase().includes('bomb') || p.category === 'atom-bombs',
      flower: (p) => p.title.toLowerCase().includes('flower'),
      shot: (p) => p.title.toLowerCase().includes('shot') || p.title.toLowerCase().includes('cake'),
      bijili: (p) => p.title.toLowerCase().includes('bijili'),
      chakkar: (p) => p.title.toLowerCase().includes('chakkar'),
      cheap: (p) => p.price < 300,
      budget: (p) => p.price < 300,
      best: (p) => !!(p.isFeatured || p.isBestseller || p.isFlashSale),
      featured: (p) => !!p.isFeatured,
      sale: (p) => !!p.isFlashSale,
    };

    for (const [kw, fn] of Object.entries(keywords)) {
      if (lowerText.includes(kw)) {
        return products.filter(fn).slice(0, 4);
      }
    }

    return products
      .filter(
        (p) =>
          p.title.toLowerCase().includes(lowerText) ||
          p.category.toLowerCase().includes(lowerText) ||
          (p.subtitle || '').toLowerCase().includes(lowerText)
      )
      .slice(0, 4);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SMART ADMIN FALLBACK - Handles Thanglish + Tamil + English
  // ───────────────────────────────────────────────────────────────────────────
  private generateAdminFallbackResponse(
    userText: string,
    matchedProducts: ProductItem[],
    ctx: AdminContext
  ): { text: string; recommendedProducts: ProductItem[] } {
    const q = userText.toLowerCase().trim();

    // 1. DATE & TIME QUERIES ("iniku date ena", "date", "naal", "time", "today date")
    if (
      q.includes('date') || q.includes('time') || q.includes('naal') ||
      q.includes('iniku date') || q.includes('inniku date') || q.includes('today date') ||
      q.includes('date ena') || q.includes('date enna')
    ) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return {
        text: `📅 **Today's Date & Time**\n\n🗓️ **Date:** ${dateStr}\n⏰ **Time:** ${timeStr} IST\n\n📊 **Quick Business Snapshot:**\n💰 Today's Revenue: **Rs.${ctx.todayRevenue.toLocaleString('en-IN')}**\n📦 Today's Orders: **${ctx.todayOrders}**\n⏳ Pending Orders: **${ctx.pendingOrders}**`,
        recommendedProducts: [],
      };
    }

    // 2. TODAY'S BUSINESS & PERFORMANCE ("iniku evolo buissness natanthuruku", "today sales", "iniku business")
    if (
      q.includes('buissness') || q.includes('business') ||
      q.includes('natanthuruku') || q.includes('nadanthuruku') ||
      q.includes('nadanthathukku') || q.includes('viyabaram') || q.includes('vyabaram') ||
      q.includes('today business') || q.includes('today sales') ||
      q.includes('iniku business') || q.includes('iniku sales') ||
      (q.includes('iniku') && (q.includes('evlo') || q.includes('evolo') || q.includes('evalo') || q.includes('buissness') || q.includes('natanthuruku') || q.includes('nadanthuruku'))) ||
      (q.includes('today') && (q.includes('revenue') || q.includes('sales') || q.includes('report') || q.includes('business')))
    ) {
      const avgOrder = ctx.todayOrders > 0 ? Math.round(ctx.todayRevenue / ctx.todayOrders) : 0;
      return {
        text: `📊 **Today's Business Summary** (${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})\n\n💰 **Today's Revenue:** Rs.${ctx.todayRevenue.toLocaleString('en-IN')}\n📦 **Today's Orders:** ${ctx.todayOrders}\n💳 **Avg Order Value:** Rs.${avgOrder.toLocaleString('en-IN')}\n⏳ **Pending Orders:** ${ctx.pendingOrders}\n\n` +
          (ctx.todayRevenue > 0
            ? `🎉 Today's store sales stand at **Rs.${ctx.todayRevenue.toLocaleString('en-IN')}** across **${ctx.todayOrders}** completed order(s).`
            : `📊 No sales registered today yet. Check pending orders to confirm processing!`),
        recommendedProducts: [],
      };
    }

    // 3. REVENUE / MONEY / EARNINGS ("Today revenue evlo?", "revenue", "panam", "income")
    if (
      q.includes('revenue') || q.includes('income') || q.includes('earnings') ||
      q.includes('panam') || q.includes('varumanam') || q.includes('vaaruvaai') ||
      q.includes('all time revenue') || q.includes('total revenue') ||
      (q.includes('sales') && !q.includes('top'))
    ) {
      return {
        text: `💰 **Revenue & Sales Breakdown**\n\n📅 **Today's Revenue:** Rs.${ctx.todayRevenue.toLocaleString('en-IN')}\n📦 **Today's Orders:** ${ctx.todayOrders}\n\n📈 **All-Time Total Revenue:** Rs.${ctx.totalRevenue.toLocaleString('en-IN')}\n📋 **All-Time Total Orders:** ${ctx.totalOrders}\n\n` +
          (ctx.todayRevenue > 0
            ? `🚀 Sales are running well today at Rs.${ctx.todayRevenue.toLocaleString('en-IN')}!`
            : `📊 Keep track of your order pipeline to maximize today's earnings.`),
        recommendedProducts: [],
      };
    }

    // 4. ORDERS & PIPELINE ("Pending orders evlo iruku?", "order status", "pending orders")
    if (
      q.includes('order') || q.includes('orders') || q.includes('pending') ||
      q.includes('shipped') || q.includes('delivered') || q.includes('cancelled') ||
      q.includes('aadar') || q.includes('ordar') || q.includes('pipeline')
    ) {
      const urgentAlert =
        ctx.pendingOrders > 0
          ? `\n\n⚠️ **Action Needed:** You have **${ctx.pendingOrders}** pending order(s) waiting for admin approval!`
          : '\n\n✅ All orders are processed! No pending orders right now.';
      return {
        text: `📋 **Order Status Breakdown**\n\n⏳ Pending: **${ctx.pendingOrders}**\n✅ Confirmed: **${ctx.confirmedOrders}**\n🚚 Shipped/In Transit: **${ctx.shippedOrders}**\n🎉 Delivered: **${ctx.deliveredOrders}**\n❌ Cancelled: **${ctx.cancelledOrders}**\n\n📦 **Total Orders:** ${ctx.totalOrders}${urgentAlert}\n\n**Recent Orders:**\n${ctx.recentOrders.join('\n') || 'No recent orders'}`,
        recommendedProducts: [],
      };
    }

    // 5. STOCK & INVENTORY ALERTS ("Low stock sollu", "out of stock ethu", "stock status")
    if (
      q.includes('stock') || q.includes('stokku') || q.includes('sarakku') ||
      q.includes('inventory') || q.includes('remaining') || q.includes('units') ||
      q.includes('irukkura') || q.includes('quantity')
    ) {
      const isLowStockQuery = q.includes('low') || q.includes('kurai') || q.includes('alert');
      const isOutOfStockQuery = q.includes('out') || q.includes('illa') || q.includes('empty');

      if (isLowStockQuery) {
        const lowList = ctx.lowStockProducts.length > 0
          ? ctx.lowStockProducts.join('\n')
          : '✅ No low stock products! All items have safe inventory levels.';
        return {
          text: `⚠️ **Low Stock Alerts (${ctx.lowStockCount} Products)**\n\n${lowList}\n\n💡 *Tip: Consider re-stocking low inventory items before peak Sivakasi festival demand!*`,
          recommendedProducts: [],
        };
      }

      if (isOutOfStockQuery) {
        const oosList = ctx.outOfStockProducts.length > 0
          ? ctx.outOfStockProducts.join('\n')
          : '✅ No out-of-stock products currently!';
        return {
          text: `❌ **Out of Stock Products (${ctx.outOfStockCount} Products)**\n\n${oosList}\n\n💡 *Tip: Update stock in Inventory Management to enable customer orders.*`,
          recommendedProducts: [],
        };
      }

      const lowList = ctx.lowStockProducts.length > 0 ? ctx.lowStockProducts.join('\n') : 'None ✅';
      const oosList = ctx.outOfStockProducts.length > 0 ? ctx.outOfStockProducts.join(', ') : 'None ✅';
      return {
        text: `📦 **Live Inventory Overview**\n\n🏪 **Total Products:** ${ctx.totalProducts}\n📦 **Total Stock Units:** ${ctx.totalStockUnits.toLocaleString('en-IN')}\n⚠️ **Low Stock Products:** ${ctx.lowStockCount}\n❌ **Out of Stock:** ${ctx.outOfStockCount}\n\n⚠️ **Low Stock Items:**\n${lowList}\n\n❌ **Out of Stock Items:**\n${oosList}`,
        recommendedProducts: [],
      };
    }

    // 6. USERS & CUSTOMERS ("Total users count", "user analytics")
    if (
      q.includes('user') || q.includes('users') || q.includes('customer') ||
      q.includes('customers') || q.includes('member') || q.includes('register') ||
      q.includes('aalu') || q.includes('makkal') || q.includes('evlo per')
    ) {
      return {
        text: `👥 **Customer & User Analytics**\n\n📊 **Total Registered Users:** ${ctx.totalUsers}\n\nTo view individual user accounts or edit privileges, navigate to **User Management** in the Admin Panel.`,
        recommendedProducts: [],
      };
    }

    // 7. COUPONS & DISCOUNTS ("Active coupons list", "coupons")
    if (
      q.includes('coupon') || q.includes('coupons') || q.includes('discount') ||
      q.includes('offer') || q.includes('promo') || q.includes('kupon')
    ) {
      const couponList = ctx.activeCoupons.length > 0 ? ctx.activeCoupons.join('\n') : 'No active coupons currently.';
      return {
        text: `🎟️ **Active Coupons (${ctx.activeCoupons.length})**\n\n${couponList}\n\nCreate or toggle promo coupons from **Coupon Management** in your Admin Panel.`,
        recommendedProducts: [],
      };
    }

    // 8. TOP SELLING PRODUCTS ("Top selling products paaru", "top products")
    if (
      q.includes('top') || q.includes('best sell') || q.includes('popular') ||
      q.includes('most sold') || q.includes('trending') || q.includes('highest') ||
      q.includes('atikam') || q.includes('bestseller')
    ) {
      const topList = ctx.topProducts.length > 0 ? ctx.topProducts.join('\n') : 'No sales data recorded yet.';
      return {
        text: `🏆 **Top Selling Fireworks**\n\n${topList}\n\n🚀 *Tip: Keep these top revenue items stocked to maintain store sales momentum!*`,
        recommendedProducts: [],
      };
    }

    // 9. FULL DASHBOARD SUMMARY ("Full dashboard summary", "overview", "analytics")
    if (
      q.includes('dashboard') || q.includes('summary') || q.includes('overview') ||
      q.includes('full report') || q.includes('analytics') || q.includes('all data')
    ) {
      return {
        text: `🏪 **Meera Crackers — Live Admin Dashboard Summary**\n\n💰 **Today's Revenue:** Rs.${ctx.todayRevenue.toLocaleString('en-IN')}\n📦 **Today's Orders:** ${ctx.todayOrders}\n📈 **All-Time Revenue:** Rs.${ctx.totalRevenue.toLocaleString('en-IN')}\n📋 **Total Orders:** ${ctx.totalOrders}\n👥 **Registered Users:** ${ctx.totalUsers}\n\n🚦 **Order Pipeline:**\n⏳ Pending: ${ctx.pendingOrders} | ✅ Confirmed: ${ctx.confirmedOrders} | 🚚 Shipped: ${ctx.shippedOrders} | 🎉 Delivered: ${ctx.deliveredOrders}\n\n📦 **Inventory:**\n🏪 Total Products: ${ctx.totalProducts} | ⚠️ Low Stock: ${ctx.lowStockCount} | ❌ Out of Stock: ${ctx.outOfStockCount}\n\n🏆 **Top Products:**\n${ctx.topProducts.join('\n') || 'No sales data yet'}`,
        recommendedProducts: [],
      };
    }

    // 10. GREETINGS ("hii", "hello", "vanakkam")
    if (
      q === 'hii' || q === 'hi' || q === 'hello' || q === 'hey' ||
      q.includes('vanakkam') || q.includes('greetings')
    ) {
      return {
        text: `👋 **Hello, Admin!**\n\nI'm **Meera Admin AI** — your store intelligence assistant with live data access.\n\n📊 **Quick Snapshot:**\n💰 Today's Revenue: **Rs.${ctx.todayRevenue.toLocaleString('en-IN')}**\n⏳ Pending Orders: **${ctx.pendingOrders}**\n⚠️ Low Stock Products: **${ctx.lowStockCount}**\n❌ Out of Stock: **${ctx.outOfStockCount}**\n👥 Total Users: **${ctx.totalUsers}**\n\nAsk me anything in **English, Tamil, or Thanglish!**\n• "Today revenue evlo?"\n• "Low stock products sollu"\n• "Pending orders evlo iruku?"\n• "Top selling products paaru"\n• "Active coupons list"\n• "Full dashboard summary"`,
        recommendedProducts: [],
      };
    }

    // 11. CATALOG PRODUCT MATCH
    if (matchedProducts.length > 0) {
      const productDetails = matchedProducts
        .map((p) => {
          const stock =
            typeof p.stock === 'number'
              ? p.stock === 0
                ? '❌ Out of Stock'
                : p.stock <= 5
                ? '⚠️ Low Stock (' + p.stock + ' left)'
                : '✅ ' + p.stock + ' units'
              : 'Stock Unknown';
          return '• **' + p.title + '** — Rs.' + p.price + ' | ' + stock + ' | Rating: ' + p.rating + '⭐';
        })
        .join('\n');
      return {
        text: '🎆 **Matching Fireworks in Catalog:**\n\n' + productDetails,
        recommendedProducts: matchedProducts,
      };
    }

    // 12. SMART UNMATCHED FALLBACK — helpful guide instead of generic repeat
    return {
      text: `🔍 **Admin Intelligence Assistant**\n\nI couldn't match your query: *"_${userText}_"*\n\nHere are sample questions you can ask me:\n• 💰 **Revenue:** *"iniku evolo buissness natanthuruku"* or *"Today revenue evlo?"*\n• 📅 **Date & Time:** *"iniku date ena"* or *"today date"*\n• 🚚 **Orders:** *"Pending orders status"* or *"pending orders evlo iruku?"*\n• 📦 **Stock:** *"Low stock products sollu"* or *"out of stock ethu?"*\n• 🏆 **Top Products:** *"Top selling products paaru"*\n• 🎟️ **Coupons:** *"Active coupons list"*\n• 📊 **Full Status:** *"Full dashboard summary"*`,
      recommendedProducts: [],
    };
  }
}
