-- migrations


-- users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS login varchar(36) NOT NULL,
    ADD COLUMN IF NOT EXISTS password varchar(97) NOT NULL,
    ADD COLUMN IF NOT EXISTS public_login varchar(36) NOT NULL,
    ADD COLUMN IF NOT EXISTS first_name varchar(36) NOT NULL,
    ADD COLUMN IF NOT EXISTS second_name varchar(36) NOT NULL;

-- boards 
CREATE TABLE IF NOT EXISTS boards (
    id SERIAL PRIMARY KEY,
    owner_id INT,
    CONSTRAINT fk_user
        FOREIGN KEY(owner_id)
	    REFERENCES users(id)
	        ON DELETE SET NULL
);

ALTER TABLE boards
    ADD COLUMN IF NOT EXISTS public_id varchar(36) NOT NULL,
    ADD COLUMN IF NOT EXISTS private_id varchar(44) NOT NULL,
    ADD COLUMN IF NOT EXISTS board_state json NOT NULL,
    ADD COLUMN IF NOT EXISTS title varchar(36) DEFAULT 'untitled';

-- jwt
CREATE TABLE IF NOT EXISTS expired_jwts (
	  id SERIAL PRIMARY KEY,
	  jwt_data VARCHAR (500) NOT NULL,
    expire_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- folders
CREATE TABLE IF NOT EXISTS folders(
    id SERIAL PRIMARY KEY,
    public_id varchar(36) NOT NULL,
    title varchar(36) DEFAULT 'untitled',
    owner_id INT,
    CONSTRAINT fk_user FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS board_folder(
    id SERIAL PRIMARY KEY,
    board_id INT,
    folder_id INT,
    CONSTRAINT fk_user FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE,
    CONSTRAINT fk_folder FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

