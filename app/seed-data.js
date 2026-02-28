// Realistic UK interior design studio seed data
// All data is internally consistent: totals match, dates are sequential,
// dependencies are valid, invoice items exist in procurement.

export const seedData = {
  activeProjectId: 'proj-kensington',

  // ── Projects ──────────────────────────────────────────────────────────

  projects: [
    {
      id: 'proj-kensington',
      name: 'Kensington Townhouse',
      client: 'Mr & Mrs Harrington',
      status: 'active',
      budget: 185000,
      address: '42 Pembroke Gardens, London W8 6HJ',
      phone: '020 7937 4821',
      email: 'harringtons@gmail.com',
      startDate: '2026-01-15',
      endDate: '2026-06-30',
      rooms: ['Drawing Room', 'Master Bedroom', 'Kitchen', 'Dining Room', 'Study', 'Hallway', 'Guest Bedroom', 'Bathroom'],
      notes: 'Full renovation of Grade II listed townhouse. Planning consent granted Nov 2025. Clients prefer traditional-contemporary blend, emphasis on quality craftsmanship. Listed building restrictions apply to front facade and original cornicing.'
    },
    {
      id: 'proj-chelsea',
      name: 'Chelsea Apartment',
      client: 'Sophie Laurent',
      status: 'planning',
      budget: 95000,
      address: '18 Sloane Court, London SW3 4TD',
      phone: '07700 934112',
      email: 'sophie.laurent@outlook.com',
      startDate: '2026-03-01',
      endDate: '2026-08-15',
      rooms: ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Study'],
      notes: 'Pied-a-terre for French client. Modern minimalist brief — Parisian-meets-London aesthetic. Client travels frequently, prefers remote approvals via client portal. Freeholder approval needed for structural work.'
    },
    {
      id: 'proj-cotswolds',
      name: 'Cotswolds Cottage',
      client: 'James & Emma Whitfield',
      status: 'completed',
      budget: 62000,
      address: 'Rose Cottage, 3 Church Lane, Burford, Oxfordshire OX18 4RR',
      phone: '01993 822410',
      email: 'whitfields@btinternet.com',
      startDate: '2025-06-01',
      endDate: '2025-12-20',
      rooms: ['Living Room', 'Kitchen', 'Master Bedroom', 'Bedroom 2', 'Bathroom'],
      notes: 'Weekend retreat renovation. Emphasis on natural materials, country style with modern comforts. Completed on time and within budget. Clients very happy — refer for testimonials.'
    }
  ],

  // ── Procurement Items ─────────────────────────────────────────────────

  items: [
    // ── Kensington: Drawing Room (5 items) ──
    { id: 'item-1', projectId: 'proj-kensington', name: 'Velvet Sofa — Emerald', supplier: 'Sofa Workshop', room: 'Drawing Room', trade: 3200, markup: 35, status: 'delivered', category: 'Furniture', notes: 'Custom 240cm 3-seater, turned brass legs, COM velvet in "Woodland" colourway. Lead time was 9 weeks from order.' },
    { id: 'item-2', projectId: 'proj-kensington', name: 'Silk Curtain Fabric — Ivory', supplier: 'Designers Guild', room: 'Drawing Room', trade: 890, markup: 40, status: 'ordered', category: 'Fabric', notes: '12m of "Chinon" silk in Ivory. Pattern repeat 64cm. To be made up by curtain workroom — 2 pairs, triple pleat heading, interlined.' },
    { id: 'item-3', projectId: 'proj-kensington', name: 'Pendant Light — Brass Cluster', supplier: 'Tom Dixon', room: 'Drawing Room', trade: 1450, markup: 30, status: 'delivered', category: 'Lighting', notes: 'Melt Pendant cluster of 3, Gold finish. Ceiling rose plate included. Requires 3m drop — confirm with electrician.' },
    { id: 'item-5', projectId: 'proj-kensington', name: 'Marble Coffee Table — Calacatta', supplier: 'Benchmark', room: 'Drawing Room', trade: 2100, markup: 35, status: 'shipped', category: 'Furniture', notes: 'Custom top cut to 120x60cm on solid oak base. Calacatta Oro marble, honed finish, sealed with Lithofin.' },
    { id: 'item-13', projectId: 'proj-kensington', name: 'Hand-knotted Rug — Persian', supplier: 'Luke Irwin', room: 'Drawing Room', trade: 5600, markup: 30, status: 'quoted', category: 'Fabric', notes: '300x400cm bespoke colourway to match scheme. Tibetan wool/silk blend. 10-14 week lead time from approval of strike-off.' },

    // ── Kensington: Master Bedroom (4 items) ──
    { id: 'item-9', projectId: 'proj-kensington', name: 'Linen Bedding Set — Blush', supplier: 'The Linen Works', room: 'Master Bedroom', trade: 420, markup: 45, status: 'delivered', category: 'Fabric', notes: 'Superking set: duvet cover, 4 Oxford pillowcases, flat sheet. Belgian flax linen, pre-washed in "Blush" colourway.' },
    { id: 'item-19', projectId: 'proj-kensington', name: 'Roman Blinds — Blackout Lined', supplier: 'Designers Guild', room: 'Master Bedroom', trade: 960, markup: 35, status: 'quoted', category: 'Fabric', notes: '3 windows (2x 120cm, 1x 90cm wide). "Brera Lino" fabric in Rose. Blackout lined, side-wound chain mechanism, Silent Gliss track.' },
    { id: 'item-21', projectId: 'proj-kensington', name: 'Bedside Tables — Pair', supplier: 'Sebastian Cox', room: 'Master Bedroom', trade: 1600, markup: 25, status: 'ordered', category: 'Furniture', notes: 'Bespoke pair in English ash, single drawer with leather pull, 55cm H x 45cm W x 35cm D. Natural oil finish.' },
    { id: 'item-22', projectId: 'proj-kensington', name: 'Wall Lights — Antiqued Brass', supplier: 'Vaughan Designs', room: 'Master Bedroom', trade: 520, markup: 35, status: 'spec', category: 'Lighting', notes: 'Pair of Chatsworth wall lights, antiqued brass with card shades. Wired — coordinate with electrician for 1st fix positions.' },

    // ── Kensington: Kitchen (4 items) ──
    { id: 'item-7', projectId: 'proj-kensington', name: 'Bespoke Kitchen Cabinetry', supplier: 'Plain English', room: 'Kitchen', trade: 18500, markup: 20, status: 'spec', category: 'Furniture', notes: 'Shaker-style run, hand-painted in "Bone". Includes island unit with integrated seating, larder cupboard. Carrara marble worktops quoted separately. 12-16 week lead from sign-off.' },
    { id: 'item-11', projectId: 'proj-kensington', name: 'Zellige Tiles — Blanc', supplier: 'Emery et Cie', room: 'Kitchen', trade: 2200, markup: 30, status: 'spec', category: 'Tiles', notes: '10sqm for backsplash, handmade zellige in Blanc (off-white). 10x10cm format, half-offset pattern. Allow 15% wastage for cuts.' },
    { id: 'item-20', projectId: 'proj-kensington', name: 'Worktop — Carrara Marble', supplier: 'Stone Age', room: 'Kitchen', trade: 3400, markup: 20, status: 'spec', category: 'Tiles', notes: '30mm Carrara marble, honed finish with eased edge. Template after kitchen installation. Includes cutouts for sink and hob. Sealed with Dry Treat.' },
    { id: 'item-23', projectId: 'proj-kensington', name: 'Pendant Lights — Kitchen Island', supplier: 'Tom Dixon', room: 'Kitchen', trade: 780, markup: 30, status: 'quoted', category: 'Lighting', notes: 'Beat Wide pendants x3, Brushed Brass. Hang at 70cm above island surface. Confirm island position with Plain English before ordering.' },

    // ── Kensington: Dining Room (3 items) ──
    { id: 'item-14', projectId: 'proj-kensington', name: 'Dining Table — Walnut', supplier: 'Benchmark', room: 'Dining Room', trade: 4200, markup: 25, status: 'ordered', category: 'Furniture', notes: 'English walnut, live edge, seats 8 comfortably (240x100cm). Butterfly joints on natural splits. Danish oil finish.' },
    { id: 'item-15', projectId: 'proj-kensington', name: 'Dining Chairs x6 — Tan Leather', supplier: 'Benchmark', room: 'Dining Room', trade: 3600, markup: 30, status: 'spec', category: 'Furniture', notes: 'Pendleton chair in vegetable-tanned leather, oak frame. Set of 6 with 2 carvers. Lead time matches table at 10-14 weeks.' },
    { id: 'item-24', projectId: 'proj-kensington', name: 'Chandelier — Dining Room', supplier: 'Vaughan Designs', room: 'Dining Room', trade: 1850, markup: 30, status: 'ordered', category: 'Lighting', notes: 'Villiers chandelier, 6-arm, antiqued brass. 65cm diameter — confirm ceiling height allows 2.2m clearance below.' },

    // ── Kensington: Study (3 items) ──
    { id: 'item-4', projectId: 'proj-kensington', name: 'Hague Blue — 5L Estate Emulsion', supplier: 'Farrow & Ball', room: 'Study', trade: 115, markup: 25, status: 'installed', category: 'Paint', notes: '2 x 5L tins. Walls and ceiling, 2 coats over Farrow & Ball primer. Study is approx 14sqm wall area.' },
    { id: 'item-10', projectId: 'proj-kensington', name: 'Bespoke Shelving Unit — Oak', supplier: 'Sebastian Cox', room: 'Study', trade: 3800, markup: 25, status: 'ordered', category: 'Furniture', notes: 'Floor-to-ceiling unit, 280cm H x 200cm W. English oak, natural oil finish. Integrated LED strip lighting on 3 shelves. Adjustable shelf positions.' },
    { id: 'item-25', projectId: 'proj-kensington', name: 'Desk Chair — Saddle Leather', supplier: 'Benchmark', room: 'Study', trade: 1200, markup: 25, status: 'spec', category: 'Furniture', notes: 'Bridge chair in saddle leather, American walnut frame. Ergonomic yet beautiful — suits long working hours.' },

    // ── Kensington: Hallway (4 items) ──
    { id: 'item-6', projectId: 'proj-kensington', name: 'Handmade Encaustic Tiles', supplier: 'Bert & May', room: 'Hallway', trade: 1680, markup: 30, status: 'ordered', category: 'Tiles', notes: '15sqm, Estrella pattern in Fog colourway. Includes border tiles. Allow 10% extra for cuts and spares. Underfloor heating compatible.' },
    { id: 'item-8', projectId: 'proj-kensington', name: 'Wall Sconces — Antiqued Brass', supplier: 'Vaughan Designs', room: 'Hallway', trade: 680, markup: 35, status: 'quoted', category: 'Lighting', notes: 'Pair of Zurich sconces for entrance hall. Antiqued brass with frosted glass shades. Height 32cm, projection 15cm.' },
    { id: 'item-12', projectId: 'proj-kensington', name: 'Antique Mirror — Foxed Glass', supplier: 'Designers Guild', room: 'Hallway', trade: 950, markup: 40, status: 'shipped', category: 'Furniture', notes: 'Floor-length foxed mirror, gilt frame, 180x90cm. Delivery to site — requires 2-person carry. Wall fixings by contractor.' },
    { id: 'item-18', projectId: 'proj-kensington', name: 'Door Handles — Aged Brass', supplier: 'Joseph Giles', room: 'Hallway', trade: 1200, markup: 30, status: 'delivered', category: 'Hardware', notes: 'Set of 8 lever handles on round rose, "Taper" design, aged brass finish. Includes bathroom turn-and-release x1.' },

    // ── Kensington: Bathroom (2 items) ──
    { id: 'item-16', projectId: 'proj-kensington', name: 'Bathroom Suite — Burlington', supplier: 'C.P. Hart', room: 'Bathroom', trade: 4800, markup: 20, status: 'ordered', category: 'Furniture', notes: 'Burlington freestanding bath (1700mm), Arcade basin on pedestal, Arcade close-coupled WC. All chrome fittings. Crosshead taps.' },
    { id: 'item-26', projectId: 'proj-kensington', name: 'Bathroom Floor Tiles — Marble Hex', supplier: 'Stone Age', room: 'Bathroom', trade: 680, markup: 25, status: 'spec', category: 'Tiles', notes: '5sqm Carrara marble hexagonal mosaic, 50mm size, polished finish. Mesh-backed sheets for easy laying. Latex waterproof membrane underneath.' },

    // ── Kensington: Guest Bedroom (2 items) ──
    { id: 'item-17', projectId: 'proj-kensington', name: 'Smart Thermostat — Hive', supplier: 'Hive', room: 'Guest Bedroom', trade: 180, markup: 15, status: 'installed', category: 'Hardware', notes: 'Hive Active Heating kit, professional installation included. Multi-zone setup — this unit controls first floor.' },
    { id: 'item-27', projectId: 'proj-kensington', name: 'Wimborne White — 5L Estate Emulsion', supplier: 'Farrow & Ball', room: 'Guest Bedroom', trade: 98, markup: 25, status: 'delivered', category: 'Paint', notes: '2 x 5L tins. Walls and woodwork (modern eggshell for trim). Light, airy feel for north-facing room.' },

    // ── Chelsea Apartment (5 items, all spec/quoted) ──
    { id: 'item-c1', projectId: 'proj-chelsea', name: 'Modular Sofa — Grey Boucle', supplier: 'Sofa Workshop', room: 'Living Room', trade: 2800, markup: 35, status: 'spec', category: 'Furniture', notes: 'L-shape configuration, 280x200cm. Boucle fabric in "Storm" colourway. Low-profile contemporary design.' },
    { id: 'item-c2', projectId: 'proj-chelsea', name: 'Kitchen Units — Matt Black', supplier: 'Plain English', room: 'Kitchen', trade: 12000, markup: 20, status: 'quoted', category: 'Furniture', notes: 'Handleless design with push-to-open mechanisms. Spray-finished in matt black. Includes integrated appliance housing.' },
    { id: 'item-c3', projectId: 'proj-chelsea', name: 'Chevron Oak Flooring', supplier: 'Stone Age', room: 'Living Room', trade: 3200, markup: 20, status: 'spec', category: 'Tiles', notes: 'European oak chevron parquet, 600x120x15mm. Engineered board, brushed and oiled. 45sqm total across living, bedroom and study.' },
    { id: 'item-c4', projectId: 'proj-chelsea', name: 'Pendant Light — Concrete', supplier: 'Tom Dixon', room: 'Living Room', trade: 420, markup: 30, status: 'spec', category: 'Lighting', notes: 'Heavy Light pendant, large. Concrete exterior, brass interior. Statement piece for double-height living area.' },
    { id: 'item-c5', projectId: 'proj-chelsea', name: 'Freestanding Bath — Lusso', supplier: 'C.P. Hart', room: 'Bathroom', trade: 2400, markup: 20, status: 'quoted', category: 'Furniture', notes: 'Lusso Stone Cocoon bath, 1700mm. Solid surface material, matte white finish. Floor-standing taps required.' },

    // ── Cotswolds Cottage (5 items, all installed) ──
    { id: 'item-w1', projectId: 'proj-cotswolds', name: 'Linen Curtains — Natural', supplier: 'The Linen Works', room: 'Living Room', trade: 680, markup: 40, status: 'installed', category: 'Fabric', notes: 'Heavy-weight Belgian linen in Natural. 4 pairs, eyelet heading on matt black poles. Floor-length with 2cm break.' },
    { id: 'item-w2', projectId: 'proj-cotswolds', name: 'Shaker Kitchen — Sage Green', supplier: 'Plain English', room: 'Kitchen', trade: 14200, markup: 18, status: 'installed', category: 'Furniture', notes: 'Spitalfields range in hand-painted Sage. Includes butler sink, plate rack, integrated dishwasher housing. Honed slate worktops.' },
    { id: 'item-w3', projectId: 'proj-cotswolds', name: 'Oak Dining Table — 6 Seater', supplier: 'Benchmark', room: 'Kitchen', trade: 2800, markup: 25, status: 'installed', category: 'Furniture', notes: 'English oak refectory table, 180x90cm. Trestle base, waxed finish. Sits in kitchen-diner area.' },
    { id: 'item-w4', projectId: 'proj-cotswolds', name: 'Roll-top Bath — Cast Iron', supplier: 'C.P. Hart', room: 'Bathroom', trade: 3200, markup: 20, status: 'installed', category: 'Furniture', notes: 'Hurlingham Mayfair cast iron bath, 1700mm. Painted exterior in F&B "Pigeon". Ball-and-claw feet in chrome.' },
    { id: 'item-w5', projectId: 'proj-cotswolds', name: 'Flagstone Floor Tiles', supplier: 'Stone Age', room: 'Kitchen', trade: 1800, markup: 22, status: 'installed', category: 'Tiles', notes: '20sqm Cotswold limestone flagstones, tumbled finish. Random sizes, hand-cut for around island unit. Underfloor heating compatible.' }
  ],

  // ── Suppliers ──────────────────────────────────────────────────────────

  suppliers: [
    { id: 'sup-1', name: 'Designers Guild', category: 'Fabric & Soft Furnishings', rating: 5, tradeAccount: true, leadTime: '3-4 weeks', discount: 30, phone: '020 7893 7400', email: 'trade@designersguild.com', website: 'designersguild.com', address: '267-271 Kings Road, London SW3 5EN', notes: 'Excellent fabric and wallpaper range. Tricia Guild collection outstanding. Reliable delivery, good trade terms. Contact Sarah in trade dept.' },
    { id: 'sup-2', name: 'Farrow & Ball', category: 'Paint & Wallpaper', rating: 5, tradeAccount: true, leadTime: '3-5 days', discount: 25, phone: '01202 876141', email: 'trade@farrow-ball.com', website: 'farrow-ball.com', address: 'Uddens Estate, Wimborne, Dorset BH21 7NL', notes: 'Best heritage colours in the business. Fast dispatch for stock colours. Colour consultancy service helpful for listed buildings. Trade card essential.' },
    { id: 'sup-3', name: 'Tom Dixon', category: 'Lighting & Accessories', rating: 4, tradeAccount: true, leadTime: '4-6 weeks', discount: 20, phone: '020 7183 9733', email: 'sales@tomdixon.net', website: 'tomdixon.net', address: '11-17 Bagley Walk, Portobello Dock, London W10 6DG', notes: 'Statement lighting and accessories. The Melt and Beat ranges are perennial favourites. Worth the lead time. Contact James for bespoke cluster configurations.' },
    { id: 'sup-4', name: 'Sofa Workshop', category: 'Upholstered Furniture', rating: 4, tradeAccount: true, leadTime: '8-10 weeks', discount: 15, phone: '020 7534 0190', email: 'trade@sofaworkshop.com', website: 'sofaworkshop.com', address: 'Design Quarter, Chelsea Harbour, London SW10 0XE', notes: 'Good quality mid-range upholstery. Custom sizing available at no extra charge. COM service reliable. Delivery and placement included in trade orders.' },
    { id: 'sup-5', name: 'Bert & May', category: 'Handmade Tiles', rating: 5, tradeAccount: true, leadTime: '6-8 weeks', discount: 15, phone: '020 3744 0776', email: 'hello@bertandmay.com', website: 'bertandmay.com', address: '67-69 Vyner Street, London E2 9DQ', notes: 'Beautiful handmade encaustic and concrete tiles. Showroom is a must-visit for clients. Bespoke colourways possible on min. 20sqm orders. Allow extra for wastage.' },
    { id: 'sup-6', name: 'Plain English', category: 'Bespoke Kitchens', rating: 5, tradeAccount: false, leadTime: '12-16 weeks', discount: 0, phone: '01449 774028', email: 'info@plainenglishdesign.co.uk', website: 'plainenglishdesign.co.uk', address: 'Tannery Road, Combs, Stowmarket, Suffolk IP14 2EN', notes: 'Exceptional hand-built kitchens, no trade discount but margins on specification fee. Clients deal direct for measurements — we attend design meetings. Long lead time but worth every week.' },
    { id: 'sup-7', name: 'Vaughan Designs', category: 'Decorative Lighting', rating: 5, tradeAccount: true, leadTime: '6-8 weeks', discount: 25, phone: '020 7349 4600', email: 'sales@vaughandesigns.com', website: 'vaughandesigns.com', address: 'Chelsea Harbour Design Centre, London SW10 0XE', notes: 'Trade-only heritage lighting. Exceptional quality, hand-finished. Custom finishes available (+2 weeks). Best antiqued brass in the industry. Ask for Rebecca.' },
    { id: 'sup-8', name: 'Luke Irwin', category: 'Bespoke Rugs', rating: 5, tradeAccount: true, leadTime: '10-14 weeks', discount: 20, phone: '020 7730 6070', email: 'studio@lukeirwin.com', website: 'lukeirwin.com', address: '25 Pimlico Road, London SW1W 8NE', notes: 'Bespoke hand-knotted rugs, exceptional quality. Tibetan wool/silk blends. Strike-off approval process takes 2 weeks. Final rug 10-14 weeks from strike-off.' },
    { id: 'sup-9', name: 'C.P. Hart', category: 'Luxury Bathrooms', rating: 4, tradeAccount: true, leadTime: '2-4 weeks', discount: 20, phone: '020 7902 1000', email: 'trade@cphart.co.uk', website: 'cphart.co.uk', address: 'Newnham Terrace, Hercules Road, London SE1 7DR', notes: 'Largest luxury bathroom showroom in the UK. Huge range from traditional to contemporary. Good trade terms, delivery reliable. Waterloo showroom is excellent for client meetings.' },
    { id: 'sup-10', name: 'Joseph Giles', category: 'Architectural Hardware', rating: 5, tradeAccount: true, leadTime: '4-6 weeks', discount: 15, phone: '020 7384 2424', email: 'info@josephgiles.com', website: 'josephgiles.com', address: 'Unit 3, 23 Lots Road, London SW10 0QJ', notes: 'Bespoke door and cabinet hardware, handmade in England. Aged brass specialist — their patination process is unique. Allow 6 weeks for bespoke finishes. Worth every penny.' },
    { id: 'sup-11', name: 'Sebastian Cox', category: 'Bespoke Joinery', rating: 4, tradeAccount: true, leadTime: '8-12 weeks', discount: 10, phone: '020 8963 9934', email: 'studio@sebastiancox.co.uk', website: 'sebastiancox.co.uk', address: 'Unit 5, Bermondsey Trading Estate, London SE16 3LL', notes: 'Sustainable British craftsman, specialises in coppiced and native timbers. Beautiful bespoke shelving and fitted furniture. Small workshop — book early. Environmentally conscious clients love the story.' },
    { id: 'sup-12', name: 'Benchmark', category: 'Fine Furniture', rating: 5, tradeAccount: true, leadTime: '10-14 weeks', discount: 15, phone: '01488 608020', email: 'enquiries@benchmarkfurniture.com', website: 'benchmarkfurniture.com', address: 'Bath Road, Kintbury, Berkshire RG17 9SA', notes: 'Founded with Terence Conran, exceptional dining tables and chairs. English walnut and oak specialist. Factory visit highly recommended for clients — beautiful workshop in Berkshire countryside.' },
    { id: 'sup-13', name: 'The Linen Works', category: 'Bed & Table Linen', rating: 4, tradeAccount: true, leadTime: '1-2 weeks', discount: 20, phone: '020 7819 7620', email: 'trade@thelinenworks.co.uk', website: 'thelinenworks.co.uk', address: '117 Walton Street, London SW3 2HP', notes: 'Belgian flax linen bedding and table linen. Pre-washed for softness. Good stock levels, fast turnaround. Trade sample cuts available. Perfect for that relaxed luxury look.' },
    { id: 'sup-14', name: 'Emery et Cie', category: 'Artisan Tiles & Paint', rating: 5, tradeAccount: true, leadTime: '8-10 weeks', discount: 15, phone: '+32 2 513 5892', email: 'info@emeryetcie.com', website: 'emeryetcie.com', address: 'Rue de l\'Hopital 25-29, 1000 Brussels, Belgium', notes: 'Handmade zellige tiles from Morocco, sold through Brussels showroom. Unique irregular character. Order in sqm plus 15% wastage. Shipping from Belgium adds 1-2 weeks to lead time.' },
    { id: 'sup-15', name: 'Stone Age', category: 'Natural Stone & Flooring', rating: 4, tradeAccount: true, leadTime: '3-6 weeks', discount: 18, phone: '020 8985 6900', email: 'trade@stoneage.co.uk', website: 'stoneage.co.uk', address: 'Unit 2, Hackney Downs Studios, London E8 2BT', notes: 'Good range of natural stone and engineered flooring. Marble worktops templated and fabricated in-house. Competitive pricing for trade. Cotswold limestone and Carrara marble always in stock.' }
  ],

  // ── Tasks (15 for Kensington) ─────────────────────────────────────────

  tasks: [
    { id: 'task-1', projectId: 'proj-kensington', name: 'Demolition & Strip-out', contractor: 'BuildRight Ltd', start: '2026-01-20', end: '2026-02-02', progress: 100, phase: 'structural', depends: [], notes: 'Remove existing kitchen, bathroom fittings, non-structural walls between study and hallway. Skip hire arranged for 2 weeks. Asbestos survey clear.' },
    { id: 'task-2', projectId: 'proj-kensington', name: 'Structural Works', contractor: 'BuildRight Ltd', start: '2026-02-03', end: '2026-02-20', progress: 100, phase: 'structural', depends: ['task-1'], notes: 'New RSJ between kitchen and dining room (opening up). Underpinning to rear addition. Structural engineer approved. Building control inspection booked for Feb 20.' },
    { id: 'task-3', projectId: 'proj-kensington', name: '1st Fix Electrics', contractor: 'Spark & Wire Electrical', start: '2026-02-23', end: '2026-03-09', progress: 85, phase: 'firstfix', depends: ['task-2'], notes: 'Full rewire, new consumer unit. Lighting positions per drawing set v3.2. 5A circuit for drawing room pendants. Data cabling to study and kitchen. Smart home wiring prep.' },
    { id: 'task-4', projectId: 'proj-kensington', name: '1st Fix Plumbing', contractor: 'Thames Plumbing Co.', start: '2026-02-23', end: '2026-03-09', progress: 70, phase: 'firstfix', depends: ['task-2'], notes: 'New 22mm copper mains, hot/cold feeds to kitchen and bathroom. Soil pipe rerouting for bathroom relocation. Condensate drain for boiler. Underfloor heating manifold position confirmed.' },
    { id: 'task-5', projectId: 'proj-kensington', name: 'Underfloor Heating', contractor: 'Thames Plumbing Co.', start: '2026-03-05', end: '2026-03-16', progress: 60, phase: 'firstfix', depends: ['task-4'], notes: 'Wet UFH system to hallway, kitchen, dining room, bathroom (ground floor). Insulation boards + pipes. 5-zone manifold. Pressure test before screed. Commissioning after screed cure.' },
    { id: 'task-6', projectId: 'proj-kensington', name: 'Plastering', contractor: 'Artisan Plastering Ltd', start: '2026-03-12', end: '2026-03-27', progress: 30, phase: 'finishing', depends: ['task-3', 'task-4'], notes: 'Lime plaster to all rooms (listed building requirement for external walls). Gypsum to partitions. Cornice repairs in drawing room and hallway — match existing profile. Drying time 2 weeks before painting.' },
    { id: 'task-7', projectId: 'proj-kensington', name: 'Kitchen Installation', contractor: 'Plain English', start: '2026-03-30', end: '2026-04-14', progress: 0, phase: 'install', depends: ['task-6'], notes: 'Plain English fitting team, 2 fitters for 12 days. Carcasses first, then doors and drawers. We attend for island position sign-off on Day 1. Marble worktops templated after cab installation.' },
    { id: 'task-8', projectId: 'proj-kensington', name: 'Bathroom Installation', contractor: 'C.P. Hart Installations', start: '2026-03-30', end: '2026-04-10', progress: 0, phase: 'install', depends: ['task-6'], notes: 'Burlington suite installation. Freestanding bath requires floor reinforcement check (done). Basin and WC positions per drawing. Chrome fittings. Tile splashbacks by Bert & May fitting team.' },
    { id: 'task-9', projectId: 'proj-kensington', name: 'Painting & Decorating', contractor: 'Colour & Form Decorating', start: '2026-04-01', end: '2026-04-22', progress: 0, phase: 'finishing', depends: ['task-6'], notes: 'All rooms per colour schedule v2.1. Farrow & Ball throughout. Estate Emulsion walls, Modern Eggshell woodwork. 2 coats minimum on all surfaces. Painters to protect installed items.' },
    { id: 'task-10', projectId: 'proj-kensington', name: 'Tiling — Kitchen & Bathrooms', contractor: 'Bert & May Fitting', start: '2026-04-01', end: '2026-04-14', progress: 0, phase: 'finishing', depends: ['task-6'], notes: 'Hallway encaustic tiles, kitchen zellige backsplash, bathroom marble hexagonal floor. Specialist adhesives required for marble. Hallway pattern to be set out from centre with symmetrical cuts at edges.' },
    { id: 'task-11', projectId: 'proj-kensington', name: '2nd Fix Electrics', contractor: 'Spark & Wire Electrical', start: '2026-04-23', end: '2026-05-04', progress: 0, phase: 'finishing', depends: ['task-9'], notes: 'All face plates (brushed brass, Forbes & Lomax). Pendant installations, wall light connections, under-cabinet lighting. Smart switches programming. Testing and EICR certificate.' },
    { id: 'task-12', projectId: 'proj-kensington', name: '2nd Fix Plumbing', contractor: 'Thames Plumbing Co.', start: '2026-04-23', end: '2026-04-30', progress: 0, phase: 'finishing', depends: ['task-9'], notes: 'Tap fitting, waste connections, bath filler installation. Boiler commissioning and gas safety certificate. UFH commissioning and balancing. Final pressure test.' },
    { id: 'task-13', projectId: 'proj-kensington', name: 'Joinery & Shelving', contractor: 'Sebastian Cox', start: '2026-04-23', end: '2026-05-06', progress: 0, phase: 'install', depends: ['task-9'], notes: 'Study shelving unit installation (floor-to-ceiling, pre-built sections). LED strip wiring by electrician prior. Hallway bench and coat hooks. Window seat in Master Bedroom (if time permits — lower priority).' },
    { id: 'task-14', projectId: 'proj-kensington', name: 'Furniture Delivery & Placement', contractor: 'DesignDesk Team', start: '2026-05-07', end: '2026-05-20', progress: 0, phase: 'install', depends: ['task-9', 'task-10', 'task-11'], notes: 'Staged delivery over 2 weeks. Sofa + coffee table first (drawing room). Dining table + chairs. Bedroom furniture. Rug last (after all foot traffic complete). White glove delivery on all items.' },
    { id: 'task-15', projectId: 'proj-kensington', name: 'Snagging & Final Touches', contractor: 'DesignDesk Team', start: '2026-05-21', end: '2026-06-02', progress: 0, phase: 'install', depends: ['task-14'], notes: 'Full snagging list walkthrough with contractors. Touch-up painting, hardware tightening, alignment checks. Curtain hanging, cushion/throw styling. Professional clean. Handover meeting with clients + maintenance manual.' }
  ],

  // ── Invoices ──────────────────────────────────────────────────────────

  invoices: [
    {
      id: 'inv-1', projectId: 'proj-kensington', number: 'DD-2026-001',
      type: 'client', status: 'paid',
      items: ['item-1', 'item-3', 'item-4'],
      date: '2026-01-20', dueDate: '2026-02-19', paidDate: '2026-02-15',
      vatRate: 20,
      notes: 'Initial furniture and lighting — Drawing Room sofa, pendant cluster, study paint.'
      // item-1 trade 3200 @ 35% = 4320, item-3 trade 1450 @ 30% = 1885, item-4 trade 115 @ 25% = 143.75
      // Subtotal: 6348.75, VAT (20%): 1269.75, Total: 7618.50
    },
    {
      id: 'inv-2', projectId: 'proj-kensington', number: 'DD-2026-002',
      type: 'client', status: 'paid',
      items: ['item-9', 'item-17', 'item-18'],
      date: '2026-02-01', dueDate: '2026-03-03', paidDate: '2026-02-28',
      vatRate: 20,
      notes: 'Bedroom linen, smart thermostat, and door hardware package.'
      // item-9 trade 420 @ 45% = 609, item-17 trade 180 @ 15% = 207, item-18 trade 1200 @ 30% = 1560
      // Subtotal: 2376, VAT (20%): 475.20, Total: 2851.20
    },
    {
      id: 'inv-3', projectId: 'proj-kensington', number: 'DD-2026-003',
      type: 'client', status: 'sent',
      items: ['item-5', 'item-6', 'item-12'],
      date: '2026-02-15', dueDate: '2026-03-17', paidDate: null,
      vatRate: 20,
      notes: 'Marble coffee table, hallway encaustic tiles, antique mirror.'
      // item-5 trade 2100 @ 35% = 2835, item-6 trade 1680 @ 30% = 2184, item-12 trade 950 @ 40% = 1330
      // Subtotal: 6349, VAT (20%): 1269.80, Total: 7618.80
    },
    {
      id: 'inv-4', projectId: 'proj-kensington', number: 'DD-2026-004',
      type: 'client', status: 'overdue',
      items: ['item-2', 'item-14'],
      date: '2026-01-30', dueDate: '2026-02-14', paidDate: null,
      vatRate: 20,
      notes: 'Silk curtain fabric and walnut dining table. Chased twice — Mr Harrington says "in hand".'
      // item-2 trade 890 @ 40% = 1246, item-14 trade 4200 @ 25% = 5250
      // Subtotal: 6496, VAT (20%): 1299.20, Total: 7795.20
    },
    {
      id: 'inv-5', projectId: 'proj-kensington', number: 'DD-2026-005',
      type: 'client', status: 'draft',
      items: ['item-10', 'item-13', 'item-19'],
      date: '2026-02-20', dueDate: null, paidDate: null,
      vatRate: 20,
      notes: 'Study shelving, drawing room rug, and bedroom blinds. Awaiting rug strike-off approval before sending.'
      // item-10 trade 3800 @ 25% = 4750, item-13 trade 5600 @ 30% = 7280, item-19 trade 960 @ 35% = 1296
      // Subtotal: 13326, VAT (20%): 2665.20, Total: 15991.20
    },
    {
      id: 'inv-6', projectId: 'proj-kensington', number: 'DD-2026-006',
      type: 'client', status: 'sent',
      items: ['item-7'],
      date: '2026-02-25', dueDate: '2026-03-27', paidDate: null,
      vatRate: 20,
      notes: 'Kitchen cabinetry deposit — 50% of total. Balance due on installation completion.'
      // item-7 trade 18500 @ 20% = 22200 (50% deposit = 11100)
      // Subtotal: 11100, VAT (20%): 2220, Total: 13320
    },
    {
      id: 'inv-7', projectId: 'proj-cotswolds', number: 'DD-2025-014',
      type: 'client', status: 'paid',
      items: ['item-w1', 'item-w2', 'item-w3'],
      date: '2025-09-15', dueDate: '2025-10-15', paidDate: '2025-10-10',
      vatRate: 20,
      notes: 'Cotswolds phase 1 — curtains, kitchen, dining table.'
      // item-w1 trade 680 @ 40% = 952, item-w2 trade 14200 @ 18% = 16756, item-w3 trade 2800 @ 25% = 3500
      // Subtotal: 21208, VAT (20%): 4241.60, Total: 25449.60
    },
    {
      id: 'inv-8', projectId: 'proj-cotswolds', number: 'DD-2025-019',
      type: 'client', status: 'paid',
      items: ['item-w4', 'item-w5'],
      date: '2025-11-20', dueDate: '2025-12-20', paidDate: '2025-12-18',
      vatRate: 20,
      notes: 'Cotswolds phase 2 — bathroom and kitchen flooring. Final invoice for project.'
      // item-w4 trade 3200 @ 20% = 3840, item-w5 trade 1800 @ 22% = 2196
      // Subtotal: 6036, VAT (20%): 1207.20, Total: 7243.20
    }
  ],

  // ── Mood Boards ───────────────────────────────────────────────────────

  moodboards: [
    {
      id: 'mb-1', projectId: 'proj-kensington', name: 'Drawing Room', room: 'Drawing Room',
      items: [
        { id: 'mbi-1', type: 'color', value: '#2d4a3e', label: 'Forest Green — walls', x: 20, y: 20, w: 80, h: 80 },
        { id: 'mbi-2', type: 'color', value: '#c9a96e', label: 'Antique Brass — accents', x: 110, y: 20, w: 80, h: 80 },
        { id: 'mbi-3', type: 'color', value: '#f5f0eb', label: 'Warm Ivory — ceiling & trim', x: 200, y: 20, w: 80, h: 80 },
        { id: 'mbi-4', type: 'image', value: 'placeholder-velvet-sofa.jpg', label: 'Emerald velvet reference', x: 20, y: 110, w: 170, h: 110 },
        { id: 'mbi-5', type: 'text', value: 'Rich layered textures: velvet, silk, polished brass, foxed mirror glass', x: 200, y: 110, w: 160, h: 50 },
        { id: 'mbi-6', type: 'text', value: 'Lighting: 3x Tom Dixon Melt in cluster, table lamps for ambience', x: 200, y: 170, w: 160, h: 50 }
      ]
    },
    {
      id: 'mb-2', projectId: 'proj-kensington', name: 'Master Bedroom', room: 'Master Bedroom',
      items: [
        { id: 'mbi-7', type: 'color', value: '#e8d5c4', label: 'Blush — linen bedding', x: 20, y: 20, w: 80, h: 80 },
        { id: 'mbi-8', type: 'color', value: '#8b7d6b', label: 'Warm Taupe — roman blinds', x: 110, y: 20, w: 80, h: 80 },
        { id: 'mbi-9', type: 'color', value: '#f8f6f3', label: 'White Linen — walls', x: 200, y: 20, w: 80, h: 80 },
        { id: 'mbi-10', type: 'text', value: 'Serene, soft palette — natural linen, organic textures, muted tones', x: 20, y: 120, w: 260, h: 40 },
        { id: 'mbi-11', type: 'text', value: 'Sebastian Cox ash bedside tables, Vaughan brass wall lights', x: 20, y: 170, w: 260, h: 40 }
      ]
    },
    {
      id: 'mb-3', projectId: 'proj-kensington', name: 'Kitchen', room: 'Kitchen',
      items: [
        { id: 'mbi-12', type: 'color', value: '#e8e0d4', label: 'Bone — cabinetry', x: 20, y: 20, w: 80, h: 80 },
        { id: 'mbi-13', type: 'color', value: '#c4c0b8', label: 'Carrara Marble — worktops', x: 110, y: 20, w: 80, h: 80 },
        { id: 'mbi-14', type: 'color', value: '#5a4e3c', label: 'Dark Oak — flooring accent', x: 200, y: 20, w: 80, h: 80 },
        { id: 'mbi-15', type: 'text', value: 'Plain English Shaker, Carrara marble, zellige backsplash, brass tap fittings', x: 20, y: 120, w: 260, h: 40 },
        { id: 'mbi-16', type: 'text', value: 'Tom Dixon Beat Wide x3 over island, warm brass throughout', x: 20, y: 170, w: 260, h: 40 }
      ]
    },
    {
      id: 'mb-4', projectId: 'proj-kensington', name: 'Bathroom', room: 'Bathroom',
      items: [
        { id: 'mbi-17', type: 'color', value: '#d9d3cc', label: 'Warm Stone — walls', x: 20, y: 20, w: 80, h: 80 },
        { id: 'mbi-18', type: 'color', value: '#f2efeb', label: 'Carrara White — floor tiles', x: 110, y: 20, w: 80, h: 80 },
        { id: 'mbi-19', type: 'text', value: 'Burlington freestanding bath, Arcade basin, chrome crosshead taps', x: 20, y: 120, w: 260, h: 40 },
        { id: 'mbi-20', type: 'text', value: 'Marble hexagonal mosaic floor, traditional meets refined modern', x: 20, y: 170, w: 260, h: 40 }
      ]
    }
  ],

  // ── Floor Plans ───────────────────────────────────────────────────────

  floorplans: [
    {
      id: 'fp-1', projectId: 'proj-kensington', name: 'Ground Floor',
      rooms: [
        { id: 'room-1', label: 'Drawing Room', x: 20, y: 20, w: 200, h: 160, dims: '6.2m x 4.8m' },
        { id: 'room-2', label: 'Kitchen', x: 230, y: 20, w: 180, h: 120, dims: '5.4m x 3.6m' },
        { id: 'room-3', label: 'Dining Room', x: 230, y: 150, w: 180, h: 120, dims: '5.4m x 3.6m' },
        { id: 'room-4', label: 'Hallway', x: 20, y: 190, w: 200, h: 80, dims: '6.2m x 2.4m' }
      ],
      furniture: [
        { id: 'furn-1', type: 'sofa', label: 'Velvet Sofa', x: 40, y: 80, w: 70, h: 28, rotation: 0 },
        { id: 'furn-2', type: 'table', label: 'Coffee Table', x: 55, y: 50, w: 40, h: 22, rotation: 0 },
        { id: 'furn-3', type: 'table', label: 'Dining Table', x: 275, y: 180, w: 80, h: 40, rotation: 0 },
        { id: 'furn-4', type: 'chair', label: 'Dining Chair', x: 280, y: 170, w: 12, h: 12, rotation: 0 },
        { id: 'furn-5', type: 'chair', label: 'Dining Chair', x: 350, y: 170, w: 12, h: 12, rotation: 0 },
        { id: 'furn-6', type: 'kitchen-island', label: 'Kitchen Island', x: 280, y: 55, w: 75, h: 35, rotation: 0 }
      ],
      walls: [
        { id: 'wall-1', x1: 20, y1: 190, x2: 220, y2: 190, thickness: 3 },
        { id: 'wall-2', x1: 220, y1: 20, x2: 220, y2: 270, thickness: 3 }
      ],
      scale: 1
    },
    {
      id: 'fp-2', projectId: 'proj-kensington', name: 'First Floor',
      rooms: [
        { id: 'room-5', label: 'Master Bedroom', x: 20, y: 20, w: 200, h: 140, dims: '6.2m x 4.2m' },
        { id: 'room-6', label: 'Guest Bedroom', x: 230, y: 20, w: 180, h: 110, dims: '5.4m x 3.3m' },
        { id: 'room-7', label: 'Study', x: 230, y: 140, w: 180, h: 130, dims: '5.4m x 3.9m' },
        { id: 'room-8', label: 'Bathroom', x: 20, y: 170, w: 120, h: 100, dims: '3.6m x 3.0m' }
      ],
      furniture: [
        { id: 'furn-7', type: 'bed', label: 'Superking Bed', x: 60, y: 50, w: 60, h: 70, rotation: 0 },
        { id: 'furn-8', type: 'table', label: 'Bedside L', x: 40, y: 60, w: 16, h: 16, rotation: 0 },
        { id: 'furn-9', type: 'table', label: 'Bedside R', x: 125, y: 60, w: 16, h: 16, rotation: 0 },
        { id: 'furn-10', type: 'desk', label: 'Shelving Unit', x: 250, y: 155, w: 65, h: 15, rotation: 0 },
        { id: 'furn-11', type: 'bath', label: 'Freestanding Bath', x: 50, y: 200, w: 55, h: 25, rotation: 0 }
      ],
      walls: [
        { id: 'wall-3', x1: 220, y1: 20, x2: 220, y2: 270, thickness: 3 },
        { id: 'wall-4', x1: 20, y1: 170, x2: 140, y2: 170, thickness: 3 },
        { id: 'wall-5', x1: 140, y1: 170, x2: 140, y2: 270, thickness: 3 }
      ],
      scale: 1
    }
  ],

  // ── Activities ────────────────────────────────────────────────────────

  activities: [
    { id: 'act-1', action: 'Item delivered', detail: 'Velvet Sofa — Emerald arrived at 42 Pembroke Gardens, white glove delivery', icon: 'check', timestamp: '2026-02-27T09:15:00Z', projectId: 'proj-kensington' },
    { id: 'act-2', action: 'Invoice paid', detail: 'DD-2026-002 paid by Harringtons — bedroom linen & hardware (£2,851.20 inc. VAT)', icon: 'pound', timestamp: '2026-02-28T14:30:00Z', projectId: 'proj-kensington' },
    { id: 'act-3', action: 'Progress update', detail: '1st Fix Electrics now 85% — rewire complete, smart home wiring in progress', icon: 'edit', timestamp: '2026-02-27T11:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-4', action: 'Order placed', detail: 'Encaustic Tiles ordered from Bert & May — 15sqm Estrella in Fog', icon: 'check', timestamp: '2026-02-26T16:45:00Z', projectId: 'proj-kensington' },
    { id: 'act-5', action: 'Item shipped', detail: 'Marble Coffee Table dispatched from Benchmark — ETA 3 working days', icon: 'arrowRight', timestamp: '2026-02-26T10:20:00Z', projectId: 'proj-kensington' },
    { id: 'act-6', action: 'Quote received', detail: 'Luke Irwin rug quote: £5,600 trade, 10-14 week lead time from strike-off approval', icon: 'invoice', timestamp: '2026-02-25T15:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-7', action: 'Item delivered', detail: 'Door Handles — Joseph Giles aged brass set of 8 received, inspected and stored on site', icon: 'check', timestamp: '2026-02-24T10:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-8', action: 'Progress update', detail: '1st Fix Plumbing now 70% — hot/cold feeds complete, soil pipe rerouting underway', icon: 'edit', timestamp: '2026-02-24T16:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-9', action: 'Order placed', detail: 'Dining Table ordered from Benchmark — English walnut, seats 8, 10-14 week lead', icon: 'check', timestamp: '2026-02-23T11:30:00Z', projectId: 'proj-kensington' },
    { id: 'act-10', action: 'Item shipped', detail: 'Antique Mirror dispatched from Designers Guild — foxed glass, 180x90cm', icon: 'arrowRight', timestamp: '2026-02-22T14:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-11', action: 'Task completed', detail: 'Structural Works completed — RSJ installed, underpinning done, building control passed', icon: 'check', timestamp: '2026-02-20T17:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-12', action: 'Client approval', detail: 'Harringtons approved Drawing Room mood board — "Love the brass accents"', icon: 'check', timestamp: '2026-02-20T12:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-13', action: 'Progress update', detail: 'Underfloor Heating 60% — hallway and kitchen loops laid, dining room in progress', icon: 'edit', timestamp: '2026-02-19T16:30:00Z', projectId: 'proj-kensington' },
    { id: 'act-14', action: 'Invoice created', detail: 'DD-2026-003 raised — marble table, encaustic tiles, antique mirror (£7,618.80)', icon: 'invoice', timestamp: '2026-02-15T10:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-15', action: 'Invoice overdue', detail: 'DD-2026-004 overdue — fabric & dining table, chased Mr Harrington', icon: 'warning', timestamp: '2026-02-15T09:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-16', action: 'Supplier meeting', detail: 'Site visit with Plain English — kitchen layout confirmed, measurements taken', icon: 'users', timestamp: '2026-02-12T10:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-17', action: 'Item delivered', detail: 'Pendant Light — Tom Dixon Melt Cluster delivered and stored in Drawing Room', icon: 'check', timestamp: '2026-02-10T11:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-18', action: 'Invoice paid', detail: 'DD-2026-001 paid early — Harringtons very prompt, good client relationship', icon: 'pound', timestamp: '2026-02-15T09:30:00Z', projectId: 'proj-kensington' },
    { id: 'act-19', action: 'Task completed', detail: 'Demolition & Strip-out completed on schedule — site cleared and ready', icon: 'check', timestamp: '2026-02-02T17:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-20', action: 'Item installed', detail: 'Hague Blue paint applied to Study — 2 coats, beautiful depth of colour', icon: 'check', timestamp: '2026-02-06T16:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-21', action: 'Item installed', detail: 'Smart Thermostat installed — Hive multi-zone, first floor control', icon: 'check', timestamp: '2026-02-05T14:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-22', action: 'Project started', detail: 'Demolition began at 42 Pembroke Gardens — skip delivered, hoarding up', icon: 'flag', timestamp: '2026-01-20T08:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-23', action: 'New project created', detail: 'Chelsea Apartment added — Sophie Laurent, 18 Sloane Court', icon: 'plus', timestamp: '2026-02-22T10:00:00Z', projectId: 'proj-chelsea' },
    { id: 'act-24', action: 'Quote requested', detail: 'Modular Sofa spec sent to Sofa Workshop for pricing', icon: 'send', timestamp: '2026-02-23T14:00:00Z', projectId: 'proj-chelsea' },
    { id: 'act-25', action: 'Quote received', detail: 'Kitchen units quote from Plain English — £12,000 trade for matt black handleless', icon: 'invoice', timestamp: '2026-02-25T11:00:00Z', projectId: 'proj-chelsea' },
    { id: 'act-26', action: 'Project completed', detail: 'Cotswolds Cottage — final snagging complete, keys handed over to Whitfields', icon: 'check', timestamp: '2025-12-20T15:00:00Z', projectId: 'proj-cotswolds' },
    { id: 'act-27', action: 'Invoice paid', detail: 'DD-2025-019 paid — Cotswolds final invoice, project fully settled', icon: 'pound', timestamp: '2025-12-18T10:00:00Z', projectId: 'proj-cotswolds' }
  ],

  // ── Notifications ─────────────────────────────────────────────────────

  notifications: [
    { id: 'notif-1', title: 'Invoice Overdue', body: 'DD-2026-004 is 13 days past due — £7,795.20 outstanding from Harringtons', type: 'warning', read: false, timestamp: '2026-02-27T09:00:00Z' },
    { id: 'notif-2', title: 'Delivery Today', body: 'Antique Mirror (foxed glass, 180x90cm) arriving at Kensington site — 2-person carry required', type: 'info', read: false, timestamp: '2026-02-27T08:00:00Z' },
    { id: 'notif-3', title: 'Plumbing on Track', body: '1st Fix Plumbing reached 70% — soil pipe rerouting progressing well', type: 'success', read: true, timestamp: '2026-02-27T11:00:00Z' },
    { id: 'notif-4', title: 'New Quote Received', body: 'Luke Irwin hand-knotted rug — £5,600 trade, 10-14 week lead time', type: 'info', read: true, timestamp: '2026-02-25T15:00:00Z' },
    { id: 'notif-5', title: 'Kitchen Deposit Due', body: 'DD-2026-006 sent — Plain English kitchen cabinetry 50% deposit (£13,320 inc. VAT)', type: 'warning', read: false, timestamp: '2026-02-25T16:00:00Z' },
    { id: 'notif-6', title: 'Chelsea Brief Received', body: 'Sophie Laurent confirmed design brief — modern minimalist, Parisian-meets-London', type: 'info', read: true, timestamp: '2026-02-22T12:00:00Z' }
  ],

  // ── Settings ──────────────────────────────────────────────────────────

  settings: {
    companyName: 'DesignDesk Studio',
    companyEmail: 'hello@designdeskstudio.co.uk',
    companyPhone: '020 7946 0328',
    companyAddress: '14 Pavilion Road, London SW1X 0HJ',
    companyVatNumber: 'GB 284 7193 02',
    vatRate: 20,
    currency: 'GBP',
    currencySymbol: '£',
    defaultMarkup: 30,
    invoicePrefix: 'DD',
    invoiceTerms: 'Payment due within 30 days of invoice date. Late payments subject to 2% monthly interest.',
    defaultLeadTime: '6-8 weeks',
    financialYearStart: '04-06',
    backupEnabled: true,
    notificationsEnabled: true,
    theme: 'light'
  }
};
