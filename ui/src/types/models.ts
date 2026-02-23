export interface Application {
  id: string;
  name: string;
  comments: string | null;
  configuration_ids: string[];
}

export interface Configuration {
  id: string;
  application_id: string;
  name: string;
  comments: string | null;
  config: Record<string, unknown>;
}
