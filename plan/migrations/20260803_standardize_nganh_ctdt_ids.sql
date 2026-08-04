-- MySQL 8+
-- Backup the database before running this migration.

DELIMITER $$

DROP PROCEDURE IF EXISTS copy_legacy_column$$
CREATE PROCEDURE copy_legacy_column(
    IN table_name_value VARCHAR(64),
    IN target_column_value VARCHAR(64),
    IN source_column_value VARCHAR(64)
)
BEGIN
    DECLARE target_exists INT DEFAULT 0;
    DECLARE source_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO target_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND COLUMN_NAME = target_column_value;

    SELECT COUNT(*) INTO source_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND COLUMN_NAME = source_column_value;

    IF source_exists > 0 THEN
        IF target_exists = 0 THEN
            SET @sql = CONCAT(
                'ALTER TABLE `', REPLACE(table_name_value, '`', '``'),
                '` ADD COLUMN `', REPLACE(target_column_value, '`', '``'), '` INT NULL'
            );
            PREPARE statement FROM @sql;
            EXECUTE statement;
            DEALLOCATE PREPARE statement;
        END IF;

        SET @sql = CONCAT(
            'SELECT COUNT(*) INTO @conflict_count FROM `', REPLACE(table_name_value, '`', '``'),
            '` WHERE `', REPLACE(target_column_value, '`', '``'), '` IS NOT NULL',
            ' AND `', REPLACE(source_column_value, '`', '``'), '` IS NOT NULL',
            ' AND `', REPLACE(target_column_value, '`', '``'), '` <> `',
            REPLACE(source_column_value, '`', '``'), '`'
        );
        PREPARE statement FROM @sql;
        EXECUTE statement;
        DEALLOCATE PREPARE statement;

        IF @conflict_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Conflicting legacy and standardized ID values';
        END IF;

        SET @sql = CONCAT(
            'UPDATE `', REPLACE(table_name_value, '`', '``'),
            '` SET `', REPLACE(target_column_value, '`', '``'), '` = `',
            REPLACE(source_column_value, '`', '``'), '` WHERE `',
            REPLACE(target_column_value, '`', '``'), '` IS NULL'
        );
        PREPARE statement FROM @sql;
        EXECUTE statement;
        DEALLOCATE PREPARE statement;
    END IF;
END$$

