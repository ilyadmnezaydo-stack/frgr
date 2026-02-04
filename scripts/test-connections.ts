import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function main() {
    console.log('🔍 Starting Connectivity Test...\n');

    // 1. Load Environment Variables (check both .env and .env.local)
    let envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        envPath = path.join(process.cwd(), '.env');
    }

    if (!fs.existsSync(envPath)) {
        console.error('❌ Neither .env.local nor .env file found!');
        process.exit(1);
    }

    console.log(`📄 Using config file: ${path.basename(envPath)}`);

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env: Record<string, string> = {};
    envContent.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && vals.length) env[key.trim()] = vals.join('=').trim();
    });

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const ollamaUrl = env.OLLAMA_API_URL || 'http://127.0.0.1:11434';

    const maskUrl = (url?: string) => url ? url.substring(0, 20) + '...' : 'MISSING';

    console.log(`\n✅ Loaded config:`);
    console.log(`   - Supabase URL: ${maskUrl(supabaseUrl)}`);
    console.log(`   - Supabase Key: ${supabaseKey ? 'Found' : 'MISSING'}`);
    console.log(`   - Ollama:       ${ollamaUrl}`);

    if (!supabaseUrl || !supabaseKey) {
        console.error('\n❌ Missing Supabase credentials in env file!');
        process.exit(1);
    }

    // 2. Test Supabase
    console.log('\n📡 Testing Supabase Connection...');
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase.from('contacts').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Supabase Error:', error.message);
            if (error.code === 'PGRST205') {
                console.error('   💡 Hint: Run the SQL Schema in Supabase SQL Editor!');
            }
        } else {
            console.log('✅ Supabase Connected! Contacts table exists.');
        }
    } catch (err: any) {
        console.error('❌ Supabase Connection Failed:', err.message);
    }

    // 3. Test Ollama
    console.log('\n🧠 Testing Ollama Connection...');
    try {
        const res = await fetch(`${ollamaUrl}/api/tags`);
        if (res.ok) {
            const data = await res.json();
            console.log('✅ Ollama Reachable!');
            const models = data.models.map((m: any) => m.name);
            console.log('   Available Models:', models.join(', '));

            if (!models.some((m: string) => m.includes('qwen2.5:1.5b'))) {
                console.warn('   ⚠️  Model qwen2.5:1.5b NOT found. Run: ollama pull qwen2.5:1.5b');
            } else {
                console.log('   ✅ Target model qwen2.5:1.5b found.');
            }
        } else {
            console.error('❌ Ollama responded with error:', res.status);
        }
    } catch (err: any) {
        console.error('❌ Ollama Unreachable:', err.cause ? err.cause.code : err.message);
        console.error('   💡 Hint: Ensure Ollama is running (CUDA_VISIBLE_DEVICES= ollama serve)');
    }

    console.log('\n✅ Connectivity test complete!\n');
}

main().catch(console.error);
