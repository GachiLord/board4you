CREATE TABLE boards (
    public_id uuid NOT NULL,
    private_id varchar(44) NOT NULL,
    board_state json NOT NULL,
    PRIMARY KEY (public_id)
)