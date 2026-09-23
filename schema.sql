-- 先延ばし解決webアプリ DBスキーマ定義
-- PostgreSQL想定

-- ==========================================
-- ユーザー
-- ==========================================
CREATE TABLE users (
    user_id         SERIAL PRIMARY KEY,
    user_name       VARCHAR(50)  NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL
);

-- ==========================================
-- 大タスク
-- ==========================================
CREATE TABLE big_tasks (
    big_task_id     SERIAL PRIMARY KEY,
    task_name       VARCHAR(100) NOT NULL,
    task_date       DATE NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    user_id         INTEGER NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_big_tasks_user_date ON big_tasks(user_id, task_date);
CREATE UNIQUE INDEX idx_one_active_task_per_user ON big_tasks(user_id) WHERE is_active = true;

-- ==========================================
-- 小タスク
-- ==========================================
CREATE TABLE sub_tasks (
    sub_task_id     SERIAL PRIMARY KEY,
    task_name       VARCHAR(100) NOT NULL,
    deadline_time   TIME,
    sort_order      INTEGER NOT NULL,
    starter_task    VARCHAR(100),
    estimated_minutes INTEGER,
    actual_minutes  INTEGER,
    is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    big_task_id     INTEGER NOT NULL
        REFERENCES big_tasks(big_task_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_sub_tasks_big_task ON sub_tasks(big_task_id, sort_order);