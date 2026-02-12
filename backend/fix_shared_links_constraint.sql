-- Удаляем foreign key constraint из shared_links если он существует
DO $$ 
BEGIN
    -- Проверяем существование constraint и удаляем его
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%shared_links%created_by%fkey%'
        AND table_name = 'shared_links'
    ) THEN
        EXECUTE 'ALTER TABLE shared_links DROP CONSTRAINT ' || 
            (SELECT constraint_name 
             FROM information_schema.table_constraints 
             WHERE constraint_name LIKE '%shared_links%created_by%fkey%'
             AND table_name = 'shared_links'
             LIMIT 1);
        RAISE NOTICE 'Foreign key constraint removed from shared_links';
    ELSE
        RAISE NOTICE 'No foreign key constraint found on shared_links.created_by';
    END IF;
END $$;
