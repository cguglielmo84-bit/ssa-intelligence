-- Clear all news article data (keeps entity setup: tags, companies, people, user call diets)
BEGIN;
DELETE FROM user_pinned_articles;
DELETE FROM user_activities;
DELETE FROM article_users;
DELETE FROM article_sources;
DELETE FROM news_articles;
DELETE FROM seen_urls;
DELETE FROM news_config WHERE key IN ('refresh_status', 'last_scheduled_refresh');
COMMIT;
