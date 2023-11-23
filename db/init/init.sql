-- migrations

-- boards 
CREATE TABLE IF NOT EXISTS boards (
    id SERIAL PRIMARY KEY,
    public_id varchar(36) NOT NULL,
    private_id varchar(44) NOT NULL,
    board_state json NOT NULL
);

ALTER TABLE boards
    ADD COLUMN IF NOT EXISTS public_id varchar(36) NOT NULL,
    ADD COLUMN IF NOT EXISTS private_id varchar(44) NOT NULL,
    ADD COLUMN IF NOT EXISTS board_state json NOT NULL;
