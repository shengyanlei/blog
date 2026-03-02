-- Production SQL: create private travel plans and tasks

CREATE TABLE IF NOT EXISTS travel_plan (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    province VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    status VARCHAR(32) NOT NULL,
    priority VARCHAR(32) NOT NULL,
    budget_min DECIMAL(10,2) NULL,
    budget_max DECIMAL(10,2) NULL,
    tags VARCHAR(255) NULL,
    notes TEXT NULL,
    linked_journey_id BIGINT NULL,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    INDEX idx_plan_status (status),
    INDEX idx_plan_start (start_date),
    INDEX idx_plan_province_city (province, city),
    CONSTRAINT fk_plan_journey FOREIGN KEY (linked_journey_id) REFERENCES travel_journey(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS travel_plan_task (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    plan_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    done BIT(1) NULL,
    sort_order INT NULL,
    INDEX idx_plan_task_plan (plan_id),
    CONSTRAINT fk_plan_task_plan FOREIGN KEY (plan_id) REFERENCES travel_plan(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
