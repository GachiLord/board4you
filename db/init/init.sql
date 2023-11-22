-- migrations

-- boards 
CREATE TABLE IF NOT EXISTS boards (
    public_id uuid NOT NULL,
    private_id varchar(44) NOT NULL,
    board_state json NOT NULL,
    PRIMARY KEY (public_id)
);

ALTER TABLE boards
    ADD COLUMN IF NOT EXISTS private_id varchar(44) NOT NULL,
    ADD COLUMN IF NOT EXISTS board_state json NOT NULL;
