import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'URLs array is required' }, { status: 400 });
    }

    // Limit to 5 URLs max to avoid timeout
    const urlsToFetch = urls.slice(0, 5);
    
    const results = await Promise.allSettled(
      urlsToFetch.map(async (url) => {
        try {
          // Validate URL
          new URL(url);

          // Fetch with browser-like headers to bypass crawler blocks
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(10000), // 10 second timeout per URL
          });

          if (!response.ok) {
            return {
              url,
              success: false,
              error: `HTTP ${response.status}`,
            };
          }

          const html = await response.text();

          // Extract text content from HTML
          let text = html
            // Remove script and style tags with content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            // Remove HTML comments
            .replace(/<!--[\s\S]*?-->/g, '')
            // Remove all HTML tags
            .replace(/<[^>]+>/g, ' ')
            // Decode common HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&rsquo;/g, "'")
            .replace(/&ldquo;/g, '"')
            .replace(/&rdquo;/g, '"')
            // Clean up whitespace
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();

          // Extract title from HTML
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';

          // Limit to 6000 characters (about 1500 tokens)
          if (text.length > 6000) {
            text = text.substring(0, 6000) + '...';
          }

          return {
            url,
            success: true,
            title,
            text,
            length: text.length,
          };

        } catch (error) {
          return {
            url,
            success: false,
            error: error.message,
          };
        }
      })
    );

    // Process results
    const fetchedContent = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: urlsToFetch[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    return NextResponse.json({
      results: fetchedContent,
      totalFetched: fetchedContent.filter(r => r.success).length,
      totalFailed: fetchedContent.filter(r => !r.success).length,
    });

  } catch (error) {
    console.error('Batch fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch URLs',
      details: error.message 
    }, { status: 500 });
  }
}
