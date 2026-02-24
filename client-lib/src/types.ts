// Domain types

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

// Request types

export interface ApplicationCreate {
  name: string;
  comments?: string | null;
}

export interface ApplicationUpdate {
  name?: string;
  comments?: string | null;
}

export interface ConfigurationCreate {
  application_id: string;
  name: string;
  comments?: string | null;
  config?: Record<string, unknown>;
}

export interface ConfigurationUpdate {
  name?: string;
  comments?: string | null;
  config?: Record<string, unknown>;
}