DROP PROCEDURE IF EXISTS standardize_nganh_ctdt_ids$$
CREATE PROCEDURE standardize_nganh_ctdt_ids()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE fk_table_name VARCHAR(64);
    DECLARE fk_constraint_name VARCHAR(64);

    DECLARE old_fk_cursor CURSOR FOR
        SELECT DISTINCT kcu.TABLE_NAME, kcu.CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE kcu
        WHERE kcu.TABLE_SCHEMA = DATABASE()
          AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
          AND (
              (kcu.TABLE_NAME = 'chuongtrinh_daotao'
                  AND kcu.COLUMN_NAME IN ('major_id', 'nganhhoc_id'))
              OR
              (kcu.TABLE_NAME = 'hoso_thisinh'
                  AND kcu.COLUMN_NAME IN (
                      'major_id', 'nganhhoc_id', 'program_id', 'chuongtrinh_daotao_id'
                  ))
          );

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nganhhoc'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chuongtrinh_daotao'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hoso_thisinh'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Required admission tables are missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'chuongtrinh_daotao'
          AND COLUMN_NAME = 'nganh_id'
    ) THEN
        ALTER TABLE chuongtrinh_daotao ADD COLUMN nganh_id INT NULL AFTER id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hoso_thisinh'
          AND COLUMN_NAME = 'nganh_id'
    ) THEN
        ALTER TABLE hoso_thisinh ADD COLUMN nganh_id INT NULL AFTER cccd_noicap;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hoso_thisinh'
          AND COLUMN_NAME = 'ctdt_id'
    ) THEN
        ALTER TABLE hoso_thisinh ADD COLUMN ctdt_id INT NULL AFTER nganh_id;
    END IF;

    CALL copy_legacy_column('chuongtrinh_daotao', 'nganh_id', 'major_id');
    CALL copy_legacy_column('chuongtrinh_daotao', 'nganh_id', 'nganhhoc_id');
    CALL copy_legacy_column('hoso_thisinh', 'nganh_id', 'major_id');
    CALL copy_legacy_column('hoso_thisinh', 'nganh_id', 'nganhhoc_id');
    CALL copy_legacy_column('hoso_thisinh', 'ctdt_id', 'program_id');
    CALL copy_legacy_column('hoso_thisinh', 'ctdt_id', 'chuongtrinh_daotao_id');

    SELECT COUNT(*) INTO @missing_ctdt_nganh
    FROM chuongtrinh_daotao
    WHERE nganh_id IS NULL;
    IF @missing_ctdt_nganh > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'chuongtrinh_daotao.nganh_id contains NULL values';
    END IF;

    SELECT COUNT(*) INTO @orphan_ctdt_nganh
    FROM chuongtrinh_daotao c
    LEFT JOIN nganhhoc n ON n.id = c.nganh_id
    WHERE n.id IS NULL;
    IF @orphan_ctdt_nganh > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Orphan nganh_id values exist in chuongtrinh_daotao';
    END IF;

    SELECT COUNT(*) INTO @orphan_hoso_nganh
    FROM hoso_thisinh h
    LEFT JOIN nganhhoc n ON n.id = h.nganh_id
    WHERE h.nganh_id IS NOT NULL AND n.id IS NULL;
    IF @orphan_hoso_nganh > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Orphan nganh_id values exist in hoso_thisinh';
    END IF;

    SELECT COUNT(*) INTO @orphan_hoso_ctdt
    FROM hoso_thisinh h
    LEFT JOIN chuongtrinh_daotao c ON c.id = h.ctdt_id
    WHERE h.ctdt_id IS NOT NULL AND c.id IS NULL;
    IF @orphan_hoso_ctdt > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Orphan ctdt_id values exist in hoso_thisinh';
    END IF;

    OPEN old_fk_cursor;
    drop_old_fk: LOOP
        FETCH old_fk_cursor INTO fk_table_name, fk_constraint_name;
        IF done = 1 THEN
            LEAVE drop_old_fk;
        END IF;

        SET @sql = CONCAT(
            'ALTER TABLE `', REPLACE(fk_table_name, '`', '``'),
            '` DROP FOREIGN KEY `', REPLACE(fk_constraint_name, '`', '``'), '`'
        );
        PREPARE statement FROM @sql;
        EXECUTE statement;
        DEALLOCATE PREPARE statement;
    END LOOP;
    CLOSE old_fk_cursor;

    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'chuongtrinh_daotao' AND COLUMN_NAME = 'major_id'
    ) THEN
        ALTER TABLE chuongtrinh_daotao DROP COLUMN major_id;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'chuongtrinh_daotao' AND COLUMN_NAME = 'nganhhoc_id'
    ) THEN
        ALTER TABLE chuongtrinh_daotao DROP COLUMN nganhhoc_id;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hoso_thisinh' AND COLUMN_NAME = 'major_id'
    ) THEN
        ALTER TABLE hoso_thisinh DROP COLUMN major_id;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hoso_thisinh' AND COLUMN_NAME = 'nganhhoc_id'
    ) THEN
        ALTER TABLE hoso_thisinh DROP COLUMN nganhhoc_id;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hoso_thisinh' AND COLUMN_NAME = 'program_id'
    ) THEN
        ALTER TABLE hoso_thisinh DROP COLUMN program_id;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hoso_thisinh' AND COLUMN_NAME = 'chuongtrinh_daotao_id'
    ) THEN
        ALTER TABLE hoso_thisinh DROP COLUMN chuongtrinh_daotao_id;
    END IF;

    ALTER TABLE chuongtrinh_daotao MODIFY COLUMN nganh_id INT NOT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'chuongtrinh_daotao' AND COLUMN_NAME = 'nganh_id'
    ) THEN
        ALTER TABLE chuongtrinh_daotao ADD INDEX idx_ctdt_nganh_id (nganh_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'chuongtrinh_daotao'
          AND COLUMN_NAME = 'nganh_id'
          AND REFERENCED_TABLE_NAME = 'nganhhoc'
    ) THEN
        ALTER TABLE chuongtrinh_daotao
            ADD CONSTRAINT fk_ctdt_nganh
            FOREIGN KEY (nganh_id) REFERENCES nganhhoc(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hoso_thisinh' AND COLUMN_NAME = 'nganh_id'
    ) THEN
        ALTER TABLE hoso_thisinh ADD INDEX idx_hoso_nganh_id (nganh_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hoso_thisinh' AND COLUMN_NAME = 'ctdt_id'
    ) THEN
        ALTER TABLE hoso_thisinh ADD INDEX idx_hoso_ctdt_id (ctdt_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hoso_thisinh'
          AND COLUMN_NAME = 'nganh_id'
          AND REFERENCED_TABLE_NAME = 'nganhhoc'
    ) THEN
        ALTER TABLE hoso_thisinh
            ADD CONSTRAINT fk_hoso_nganh
            FOREIGN KEY (nganh_id) REFERENCES nganhhoc(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hoso_thisinh'
          AND COLUMN_NAME = 'ctdt_id'
          AND REFERENCED_TABLE_NAME = 'chuongtrinh_daotao'
    ) THEN
        ALTER TABLE hoso_thisinh
            ADD CONSTRAINT fk_hoso_ctdt
            FOREIGN KEY (ctdt_id) REFERENCES chuongtrinh_daotao(id) ON DELETE SET NULL;
    END IF;
END$$

CALL standardize_nganh_ctdt_ids()$$
DROP PROCEDURE standardize_nganh_ctdt_ids$$
DROP PROCEDURE copy_legacy_column$$

DELIMITER ;

SELECT
    (SELECT COUNT(*) FROM chuongtrinh_daotao WHERE nganh_id IS NULL) AS ctdt_missing_nganh,
    (SELECT COUNT(*) FROM hoso_thisinh h LEFT JOIN nganhhoc n ON n.id = h.nganh_id
        WHERE h.nganh_id IS NOT NULL AND n.id IS NULL) AS hoso_orphan_nganh,
    (SELECT COUNT(*) FROM hoso_thisinh h LEFT JOIN chuongtrinh_daotao c ON c.id = h.ctdt_id
        WHERE h.ctdt_id IS NOT NULL AND c.id IS NULL) AS hoso_orphan_ctdt;
