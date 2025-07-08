/**
 * WhatsApp API type definitions
 */

export interface WhatsAppMessagePayload {
  object: string;
  entry: Entry[];
}

interface Entry {
  id: string;
  changes: Change[];
}

interface Change {
  value: Value;
  field: string;
}

interface Value {
  messaging_product: string;
  metadata: Metadata;
  contacts: Contact[];
  messages: Message[];
}

interface Metadata {
  display_phone_number: string;
  phone_number_id: string;
}

interface Contact {
  profile: Profile;
  wa_id: string;
}

interface Profile {
  name: string;
}

interface Message {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: Text;
  video?: Video;
  audio?: Audio;
}

interface Text {
  body: string;
}

interface Video {
  mime_type: string;
  sha256: string;
  id: string;
}

interface Audio {
  mime_type: string;
  sha256: string;
  id: string;
  voice: boolean;
}

export interface WhatsAppMediaJson {
  file_size: number;
  id: string;
  messaging_product: string;
  mime_type: string;
  sha256: string;
  url: string;
}

export interface WhatsAppMessageResult {
  messaging_product: string;
  contacts: {
    input: string;
    wa_id: string;
  }[];
  messages: {
    id: string;
  }[];
}

export interface WhatsAppTemplateParameter {
  type: 'text';
  text: string;
}

export interface WhatsAppTemplateComponent {
  type: 'body';
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplate {
  name: string;
  language: {
    code: string;
  };
  components: WhatsAppTemplateComponent[];
}
