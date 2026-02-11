-- Clear all news article data (keeps revenue owner setup)
DELETE FROM article_revenue_owners;
DELETE FROM article_sources;
DELETE FROM news_articles;
DELETE FROM seen_urls;
DELETE FROM news_config WHERE key IN ('refresh_status', 'last_scheduled_refresh');
