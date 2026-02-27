import { UserRole, User } from './types';

export const APP_NAME = "Street Burger Issue Tracker";

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alice Admin',
    email: 'admin@nexus.com',
    role: UserRole.ADMIN,
    avatar: 'https://picsum.photos/100/100'
  },
  {
    id: 'u2',
    name: 'Bob Staff',
    email: 'staff@outlet.com',
    role: UserRole.STAFF,
    avatar: 'https://picsum.photos/101/101'
  },
  {
    id: 'u3',
    name: 'Charlie Tech',
    email: 'tech@nexus.com',
    role: UserRole.TECHNICIAN,
    avatar: 'https://picsum.photos/102/102'
  }
];

export const CATEGORY_STRUCTURE: Record<string, string[]> = {
  "Civil Works": ["Masonry, tiling, painting", "Ceiling, flooring, partitions", "Waterproofing"],
  "Electrical": ["Wiring and cabling", "Lighting and switches", "DB panels and breakers"],
  "Plumbing & Drainage": ["Water supply lines", "Drain blockages", "Leak repairs", "Gully and sewage works"],
  "HVAC (Air Conditioning & Ventilation)": ["AC servicing", "Gas charging", "Coil replacement", "Exhaust systems"],
  "Kitchen Equipment / Machinery": ["Fryers, grills, ovens", "Chillers & freezers", "Preventive maintenance", "Spare parts replacement"],
  "Refrigeration": ["Cold rooms", "Display chillers", "Compressor repairs"],
  "Pest Control": ["Scheduled treatments"]
};

export const CATEGORIES = Object.keys(CATEGORY_STRUCTURE);

export const ISSUE_PLACES = [
  "Outlet",
  "Accommodation"
];

export const BRANCH_LOCATIONS = [
  "Bambalapitiya",
  "Mount Lavinia",
  "Nawala",
  "Maharagama",
  "Kotte",
  "Wattala",
  "Ja Ela",
  "Galle",
  "Negombo",
  "Dehiwala Office",
  "Dematagoda CK"
];