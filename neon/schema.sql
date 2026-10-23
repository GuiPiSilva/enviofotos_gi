CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS gi_galleries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL,
 client_name text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '',
 event_date date,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 share_token text NOT NULL UNIQUE,
 password_hash text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gi_photos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 gallery_id uuid NOT NULL REFERENCES gi_galleries(id) ON DELETE CASCADE,
 file_name text NOT NULL,
 object_key text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gi_photos_gallery_idx ON gi_photos(gallery_id);
