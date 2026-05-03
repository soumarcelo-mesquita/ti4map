import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cnbpicorpoiczeczdytd.supabase.co';
const supabaseAnonKey = 'sb_publishable_5P2zV3pIQM0yKr6M9UD0AQ_70UOttUN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log('Testing connection to rooms table...');
    const { data, error, status, statusText } = await supabase
        .from('rooms')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        console.error('Status:', status, statusText);
    } else {
        console.log('Success! Data:', data);
    }
}

test();
