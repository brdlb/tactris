-- SQL запросы для очистки содержимого таблиц базы данных
-- ВНИМАНИЕ: Эти операции необратимы! Обязательно сделайте резервную копию перед выполнением!

-- 1. Полная очистка всех таблиц (в порядке зависимостей)
-- Удаляем в обратном порядке создания, чтобы избежать ошибок с внешними ключами

-- Удаляем данные из таблиц с зависимостями
DELETE FROM leaderboard_entries;
DELETE FROM game_statistics;
DELETE FROM game_sessions;
DELETE FROM user_sessions;
DELETE FROM user_settings;
DELETE FROM users;

-- 2. Альтернативный способ с использованием TRUNCATE (быстрее, но может потребовать отключения внешних ключей)
-- TRUNCATE TABLE leaderboard_entries CASCADE;
-- TRUNCATE TABLE game_statistics CASCADE;
-- TRUNCATE TABLE game_sessions CASCADE;
-- TRUNCATE TABLE user_sessions CASCADE;
-- TRUNCATE TABLE user_settings CASCADE;
-- TRUNCATE TABLE users CASCADE;

-- 3. Очистка только игровых данных (сохранить пользователей и настройки)
-- DELETE FROM leaderboard_entries;
-- DELETE FROM game_statistics;
-- DELETE FROM game_sessions;

-- 4. Очистка только пользовательских сессий (выход из всех аккаунтов)
-- DELETE FROM user_sessions;

-- 5. Очистка с проверкой количества удаленных записей
-- DO $$
-- DECLARE
--     deleted_count INTEGER;
-- BEGIN
--     RAISE NOTICE 'Начало очистки базы данных...';
--     
--     DELETE FROM leaderboard_entries;
--     GET DIAGNOSTICS deleted_count = ROW_COUNT;
--     RAISE NOTICE 'Удалено записей из leaderboard_entries: %', deleted_count;
--     
--     DELETE FROM game_statistics;
--     GET DIAGNOSTICS deleted_count = ROW_COUNT;
--     RAISE NOTICE 'Удалено записей из game_statistics: %', deleted_count;
--     
--     DELETE FROM game_sessions;
--     GET DIAGNOSTICS deleted_count = ROW_COUNT;
--     RAISE NOTICE 'Удалено записей из game_sessions: %', deleted_count;
--     
--     DELETE FROM user_sessions;
--     GET DIAGNOSTICS deleted_count = ROW_COUNT;
--     RAISE NOTICE 'Удалено записей из user_sessions: %', deleted_count;
--     
--     DELETE FROM user_settings;
--     GET DIAGNOSTICS deleted_count = ROW_COUNT;
--     RAISE NOTICE 'Удалено записей из user_settings: %', deleted_count;
--     
--     DELETE FROM users;
--     GET DIAGNOSTICS deleted_count = ROW_COUNT;
--     RAISE NOTICE 'Удалено записей из users: %', deleted_count;
--     
--     RAISE NOTICE 'Очистка базы данных завершена!';
-- END $$;

-- ПРИМЕЧАНИЯ:
-- - figure_definitions НЕ очищается (справочная таблица)
-- - migrations НЕ очищается (отслеживание миграций)
-- - Для больших таблиц TRUNCATE работает быстрее, чем DELETE
-- - DELETE позволяет использовать WHERE для частичной очистки
-- - Всегда делайте резервную копию перед выполнением!