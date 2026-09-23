-- Initial recipe schema.
-- Recipe data (including full upstream markdown) and categories migrated
-- from the frontend bundle into PostgreSQL.

-- Updated_at maintenance for every table.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE category (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key        VARCHAR(64)  NOT NULL,
    tag        VARCHAR(64)  NOT NULL,
    emoji      VARCHAR(16),
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_category_key UNIQUE (key)
);

CREATE TABLE recipe (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    external_id  VARCHAR(32)  NOT NULL,
    name         VARCHAR(255) NOT NULL,
    category_id  BIGINT       NOT NULL REFERENCES category(id),
    image_path   VARCHAR(512),
    raw_markdown TEXT         NOT NULL,
    source_path  VARCHAR(512) NOT NULL,
    est_minutes  INT,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_recipe_external_id UNIQUE (external_id),
    CONSTRAINT uq_recipe_source_path UNIQUE (source_path),
    CONSTRAINT ck_recipe_est_minutes CHECK (est_minutes IS NULL OR est_minutes >= 0)
);

CREATE TABLE recipe_ingredient (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipe_id  BIGINT      NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
    sort_order INT         NOT NULL,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recipe_step (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipe_id  BIGINT      NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
    sort_order INT         NOT NULL,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recipe_nutrition (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipe_id  BIGINT       NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
    sort_order INT          NOT NULL,
    label      VARCHAR(128) NOT NULL,
    value      VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_category_id ON recipe(category_id);
CREATE INDEX idx_recipe_deleted_at ON recipe(deleted_at);
CREATE INDEX idx_recipe_ingredient_recipe_id ON recipe_ingredient(recipe_id, sort_order);
CREATE INDEX idx_recipe_step_recipe_id ON recipe_step(recipe_id, sort_order);
CREATE INDEX idx_recipe_nutrition_recipe_id ON recipe_nutrition(recipe_id, sort_order);

CREATE TRIGGER trg_category_updated_at
    BEFORE UPDATE ON category
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recipe_updated_at
    BEFORE UPDATE ON recipe
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recipe_ingredient_updated_at
    BEFORE UPDATE ON recipe_ingredient
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recipe_step_updated_at
    BEFORE UPDATE ON recipe_step
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recipe_nutrition_updated_at
    BEFORE UPDATE ON recipe_nutrition
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();