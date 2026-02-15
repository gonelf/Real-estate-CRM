import { Property, Lead, Comment, PropertyStatus, LeadStatus } from "./types";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "nocrm_properties";

function getProperties(): Property[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveProperties(properties: Property[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
}

export function loadProperties(): Property[] {
  return getProperties();
}

export function getProperty(id: string): Property | undefined {
  return getProperties().find((p) => p.id === id);
}

export function addProperty(address: string, status: PropertyStatus, photos: string[]): Property {
  const properties = getProperties();
  const property: Property = {
    id: uuidv4(),
    address,
    status,
    photos,
    leads: [],
    createdAt: new Date().toISOString(),
  };
  properties.push(property);
  saveProperties(properties);
  return property;
}

export function updateProperty(
  id: string,
  updates: { address?: string; status?: PropertyStatus; photos?: string[] }
): Property | undefined {
  const properties = getProperties();
  const index = properties.findIndex((p) => p.id === id);
  if (index === -1) return undefined;
  properties[index] = { ...properties[index], ...updates };
  saveProperties(properties);
  return properties[index];
}

export function deleteProperty(id: string): void {
  const properties = getProperties().filter((p) => p.id !== id);
  saveProperties(properties);
}

export function addLead(
  propertyId: string,
  name: string,
  email: string,
  phone: string,
  status: LeadStatus
): Lead | undefined {
  const properties = getProperties();
  const property = properties.find((p) => p.id === propertyId);
  if (!property) return undefined;
  const lead: Lead = {
    id: uuidv4(),
    propertyId,
    name,
    email,
    phone,
    status,
    comments: [],
    createdAt: new Date().toISOString(),
  };
  property.leads.push(lead);
  saveProperties(properties);
  return lead;
}

export function updateLead(
  propertyId: string,
  leadId: string,
  updates: { name?: string; email?: string; phone?: string; status?: LeadStatus }
): Lead | undefined {
  const properties = getProperties();
  const property = properties.find((p) => p.id === propertyId);
  if (!property) return undefined;
  const leadIndex = property.leads.findIndex((l) => l.id === leadId);
  if (leadIndex === -1) return undefined;
  property.leads[leadIndex] = { ...property.leads[leadIndex], ...updates };
  saveProperties(properties);
  return property.leads[leadIndex];
}

export function deleteLead(propertyId: string, leadId: string): void {
  const properties = getProperties();
  const property = properties.find((p) => p.id === propertyId);
  if (!property) return;
  property.leads = property.leads.filter((l) => l.id !== leadId);
  saveProperties(properties);
}

export function getLead(propertyId: string, leadId: string): Lead | undefined {
  const property = getProperty(propertyId);
  if (!property) return undefined;
  return property.leads.find((l) => l.id === leadId);
}

export function addComment(propertyId: string, leadId: string, text: string): Comment | undefined {
  const properties = getProperties();
  const property = properties.find((p) => p.id === propertyId);
  if (!property) return undefined;
  const lead = property.leads.find((l) => l.id === leadId);
  if (!lead) return undefined;
  const comment: Comment = {
    id: uuidv4(),
    text,
    createdAt: new Date().toISOString(),
  };
  lead.comments.push(comment);
  saveProperties(properties);
  return comment;
}

export function deleteComment(propertyId: string, leadId: string, commentId: string): void {
  const properties = getProperties();
  const property = properties.find((p) => p.id === propertyId);
  if (!property) return;
  const lead = property.leads.find((l) => l.id === leadId);
  if (!lead) return;
  lead.comments = lead.comments.filter((c) => c.id !== commentId);
  saveProperties(properties);
}
