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
}

interface Text {
  body: string;
}

interface Video {
  mime_type: string;
  sha256: string;
  id: string;
}

export interface WhatsAppMediaJson {
  file_size: number;
  id: string;
  messaging_product: string;
  mime_type: string;
  sha256: string;
  url: string;
}
