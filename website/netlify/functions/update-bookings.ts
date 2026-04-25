/// <reference types="node" />
import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// 1. Grab our environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Notice we are using the SERVICE ROLE KEY, not the anon key!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE env vars for update-bookings function');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. The 'schedule' wrapper tells Netlify to run this on a timer
export const handler = schedule('*/5 * * * *', async () => {
  console.log("⏰ Waking up to check booking statuses...");
  
  // Get the exact time right now
  const now = new Date().toISOString();

  try {
    // TASK A: Find events starting right now and mark them IN PROGRESS
    const { error: progressError } = await supabase
      .from('bookings')
      .update({ status: 'IN PROGRESS' })
      .lte('start_time', now) // start_time is Less Than or Equal to right now
      .gt('end_time', now)    // end_time is Greater Than right now
      .in('status', ['PENDING', 'CONFIRMED']);

    if (progressError) throw progressError;

    // TASK B: Find events that just ended and mark them COMPLETED
    const { error: completedError } = await supabase
      .from('bookings')
      .update({ status: 'COMPLETED' })
      .lte('end_time', now)   // end_time is Less Than or Equal to right now
      .neq('status', 'COMPLETED')
      .neq('status', 'CANCELLED');

    if (completedError) throw completedError;

    console.log("✅ Successfully updated the database!");
    return { statusCode: 200, body: 'Success' };

  } catch (error) {
    console.error("❌ Error updating bookings:", error);
    throw error;
  }
});