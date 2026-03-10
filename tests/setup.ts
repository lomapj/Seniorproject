import { vi } from "vitest";

// Mock import.meta.env for Supabase client
vi.stubGlobal("import", {
  meta: {
    env: {
      PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
