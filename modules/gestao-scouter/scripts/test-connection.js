/**
 * Script to diagnose Supabase connection and data issues
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jstsrgyxrrlklnzgsihd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg";

async function testConnection() {
  console.log("🔍 Testing Supabase Connection...\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  console.log("📡 Supabase URL:", SUPABASE_URL);
  console.log("🔑 Using public anon key\n");

  // Test 1: Check if fichas table exists and has data
  console.log("=== Test 1: Checking fichas table ===");
  try {
    const { data, error, count } = await supabase.from("fichas").select("*", { count: "exact", head: false }).limit(5);

    if (error) {
      console.error("❌ Error querying fichas table:", error.message);
      console.error("Details:", error);
    } else {
      console.log(`✅ Successfully connected to fichas table`);
      console.log(`📊 Total records found: ${count}`);
      console.log(`📄 Sample data (first 5 records):`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("❌ Exception while querying fichas:", err);
  }

  console.log("\n=== Test 2: Checking fichas with filters (last 30 days) ===");
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = thirtyDaysAgo.toISOString().split("T")[0];

    const { data, error, count } = await supabase
      .from("fichas")
      .select("id, nome, scouter, projeto, criado, etapa", { count: "exact" })
      .gte("criado", dateFilter)
      .order("criado", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Error with filtered query:", error.message);
    } else {
      console.log(`✅ Found ${count} records in last 30 days`);
      console.log("Recent records:");
      console.table(data);
    }
  } catch (err) {
    console.error("❌ Exception with filtered query:", err);
  }

  console.log("\n=== Test 3: Checking unique scouters and projects ===");
  try {
    const { data: allData, error } = await supabase.from("fichas").select("scouter, projeto");

    if (error) {
      console.error("❌ Error fetching scouters/projects:", error.message);
    } else {
      const scouters = new Set(allData?.map((d) => d.scouter).filter(Boolean));
      const projects = new Set(allData?.map((d) => d.projeto).filter(Boolean));

      console.log(`✅ Unique scouters: ${scouters.size}`);
      console.log("Scouters:", Array.from(scouters).join(", "));
      console.log(`\n✅ Unique projects: ${projects.size}`);
      console.log("Projects:", Array.from(projects).join(", "));
    }
  } catch (err) {
    console.error("❌ Exception fetching scouters/projects:", err);
  }

  console.log("\n=== Test 4: Checking authentication status ===");
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      console.log("✅ User is authenticated:", session.user.email);
    } else {
      console.log("⚠️  No active session (using anonymous access)");
      console.log("This is OK for public queries with RLS policies");
    }
  } catch (err) {
    console.error("❌ Error checking auth:", err);
  }

  console.log("\n=== Diagnostic Summary ===");
  console.log("Connection test completed. Check the results above.");
}

testConnection().catch(console.error);
