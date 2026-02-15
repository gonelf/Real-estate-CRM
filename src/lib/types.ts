export type PropertyStatus = "available" | "cpcv" | "sold";

export type LeadStatus = "good" | "maybe" | "bad";

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  comments: Comment[];
  createdAt: string;
}

export interface Property {
  id: string;
  address: string;
  status: PropertyStatus;
  photos: string[]; // base64 encoded
  leads: Lead[];
  createdAt: string;
}
