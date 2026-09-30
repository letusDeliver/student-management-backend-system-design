-- Schema for the Student Management System.
-- Re-runnable: drops and recreates everything (destroys data).
--   psql "$DATABASE_URL" -f db/schema.sql

DROP TABLE IF EXISTS students, departments;

create table departments (
    id         integer primary key generated always as identity,
    name       text not null,
    code       text not null unique,
    created_at timestamptz not null default now()
);

create table students (
    id            integer primary key generated always as identity,
    name          text not null,
    email         text not null unique,
    department_id integer not null,
    created_at    timestamptz not null default now(),
    -- No ON DELETE clause = NO ACTION: a department with students cannot be deleted.
    constraint students_department_id_fkey
        foreign key (department_id) references departments (id)
);

-- Postgres indexes PRIMARY KEY and UNIQUE columns automatically, but NOT foreign keys.
-- Without this, "students of department X" and every DELETE on departments
-- (which must check for referencing students) scan the whole students table.
create index students_department_id_idx on students (department_id);
