import { NextRequest, NextResponse } from 'next/server';

interface MappingRequest {
    headers: string[];
    sampleRow: Record<string, any>;
}

interface MappingResponse {
    имя?: string;
    фамилия?: string;
    компания?: string;
    должность?: string;
    примечания?: string;
    электронная_почта?: string;
    телефон?: string;
    linkedin_url?: string;
    телеграмма?: string;
    website?: string;
    страна?: string;
    рейтинг?: string;
    сеть?: string;
    день_рождения?: string;
}

interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OllamaRequest {
    model: string;
    messages: OllamaMessage[];
    stream: boolean;
    format: string;
}

interface OllamaResponse {
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const body: MappingRequest = await request.json();
        const { headers } = body;

        if (!headers || headers.length === 0) {
            return NextResponse.json(
                { error: 'No headers provided' },
                { status: 400 }
            );
        }

        // Ultra-simplified prompt with Russian field names
        const systemPrompt = `Map Excel column headers to database fields. Return JSON only.

Example:
Headers: ["Name", "Email", "Company Name"]
Output: {"имя": "Name", "электронная_почта": "Email", "компания": "Company Name"}

Fields you can use (Russian database):
- имя (for first names: Name, First Name, Имя, ФИО, Канал бота)
- фамилия (for last names: Last Name, Surname, Фамилия)
- компания (Company, Компания, Organization)
- должность (Position, Job Title, Должность)
- примечания (Notes, Comments, Заметки)
- электронная_почта (Email, E-mail, Почта)
- телефон (Phone, Mobile, Телефон)
- linkedin_url (LinkedIn, Линкедин)
- телеграмма (Telegram, Телега, TG)
- website (Website, Domain, Домен, Сайт)
- страна (Country, Страна, Region)
- рейтинг (Rating, Score, Рейтинг)
- сеть (Network, Нетворк, Community)
- день_рождения (Birthday, Birth Date, Дата)

Special mappings:
- "канал бота" or similar names → use "имя"
- "LinkedIn/Телега" → use "телеграмма"
- "должность и заметки" → use "должность"

Return ONLY the fields you find. Skip fields you don't see.`;

        const userPrompt = `Headers: ${JSON.stringify(headers)}
Output:`;


        const ollamaUrl = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';

        const ollamaRequest: OllamaRequest = {
            model: 'qwen2.5:1.5b',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
            stream: false,
            format: 'json'
        };

        console.log('🤖 Sending request to Ollama...');
        console.log('Headers to map:', headers);

        const response = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ollamaRequest),
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Ollama error' }, { status: 503 });
        }

        const ollamaResponse: OllamaResponse = await response.json();
        console.log('🎯 Ollama raw response:', ollamaResponse.message.content);

        // Parse the AI's JSON response
        let mapping: Record<string, string>;
        try {
            mapping = JSON.parse(ollamaResponse.message.content);
        } catch (parseError) {
            return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
        }

        // Normalize keys - handle both Russian and English AI outputs
        const normalizedMapping: Record<string, string> = {};
        for (const [key, val] of Object.entries(mapping)) {
            let normKey = key;

            // Normalize English → Russian
            if (key === 'first_name' || key === 'name' || key === 'full_name') normKey = 'имя';
            if (key === 'last_name' || key === 'surname') normKey = 'фамилия';
            if (key === 'company' || key === 'company_name') normKey = 'компания';
            if (key === 'position' || key === 'job_title' || key === 'job') normKey = 'должность';
            if (key === 'notes' || key === 'comment') normKey = 'примечания';
            if (key === 'email') normKey = 'электронная_почта';
            if (key === 'phone' || key === 'mobile') normKey = 'телефон';
            if (key === 'linkedin') normKey = 'linkedin_url';
            if (key === 'telegram') normKey = 'телеграмма';
            if (key === 'country') normKey = 'страна';
            if (key === 'rating') normKey = 'рейтинг';
            if (key === 'network') normKey = 'сеть';
            if (key === 'birth_date' || key === 'birthday' || key === 'date') normKey = 'день_рождения';

            normalizedMapping[normKey] = val;
        }

        // Validate using fuzzy case-insensitive matching
        const validMapping: Partial<MappingResponse> = {};
        const validFields = ['имя', 'фамилия', 'компания', 'должность', 'примечания', 'электронная_почта', 'телефон', 'linkedin_url', 'телеграмма', 'website', 'страна', 'рейтинг', 'сеть', 'день_рождения'];

        const headerLookup = new Map<string, string>();
        headers.forEach(h => headerLookup.set(h.toLowerCase().trim(), h));

        for (const [field, headerValue] of Object.entries(normalizedMapping)) {
            if (validFields.includes(field) && typeof headerValue === 'string') {
                const suggestedHeader = headerValue.trim().toLowerCase();

                if (headerLookup.has(suggestedHeader)) {
                    // @ts-ignore
                    validMapping[field] = headerLookup.get(suggestedHeader);
                } else {
                    const partialMatch = Array.from(headerLookup.entries()).find(([key, val]) =>
                        key.includes(suggestedHeader) || suggestedHeader.includes(key)
                    );

                    if (partialMatch) {
                        // @ts-ignore
                        validMapping[field] = partialMatch[1];
                        console.log(`⚠️ Fuzzy matched "${headerValue}" to "${partialMatch[1]}"`);
                    } else {
                        console.warn(`⚠️ AI suggested header "${headerValue}" which is not in the file.`);
                    }
                }
            }
        }

        console.log('✅ Valid mapping:', validMapping);

        return NextResponse.json({
            success: true,
            mapping: validMapping,
            aiThinking: `Analyzed ${headers.length} columns and mapped ${Object.keys(validMapping).length} fields`,
        });

    } catch (error) {
        console.error('AI Mapper error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
