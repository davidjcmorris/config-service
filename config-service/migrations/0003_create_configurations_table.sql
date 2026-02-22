CREATE TABLE IF NOT EXISTS configurations (
    id VARCHAR(26) PRIMARY KEY,
    application_id VARCHAR(26) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name VARCHAR(256) NOT NULL,
    comments VARCHAR(1024),
    config JSONB NOT NULL DEFAULT '{}',
    UNIQUE (application_id, name)
);
