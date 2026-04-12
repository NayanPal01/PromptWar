/**
 * Venue Templates — VenueIQ
 * 
 * Prebuilt SVG layout configurations for different venue types.
 * Each template provides gate positions, zone positions, and
 * default data for rapid event setup.
 * 
 * Templates: stadium, auditorium, concert
 */

import { Building2, Theater, Music } from 'lucide-react';

export const VENUE_TEMPLATES = {
  stadium: {
    id: "stadium",
    name: "Stadium",
    description: "Large outdoor/indoor stadium with 4+ gates, multiple zones",
    icon: <Building2 size={24} color="#1a73e8" />,
    svgViewBox: "0 0 400 350",
    // Gate positions on the SVG map
    gatePositions: [
      { id: "gate_A", cx: 200, cy: 40, label: "A" },
      { id: "gate_B", cx: 360, cy: 140, label: "B" },
      { id: "gate_C", cx: 300, cy: 300, label: "C" },
      { id: "gate_D", cx: 40, cy: 200, label: "D" },
      { id: "gate_E", cx: 100, cy: 80, label: "E" },
    ],
    // Zone heat blobs on the SVG map
    zonePositions: [
      { id: "zone_north", cx: 200, cy: 80, rx: 80, ry: 30 },
      { id: "zone_east", cx: 320, cy: 170, rx: 45, ry: 50 },
      { id: "zone_south", cx: 200, cy: 270, rx: 80, ry: 30 },
      { id: "zone_west", cx: 80, cy: 170, rx: 45, ry: 50 },
      { id: "zone_vip", cx: 320, cy: 280, rx: 35, ry: 22 },
      { id: "zone_food", cx: 200, cy: 175, rx: 50, ry: 28 },
    ],
    // Outline shapes
    outlines: [
      { type: "ellipse", cx: 200, cy: 175, rx: 175, ry: 140 },
      { type: "ellipse", cx: 200, cy: 175, rx: 120, ry: 90 },
    ],
    // Field/stage area
    center: { type: "rect", x: 150, y: 140, w: 100, h: 65, label: "FIELD" },
    // Default data for quick setup
    defaultGates: [
      { name: "Gate A", section: "North", crowd: 0.3, waitMin: 5 },
      { name: "Gate B", section: "East", crowd: 0.5, waitMin: 10 },
      { name: "Gate C", section: "South", crowd: 0.4, waitMin: 8 },
      { name: "Gate D", section: "West", crowd: 0.6, waitMin: 12 },
      { name: "Gate E", section: "North-East", crowd: 0.2, waitMin: 3 },
    ],
    defaultZones: [
      { name: "North Stand", capacity: 12000 },
      { name: "East Wing", capacity: 8000 },
      { name: "South Stand", capacity: 15000 },
      { name: "West Wing", capacity: 10000 },
      { name: "VIP Lounge", capacity: 2000 },
      { name: "Food Court", capacity: 5000 },
    ],
    defaultStalls: [
      { name: "Samosa Central", queue: 8, avgService: 45, counters: 3, category: "snacks", type: "food" },
      { name: "Biryani House", queue: 5, avgService: 90, counters: 2, category: "meals", type: "food" },
      { name: "Chai Point", queue: 12, avgService: 30, counters: 4, category: "beverages", type: "food" },
      { name: "Restroom North", queue: 4, avgService: 120, counters: 8, category: "restroom", type: "restroom", accessible: true },
      { name: "Restroom South", queue: 6, avgService: 120, counters: 6, category: "restroom", type: "restroom", accessible: false },
      { name: "Restroom VIP", queue: 1, avgService: 120, counters: 4, category: "restroom", type: "restroom", accessible: true },
    ],
    defaultStaff: [
      { name: "Security Lead", role: "Security Lead", status: "available" },
      { name: "Medical Officer", role: "Medical", status: "available" },
      { name: "Operations Mgr", role: "Operations", status: "available" },
    ],
  },

  auditorium: {
    id: "auditorium",
    name: "Auditorium",
    description: "Indoor auditorium with stage, seating rows, 2-3 gates",
    icon: <Theater size={24} color="#7c3aed" />,
    svgViewBox: "0 0 400 300",
    gatePositions: [
      { id: "gate_A", cx: 50, cy: 260, label: "A" },
      { id: "gate_B", cx: 200, cy: 280, label: "B" },
      { id: "gate_C", cx: 350, cy: 260, label: "C" },
    ],
    zonePositions: [
      { id: "zone_front", cx: 200, cy: 100, rx: 100, ry: 25 },
      { id: "zone_middle", cx: 200, cy: 160, rx: 120, ry: 30 },
      { id: "zone_back", cx: 200, cy: 230, rx: 140, ry: 30 },
      { id: "zone_balcony", cx: 200, cy: 40, rx: 80, ry: 18 },
    ],
    outlines: [
      { type: "rect", x: 30, y: 60, w: 340, h: 220, rx: 16 },
    ],
    center: { type: "rect", x: 100, y: 20, w: 200, h: 40, label: "STAGE" },
    defaultGates: [
      { name: "Gate A (Left)", section: "Left", crowd: 0.4, waitMin: 7 },
      { name: "Gate B (Main)", section: "Center", crowd: 0.6, waitMin: 12 },
      { name: "Gate C (Right)", section: "Right", crowd: 0.3, waitMin: 5 },
    ],
    defaultZones: [
      { name: "Front Rows", capacity: 500 },
      { name: "Middle Section", capacity: 1200 },
      { name: "Back Section", capacity: 800 },
      { name: "Balcony", capacity: 400 },
    ],
    defaultStalls: [
      { name: "Snack Counter", queue: 6, avgService: 40, counters: 2, category: "snacks", type: "food" },
      { name: "Beverage Bar", queue: 4, avgService: 30, counters: 2, category: "beverages", type: "food" },
      { name: "Restroom Left", queue: 3, avgService: 120, counters: 4, category: "restroom", type: "restroom", accessible: true },
      { name: "Restroom Right", queue: 5, avgService: 120, counters: 4, category: "restroom", type: "restroom", accessible: false },
    ],
    defaultStaff: [
      { name: "Usher Lead", role: "Usher", status: "available" },
      { name: "Security", role: "Security", status: "available" },
    ],
  },

  concert: {
    id: "concert",
    name: "Concert / Open-Air",
    description: "Open-air concert venue with standing zones, VIP area",
    icon: <Music size={24} color="#f9ab00" />,
    svgViewBox: "0 0 400 320",
    gatePositions: [
      { id: "gate_A", cx: 60, cy: 300, label: "A" },
      { id: "gate_B", cx: 200, cy: 310, label: "B" },
      { id: "gate_C", cx: 340, cy: 300, label: "C" },
      { id: "gate_D", cx: 380, cy: 160, label: "D" },
    ],
    zonePositions: [
      { id: "zone_pit", cx: 200, cy: 110, rx: 70, ry: 35 },
      { id: "zone_general", cx: 200, cy: 200, rx: 120, ry: 40 },
      { id: "zone_vip", cx: 80, cy: 130, rx: 40, ry: 25 },
      { id: "zone_lawn", cx: 200, cy: 270, rx: 140, ry: 25 },
    ],
    outlines: [
      { type: "rect", x: 30, y: 50, w: 340, h: 260, rx: 20 },
    ],
    center: { type: "rect", x: 120, y: 20, w: 160, h: 45, label: "STAGE" },
    defaultGates: [
      { name: "Gate A (Left)", section: "Left", crowd: 0.3, waitMin: 5 },
      { name: "Gate B (Main)", section: "Center", crowd: 0.7, waitMin: 15 },
      { name: "Gate C (Right)", section: "Right", crowd: 0.4, waitMin: 8 },
      { name: "Gate D (VIP)", section: "VIP", crowd: 0.2, waitMin: 3 },
    ],
    defaultZones: [
      { name: "The Pit", capacity: 3000 },
      { name: "General Standing", capacity: 10000 },
      { name: "VIP Area", capacity: 1000 },
      { name: "Lawn Section", capacity: 5000 },
    ],
    defaultStalls: [
      { name: "Food Truck 1", queue: 10, avgService: 50, counters: 2, category: "meals", type: "food" },
      { name: "Food Truck 2", queue: 7, avgService: 45, counters: 2, category: "snacks", type: "food" },
      { name: "Bar", queue: 15, avgService: 25, counters: 3, category: "beverages", type: "food" },
      { name: "Portable Restroom A", queue: 8, avgService: 120, counters: 6, category: "restroom", type: "restroom", accessible: true },
      { name: "Portable Restroom B", queue: 5, avgService: 120, counters: 6, category: "restroom", type: "restroom", accessible: false },
    ],
    defaultStaff: [
      { name: "Security Chief", role: "Security Lead", status: "available" },
      { name: "Medical Team", role: "Medical", status: "available" },
      { name: "Crowd Control", role: "Security", status: "available" },
    ],
  },
};

/** Get gate positions for a template, with dynamic IDs */
export function getGatePositions(template, gates) {
  const tmpl = VENUE_TEMPLATES[template];
  if (!tmpl) return [];
  return tmpl.gatePositions.map((pos, i) => {
    const gate = gates[i];
    return gate ? { ...pos, id: gate.id } : pos;
  });
}

/** Get zone positions for a template, with dynamic IDs */
export function getZonePositions(template, zones) {
  const tmpl = VENUE_TEMPLATES[template];
  if (!tmpl) return [];
  return tmpl.zonePositions.map((pos, i) => {
    const zone = zones[i];
    return zone ? { ...pos, id: zone.id } : pos;
  });
}

export default VENUE_TEMPLATES;
