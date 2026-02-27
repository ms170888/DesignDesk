// Realistic UK interior design seed data

export const seedData = {
  activeProjectId: 'proj-kensington',

  projects: [
    {
      id: 'proj-kensington',
      name: 'Kensington Townhouse',
      client: 'Mr & Mrs Harrington',
      status: 'active',
      budget: 185000,
      address: '42 Pembroke Gardens, London W8',
      startDate: '2026-01-15',
      endDate: '2026-06-30',
      rooms: ['Drawing Room', 'Master Bedroom', 'Kitchen', 'Dining Room', 'Study', 'Hallway', 'Guest Bedroom', 'Bathroom']
    },
    {
      id: 'proj-chelsea',
      name: 'Chelsea Apartment',
      client: 'Sophie Laurent',
      status: 'planning',
      budget: 95000,
      address: '18 Sloane Court, London SW3',
      startDate: '2026-03-01',
      endDate: '2026-08-15',
      rooms: ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Study']
    },
    {
      id: 'proj-cotswolds',
      name: 'Cotswolds Cottage',
      client: 'James & Emma Whitfield',
      status: 'completed',
      budget: 62000,
      address: 'Rose Cottage, Burford, Oxfordshire',
      startDate: '2025-06-01',
      endDate: '2025-12-20',
      rooms: ['Living Room', 'Kitchen', 'Master Bedroom', 'Bedroom 2', 'Bathroom']
    }
  ],

  items: [
    { id: 'item-1', projectId: 'proj-kensington', name: 'Velvet Sofa — Emerald', supplier: 'Sofa Workshop', room: 'Drawing Room', trade: 3200, markup: 35, status: 'delivered', category: 'Furniture', notes: 'Custom size 240cm, brass legs' },
    { id: 'item-2', projectId: 'proj-kensington', name: 'Silk Curtain Fabric — Ivory', supplier: "Designers Guild", room: 'Drawing Room', trade: 890, markup: 40, status: 'ordered', category: 'Fabric', notes: '12m required, pattern repeat 64cm' },
    { id: 'item-3', projectId: 'proj-kensington', name: 'Pendant Light — Brass Cluster', supplier: 'Tom Dixon', room: 'Drawing Room', trade: 1450, markup: 30, status: 'delivered', category: 'Lighting', notes: 'Melt Pendant x3, Gold finish' },
    { id: 'item-4', projectId: 'proj-kensington', name: 'Hague Blue — 5L Estate Emulsion', supplier: 'Farrow & Ball', room: 'Study', trade: 115, markup: 25, status: 'installed', category: 'Paint', notes: 'Walls and ceiling, 2 coats' },
    { id: 'item-5', projectId: 'proj-kensington', name: 'Marble Coffee Table — Calacatta', supplier: 'Wewood', room: 'Drawing Room', trade: 2100, markup: 35, status: 'shipped', category: 'Furniture', notes: 'Custom cut to 120x60cm' },
    { id: 'item-6', projectId: 'proj-kensington', name: 'Handmade Encaustic Tiles', supplier: 'Bert & May', room: 'Hallway', trade: 1680, markup: 30, status: 'ordered', category: 'Tiles', notes: '15sqm, Estrella pattern in Fog' },
    { id: 'item-7', projectId: 'proj-kensington', name: 'Bespoke Kitchen Cabinetry', supplier: 'Plain English', room: 'Kitchen', trade: 18500, markup: 20, status: 'spec', category: 'Furniture', notes: 'Shaker style, hand-painted in Bone' },
    { id: 'item-8', projectId: 'proj-kensington', name: 'Wall Sconces — Antiqued Brass', supplier: 'Vaughan Designs', room: 'Hallway', trade: 680, markup: 35, status: 'quoted', category: 'Lighting', notes: 'Pair of Zurich sconces' },
    { id: 'item-9', projectId: 'proj-kensington', name: 'Linen Bedding Set — Blush', supplier: 'The Linen Works', room: 'Master Bedroom', trade: 420, markup: 45, status: 'delivered', category: 'Fabric', notes: 'Superking, includes 4 pillowcases' },
    { id: 'item-10', projectId: 'proj-kensington', name: 'Bespoke Shelving Unit — Oak', supplier: 'Sebastian Cox', room: 'Study', trade: 3800, markup: 25, status: 'ordered', category: 'Furniture', notes: 'Floor to ceiling, integrated lighting' },
    { id: 'item-11', projectId: 'proj-kensington', name: 'Zellige Tiles — Terracotta', supplier: 'Emery et Cie', room: 'Kitchen', trade: 2200, markup: 30, status: 'spec', category: 'Tiles', notes: '10sqm backsplash' },
    { id: 'item-12', projectId: 'proj-kensington', name: 'Antique Mirror — Foxed Glass', supplier: 'Saligo Design', room: 'Hallway', trade: 950, markup: 40, status: 'shipped', category: 'Furniture', notes: 'Floor-length 180x90cm' },
    { id: 'item-13', projectId: 'proj-kensington', name: 'Hand-knotted Rug — Persian', supplier: 'Luke Irwin', room: 'Drawing Room', trade: 5600, markup: 30, status: 'quoted', category: 'Fabric', notes: '300x400cm, custom colourway' },
    { id: 'item-14', projectId: 'proj-kensington', name: 'Dining Table — Walnut', supplier: 'Benchmark', room: 'Dining Room', trade: 4200, markup: 25, status: 'ordered', category: 'Furniture', notes: 'Seats 8, live edge' },
    { id: 'item-15', projectId: 'proj-kensington', name: 'Dining Chairs x6 — Leather', supplier: 'Pinch Design', room: 'Dining Room', trade: 3600, markup: 30, status: 'spec', category: 'Furniture', notes: 'Pendleton chair, tan leather' },
    { id: 'item-16', projectId: 'proj-kensington', name: 'Bathroom Suite — Burlington', supplier: 'C.P. Hart', room: 'Bathroom', trade: 4800, markup: 20, status: 'ordered', category: 'Furniture', notes: 'Freestanding bath, basin, WC' },
    { id: 'item-17', projectId: 'proj-kensington', name: 'Smart Thermostat — Hive', supplier: 'British Gas', room: 'Hallway', trade: 180, markup: 15, status: 'installed', category: 'Hardware', notes: 'With professional installation' },
    { id: 'item-18', projectId: 'proj-kensington', name: 'Door Handles — Aged Brass', supplier: 'Joseph Giles', room: 'Hallway', trade: 1200, markup: 30, status: 'delivered', category: 'Hardware', notes: 'Set of 8, custom rose plates' },
    { id: 'item-19', projectId: 'proj-kensington', name: 'Window Blinds — Roman', supplier: 'Silent Gliss', room: 'Master Bedroom', trade: 960, markup: 35, status: 'quoted', category: 'Fabric', notes: '3 windows, blackout lining' },
    { id: 'item-20', projectId: 'proj-kensington', name: 'Worktop — Carrara Marble', supplier: 'Stone Age', room: 'Kitchen', trade: 3400, markup: 20, status: 'spec', category: 'Tiles', notes: '30mm thickness, honed finish' },

    // Chelsea items
    { id: 'item-c1', projectId: 'proj-chelsea', name: 'Modular Sofa — Grey Boucle', supplier: 'Sofa Workshop', room: 'Living Room', trade: 2800, markup: 35, status: 'spec', category: 'Furniture', notes: 'L-shape configuration' },
    { id: 'item-c2', projectId: 'proj-chelsea', name: 'Kitchen Units — Matt Black', supplier: 'Hacker Kitchens', room: 'Kitchen', trade: 12000, markup: 20, status: 'quoted', category: 'Furniture', notes: 'German engineered' },
  ],

  suppliers: [
    { id: 'sup-1', name: 'Designers Guild', category: 'Fabric', rating: 5, tradeAccount: true, leadTime: '3-4 weeks', discount: 30, phone: '020 7893 7400', email: 'trade@designersguild.com', website: 'designersguild.com', address: 'Kings Road, London SW3', notes: 'Excellent fabric range, reliable delivery' },
    { id: 'sup-2', name: 'Farrow & Ball', category: 'Paint', rating: 5, tradeAccount: true, leadTime: '3-5 days', discount: 25, phone: '01202 876141', email: 'trade@farrow-ball.com', website: 'farrow-ball.com', address: 'Wimborne, Dorset', notes: 'Best heritage colours, fast dispatch' },
    { id: 'sup-3', name: 'Tom Dixon', category: 'Lighting', rating: 4, tradeAccount: true, leadTime: '4-6 weeks', discount: 20, phone: '020 7183 9733', email: 'sales@tomdixon.net', website: 'tomdixon.net', address: 'Portobello Dock, London W10', notes: 'Statement pieces, worth the lead time' },
    { id: 'sup-4', name: 'Sofa Workshop', category: 'Furniture', rating: 4, tradeAccount: true, leadTime: '8-10 weeks', discount: 15, phone: '020 7534 0tried', email: 'trade@sofaworkshop.com', website: 'sofaworkshop.com', address: 'Various showrooms', notes: 'Custom sizing available, good quality' },
    { id: 'sup-5', name: 'Bert & May', category: 'Tiles', rating: 5, tradeAccount: true, leadTime: '6-8 weeks', discount: 15, phone: '020 3744 0776', email: 'hello@bertandmay.com', website: 'bertandmay.com', address: 'Vyner Street, London E2', notes: 'Beautiful handmade encaustic tiles' },
    { id: 'sup-6', name: 'Plain English', category: 'Furniture', rating: 5, tradeAccount: false, leadTime: '12-16 weeks', discount: 0, phone: '01011 890505', email: 'info@plainenglishdesign.co.uk', website: 'plainenglishdesign.co.uk', address: 'Stowmarket, Suffolk', notes: 'Bespoke only, exceptional quality' },
    { id: 'sup-7', name: 'Vaughan Designs', category: 'Lighting', rating: 5, tradeAccount: true, leadTime: '6-8 weeks', discount: 25, phone: '020 7349 4600', email: 'sales@vaughandesigns.com', website: 'vaughandesigns.com', address: 'Chelsea Harbour, London SW10', notes: 'Trade only, heritage lighting' },
    { id: 'sup-8', name: 'Luke Irwin', category: 'Fabric', rating: 5, tradeAccount: true, leadTime: '10-14 weeks', discount: 20, phone: '020 7730 6070', email: 'studio@lukeirwin.com', website: 'lukeirwin.com', address: 'Pimlico Road, London SW1', notes: 'Bespoke hand-knotted rugs' },
    { id: 'sup-9', name: 'C.P. Hart', category: 'Furniture', rating: 4, tradeAccount: true, leadTime: '2-4 weeks', discount: 20, phone: '020 7902 1000', email: 'trade@cphart.co.uk', website: 'cphart.co.uk', address: 'Newnham Terrace, London SE1', notes: 'Luxury bathrooms, huge showroom' },
    { id: 'sup-10', name: 'Joseph Giles', category: 'Hardware', rating: 5, tradeAccount: true, leadTime: '4-6 weeks', discount: 15, phone: '020 7384 2424', email: 'info@josephgiles.com', website: 'josephgiles.com', address: 'Chelsea, London SW3', notes: 'Bespoke door hardware, aged brass specialist' },
    { id: 'sup-11', name: 'Sebastian Cox', category: 'Furniture', rating: 4, tradeAccount: true, leadTime: '8-12 weeks', discount: 10, phone: '020 8963 9934', email: 'studio@sebastiancox.co.uk', website: 'sebastiancox.co.uk', address: 'Bermondsey, London SE16', notes: 'Sustainable British craftsman' },
    { id: 'sup-12', name: 'Benchmark', category: 'Furniture', rating: 5, tradeAccount: true, leadTime: '10-14 weeks', discount: 15, phone: '01488 608020', email: 'enquiries@benchmarkfurniture.com', website: 'benchmarkfurniture.com', address: 'Kintbury, Berkshire', notes: 'Terence Conran partnership, exceptional tables' },
  ],

  tasks: [
    { id: 'task-1', projectId: 'proj-kensington', name: 'Demolition & Strip-out', contractor: 'BuildRight Ltd', start: '2026-01-20', end: '2026-02-03', progress: 100, phase: 'structural', depends: [] },
    { id: 'task-2', projectId: 'proj-kensington', name: 'Structural Works', contractor: 'BuildRight Ltd', start: '2026-02-03', end: '2026-02-21', progress: 100, phase: 'structural', depends: ['task-1'] },
    { id: 'task-3', projectId: 'proj-kensington', name: '1st Fix Electrics', contractor: 'Spark & Wire', start: '2026-02-24', end: '2026-03-07', progress: 85, phase: 'firstfix', depends: ['task-2'] },
    { id: 'task-4', projectId: 'proj-kensington', name: '1st Fix Plumbing', contractor: 'Thames Plumbing', start: '2026-02-24', end: '2026-03-10', progress: 70, phase: 'firstfix', depends: ['task-2'] },
    { id: 'task-5', projectId: 'proj-kensington', name: 'Plastering', contractor: 'Artisan Plastering', start: '2026-03-10', end: '2026-03-24', progress: 30, phase: 'finishing', depends: ['task-3', 'task-4'] },
    { id: 'task-6', projectId: 'proj-kensington', name: 'Kitchen Installation', contractor: 'Plain English', start: '2026-03-24', end: '2026-04-11', progress: 0, phase: 'install', depends: ['task-5'] },
    { id: 'task-7', projectId: 'proj-kensington', name: 'Painting & Decorating', contractor: 'Colour & Form', start: '2026-03-28', end: '2026-04-18', progress: 0, phase: 'finishing', depends: ['task-5'] },
    { id: 'task-8', projectId: 'proj-kensington', name: 'Tiling', contractor: 'Bert & May Fitting', start: '2026-04-06', end: '2026-04-18', progress: 0, phase: 'finishing', depends: ['task-5'] },
    { id: 'task-9', projectId: 'proj-kensington', name: 'Furniture Delivery & Placement', contractor: 'DesignDesk Team', start: '2026-04-21', end: '2026-05-02', progress: 0, phase: 'install', depends: ['task-7', 'task-8'] },
    { id: 'task-10', projectId: 'proj-kensington', name: 'Snagging & Final Touches', contractor: 'DesignDesk Team', start: '2026-05-05', end: '2026-05-16', progress: 0, phase: 'install', depends: ['task-9'] },
  ],

  invoices: [
    { id: 'inv-1', projectId: 'proj-kensington', number: 'DD-2026-001', type: 'client', status: 'paid', items: ['item-1', 'item-3', 'item-4'], date: '2026-01-20', dueDate: '2026-02-19', paidDate: '2026-02-15', vatRate: 20, notes: 'Initial furniture and lighting deposit' },
    { id: 'inv-2', projectId: 'proj-kensington', number: 'DD-2026-002', type: 'client', status: 'paid', items: ['item-9', 'item-17', 'item-18'], date: '2026-02-01', dueDate: '2026-03-03', paidDate: '2026-02-28', vatRate: 20, notes: 'Bedroom and hardware package' },
    { id: 'inv-3', projectId: 'proj-kensington', number: 'DD-2026-003', type: 'client', status: 'sent', items: ['item-5', 'item-6', 'item-12'], date: '2026-02-15', dueDate: '2026-03-17', paidDate: null, vatRate: 20, notes: 'Hallway and drawing room items' },
    { id: 'inv-4', projectId: 'proj-kensington', number: 'DD-2026-004', type: 'client', status: 'overdue', items: ['item-2', 'item-14'], date: '2026-01-30', dueDate: '2026-02-14', paidDate: null, vatRate: 20, notes: 'Fabric and dining table' },
    { id: 'inv-5', projectId: 'proj-kensington', number: 'DD-2026-005', type: 'client', status: 'draft', items: ['item-10', 'item-13', 'item-19'], date: '2026-02-20', dueDate: null, paidDate: null, vatRate: 20, notes: 'Study shelving and drawing room rug' },
  ],

  moodboards: [
    {
      id: 'mb-1', projectId: 'proj-kensington', name: 'Drawing Room', room: 'Drawing Room',
      items: [
        { id: 'mbi-1', type: 'color', value: '#2d4a3e', label: 'Forest Green', x: 20, y: 20, w: 80, h: 80 },
        { id: 'mbi-2', type: 'color', value: '#c9a96e', label: 'Antique Brass', x: 110, y: 20, w: 80, h: 80 },
        { id: 'mbi-3', type: 'color', value: '#f5f0eb', label: 'Warm Ivory', x: 200, y: 20, w: 80, h: 80 },
        { id: 'mbi-4', type: 'text', value: 'Rich textures, emerald & brass accents, layered lighting', x: 20, y: 120, w: 260, h: 40 },
      ]
    },
    {
      id: 'mb-2', projectId: 'proj-kensington', name: 'Master Bedroom', room: 'Master Bedroom',
      items: [
        { id: 'mbi-5', type: 'color', value: '#e8d5c4', label: 'Blush', x: 20, y: 20, w: 80, h: 80 },
        { id: 'mbi-6', type: 'color', value: '#8b7d6b', label: 'Warm Taupe', x: 110, y: 20, w: 80, h: 80 },
        { id: 'mbi-7', type: 'color', value: '#ffffff', label: 'White Linen', x: 200, y: 20, w: 80, h: 80 },
        { id: 'mbi-8', type: 'text', value: 'Serene, soft palette — natural linen, organic textures', x: 20, y: 120, w: 260, h: 40 },
      ]
    },
    {
      id: 'mb-3', projectId: 'proj-kensington', name: 'Kitchen', room: 'Kitchen',
      items: [
        { id: 'mbi-9', type: 'color', value: '#e8e0d4', label: 'Bone', x: 20, y: 20, w: 80, h: 80 },
        { id: 'mbi-10', type: 'color', value: '#c4b5a0', label: 'Putty', x: 110, y: 20, w: 80, h: 80 },
        { id: 'mbi-11', type: 'color', value: '#5a4e3c', label: 'Dark Oak', x: 200, y: 20, w: 80, h: 80 },
        { id: 'mbi-12', type: 'text', value: 'Plain English shaker, Carrara marble, brass tap fittings', x: 20, y: 120, w: 260, h: 40 },
      ]
    }
  ],

  floorplans: [
    {
      id: 'fp-1', projectId: 'proj-kensington', name: 'Ground Floor',
      rooms: [
        { id: 'room-1', label: 'Drawing Room', x: 20, y: 20, w: 200, h: 160 },
        { id: 'room-2', label: 'Kitchen', x: 230, y: 20, w: 180, h: 120 },
        { id: 'room-3', label: 'Dining Room', x: 230, y: 150, w: 180, h: 120 },
        { id: 'room-4', label: 'Hallway', x: 20, y: 190, w: 200, h: 80 },
      ],
      furniture: [
        { id: 'furn-1', type: 'sofa', label: 'Velvet Sofa', x: 40, y: 80, w: 70, h: 30 },
        { id: 'furn-2', type: 'table', label: 'Coffee Table', x: 60, y: 50, w: 40, h: 25 },
        { id: 'furn-3', type: 'table', label: 'Dining Table', x: 280, y: 190, w: 80, h: 40 },
        { id: 'furn-4', type: 'chair', label: 'Chair', x: 270, y: 175, w: 15, h: 15 },
        { id: 'furn-5', type: 'chair', label: 'Chair', x: 370, y: 175, w: 15, h: 15 },
      ],
      walls: [],
      scale: 1
    }
  ],

  activities: [
    { id: 'act-1', action: 'Item delivered', detail: 'Velvet Sofa — Emerald arrived at site', icon: 'check', timestamp: '2026-02-27T09:15:00Z', projectId: 'proj-kensington' },
    { id: 'act-2', action: 'Invoice paid', detail: 'DD-2026-002 paid by Harringtons (£2,160)', icon: 'check', timestamp: '2026-02-28T14:30:00Z', projectId: 'proj-kensington' },
    { id: 'act-3', action: 'Status update', detail: '1st Fix Electrics now 85% complete', icon: 'edit', timestamp: '2026-02-27T11:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-4', action: 'Order placed', detail: 'Encaustic Tiles ordered from Bert & May', icon: 'check', timestamp: '2026-02-26T16:45:00Z', projectId: 'proj-kensington' },
    { id: 'act-5', action: 'Item shipped', detail: 'Marble Coffee Table dispatched from Wewood', icon: 'check', timestamp: '2026-02-26T10:20:00Z', projectId: 'proj-kensington' },
    { id: 'act-6', action: 'Quote received', detail: 'Hand-knotted Rug quote from Luke Irwin — £5,600', icon: 'edit', timestamp: '2026-02-25T15:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-7', action: 'Task completed', detail: 'Structural Works finished by BuildRight', icon: 'check', timestamp: '2026-02-21T17:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-8', action: 'Client approval', detail: 'Harringtons approved Drawing Room mood board', icon: 'check', timestamp: '2026-02-20T12:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-9', action: 'Invoice overdue', detail: 'DD-2026-004 overdue — fabric and dining table', icon: 'trash', timestamp: '2026-02-15T09:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-10', action: 'Project started', detail: 'Demolition & Strip-out began at Kensington', icon: 'check', timestamp: '2026-01-20T08:00:00Z', projectId: 'proj-kensington' },
    { id: 'act-11', action: 'New project', detail: 'Chelsea Apartment added — Sophie Laurent', icon: 'plus', timestamp: '2026-02-22T10:00:00Z', projectId: 'proj-chelsea' },
    { id: 'act-12', action: 'Quote requested', detail: 'Modular Sofa spec sent to Sofa Workshop', icon: 'edit', timestamp: '2026-02-23T14:00:00Z', projectId: 'proj-chelsea' },
  ],

  notifications: [
    { id: 'notif-1', title: 'Invoice Overdue', body: 'DD-2026-004 is 13 days past due', type: 'warning', read: false, timestamp: '2026-02-27T09:00:00Z' },
    { id: 'notif-2', title: 'Delivery Today', body: 'Antique Mirror arriving at Kensington site', type: 'info', read: false, timestamp: '2026-02-27T08:00:00Z' },
    { id: 'notif-3', title: 'Task Complete', body: '1st Fix Electrics reached 85%', type: 'success', read: true, timestamp: '2026-02-27T11:00:00Z' },
    { id: 'notif-4', title: 'New Quote', body: 'Luke Irwin sent rug quote — £5,600', type: 'info', read: true, timestamp: '2026-02-25T15:00:00Z' },
  ],

  settings: {
    vatRate: 20,
    currency: 'GBP',
    companyName: 'DesignDesk Studio',
    defaultMarkup: 30,
  }
};
