-- Supabase exposes the public schema through its Data API. The app reads and
-- writes "Store" only from the server as the table owner, so no policy is
-- granted and the Data API sees nothing.
ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY;
