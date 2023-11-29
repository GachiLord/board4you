-- migrations


-- users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS login varchar(36) NOT NULL,
    ADD COLUMN IF NOT EXISTS password varchar(64) NOT NULL,
    ADD COLUMN IF NOT EXISTS public_login varchar(36) NOT NULL,
    ADD COLUMN IF NOT EXISTS first_name varchar(36) NOT NULL,
    ADD COLUMN IF NOT EXISTS second_name varchar(36) NOT NULL;

-- boards 
CREATE TABLE IF NOT EXISTS boards (
    id SERIAL PRIMARY KEY,
    CONSTRAINT fk_user
        FOREIGN KEY(owner_id)
	    REFERENCES users(id)
	        ON DELETE SET NULL
);

ALTER TABLE boards
    ADD COLUMN IF NOT EXISTS public_id varchar(36) NOT NULL,
    ADD COLUMN IF NOT EXISTS private_id varchar(44) NOT NULL,
    ADD COLUMN IF NOT EXISTS board_state json NOT NULL;