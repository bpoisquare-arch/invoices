import { createClient } from '@supabase/supabase-js'

const url = 'https://ybrzysgpuiysroajzctm.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlicnp5c2dwdWl5c3JvYWp6Y3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwODkxMTcsImV4cCI6MjEwMTY2NTExN30.RzjjqvX4vXC49w4CGaw9ij4c2K0xjQ3KN5tL3LyXbJU'

const supabase = createClient(url, key)

async function main() {
  const rpcs = ['exec_sql', 'execute_sql', 'sql', 'query']
  for (const rpc of rpcs) {
    const { data, error } = await supabase.rpc(rpc, { sql: 'SELECT 1;' })
    console.log(`RPC ${rpc}:`, error ? error.message : data)
  }
}

main()
