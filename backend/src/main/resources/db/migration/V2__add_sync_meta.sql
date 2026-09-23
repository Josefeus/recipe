-- Records the upstream source meta (repo / commit / ref) of each successful
-- data import. The dataset API exposes the latest row as `source`.
-- Note: the trigger function set_updated_at() is created in V1.

CREATE TABLE sync_meta (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    repo            VARCHAR(512) NOT NULL,
    upstream_commit VARCHAR(64),
    upstream_ref    VARCHAR(128),
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sync_meta_updated_at
    BEFORE UPDATE ON sync_meta
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();