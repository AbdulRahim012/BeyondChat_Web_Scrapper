import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'http://localhost:8000/api';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is required in .env file');
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

/**
 * Fetch the latest article from Laravel API (kept for backward compatibility)
 */
async function fetchLatestArticle() {
    try {
        console.log('Fetching latest article from Laravel API...');
        const response = await axios.get(`${LARAVEL_API_URL}/articles/latest`);
        
        if (!response.data || !response.data.id) {
            throw new Error('No articles found in the database');
        }
        
        console.log(`✓ Found article: "${response.data.title}"`);
        return response.data;
    } catch (error) {
        console.error('Error fetching latest article:', error.message);
        throw error;
    }
}

/**
 * Search Google for the article title and get top blog/article results
 */
async function searchGoogle(title) {
    console.log(`\nSearching Google for: "${title}"...`);
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Remove webdriver property
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        });
        
        // Navigate to Google search
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(title)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait a bit to avoid being detected as a bot
        await page.waitForTimeout(3000);
        
        // Extract search result links with multiple selector strategies
        const results = await page.evaluate(() => {
            const links = [];
            
            // Try multiple selectors for Google search results
            const selectors = [
                'div.g a[href^="http"]',
                'div[data-ved] a[href^="http"]',
                'a[href^="http"]:not([href*="google.com"])',
                'h3 a[href^="http"]'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                elements.forEach((linkElement) => {
                    if (links.length >= 10) return; // Limit to 10 results
                    
                    const href = linkElement.getAttribute('href');
                    const title = linkElement.textContent?.trim() || 
                                 linkElement.closest('div')?.querySelector('h3')?.textContent?.trim() || 
                                 '';
                    
                    // Filter out Google's own pages and common non-blog sites
                    if (href && 
                        href.startsWith('http') &&
                        !href.includes('google.com') && 
                        !href.includes('youtube.com') &&
                        !href.includes('facebook.com') &&
                        !href.includes('twitter.com') &&
                        !href.includes('linkedin.com') &&
                        !href.includes('instagram.com') &&
                        !href.includes('pinterest.com') &&
                        !href.endsWith('.pdf') &&
                        !links.some(l => l.url === href)) {
                        // Use URL as title if title is missing or generic
                        let displayTitle = title || href;
                        if (displayTitle === 'Untitled' || !displayTitle || displayTitle.length < 5) {
                            // Extract a readable title from URL
                            try {
                                const urlObj = new URL(href);
                                const pathParts = urlObj.pathname.split('/').filter(p => p);
                                if (pathParts.length > 0) {
                                    displayTitle = pathParts[pathParts.length - 1]
                                        .replace(/-/g, ' ')
                                        .replace(/\.[^.]+$/, '') // Remove file extension
                                        .split(' ')
                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(' ');
                                } else {
                                    displayTitle = urlObj.hostname.replace('www.', '');
                                }
                            } catch (e) {
                                displayTitle = href;
                            }
                        }
                        
                        links.push({
                            url: href,
                            title: displayTitle
                        });
                    }
                });
                
                if (links.length > 0) break; // If we found results, stop trying other selectors
            }
            
            return links;
        });
        
        await browser.close();
        
        // Filter to get blog/article URLs (heuristic: check if URL contains blog/article/post)
        const blogResults = results.filter(result => {
            const url = result.url.toLowerCase();
            return url.includes('blog') || 
                   url.includes('article') || 
                   url.includes('/post/') ||
                   url.includes('/posts/') ||
                   url.includes('medium.com') ||
                   url.includes('dev.to') ||
                   url.includes('hashnode.com') ||
                   url.includes('wordpress.com');
        });
        
        // If we don't have enough blog-specific results, use general results
        const finalResults = blogResults.length >= 2 ? blogResults : results;
        
        console.log(`✓ Found ${finalResults.length} search results`);
        
        // If still no results, try to get any non-Google links
        if (finalResults.length === 0 && results.length > 0) {
            console.log('Using general search results (not blog-specific)...');
            return results.slice(0, 2);
        }
        
        return finalResults.slice(0, 2); // Return top 2
        
    } catch (error) {
        if (browser) {
            await browser.close();
        }
        console.error('Error searching Google:', error.message);
        throw error;
    }
}

/**
 * Scrape main content from a URL
 */
async function scrapeArticleContent(url) {
    try {
        console.log(`  Scraping content from: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        
        // Remove script and style elements
        $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
        
        // Try to find main content area
        const contentSelectors = [
            'article',
            '.entry-content',
            '.post-content',
            '.article-content',
            '.content',
            'main',
            '[role="main"]',
            '.post-body',
            '.article-body'
        ];
        
        let content = '';
        for (const selector of contentSelectors) {
            const element = $(selector).first();
            if (element.length > 0) {
                content = element.text();
                if (content.length > 200) {
                    break;
                }
            }
        }
        
        // Fallback: get all paragraph text
        if (content.length < 200) {
            $('p').each((i, elem) => {
                const text = $(elem).text().trim();
                if (text.length > 20) {
                    content += '\n\n' + text;
                }
            });
        }
        
        // Clean up content
        content = content
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
        
        // Limit content length
        if (content.length > 5000) {
            content = content.substring(0, 5000) + '...';
        }
        
        console.log(`  ✓ Scraped ${content.length} characters`);
        return content;
        
    } catch (error) {
        console.error(`  ✗ Error scraping ${url}:`, error.message);
        return null;
    }
}

/**
 * Call OpenAI to enhance the article
 */
async function enhanceArticleWithLLM(originalArticle, referenceArticles) {
    console.log('\nCalling OpenAI to enhance article...');
    
    try {
        const referenceTexts = referenceArticles
            .map(ref => `Title: ${ref.title}\nContent: ${ref.content}`)
            .join('\n\n---\n\n');
        
        const prompt = `You are an expert content writer. Your task is to update and improve an article to match the style, formatting, and quality of top-ranking articles on Google.

Original Article:
Title: ${originalArticle.title}
Content: ${originalArticle.content}

Reference Articles (top-ranking articles on Google):
${referenceTexts}

Please update the original article to:
1. Match the writing style and tone of the reference articles
2. Improve the formatting and structure
3. Enhance the content quality while keeping the core message
4. Make it more engaging and professional
5. Ensure proper paragraph breaks and readability

Return ONLY the updated article content, without any additional commentary or explanation.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert content writer who improves articles to match top-ranking content on Google.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 2000,
            temperature: 0.7
        });
        
        const enhancedContent = completion.choices[0].message.content.trim();
        console.log('✓ Article enhanced by OpenAI');
        
        return enhancedContent;
        
    } catch (error) {
        console.error('Error calling OpenAI:', error.message);
        throw error;
    }
}

/**
 * Publish the enhanced article to Laravel API
 */
async function publishArticle(originalArticle, enhancedContent, referenceUrls) {
    console.log('\nPublishing enhanced article to Laravel API...');
    
    try {
        const articleData = {
            title: originalArticle.title + ' (Enhanced)',
            content: enhancedContent + '\n\n---\n\n## References\n\n' + 
                     referenceUrls.map((url, index) => {
                         // Use URL if title is "Untitled" or missing
                         const linkText = (url.title && url.title !== 'Untitled' && url.title.length > 5) 
                             ? url.title 
                             : url.url;
                         return `${index + 1}. [${linkText}](${url.url})`;
                     }).join('\n'),
            author: originalArticle.author || null,
            published_date: originalArticle.published_date || new Date().toISOString().split('T')[0],
            slug: null, // Will be auto-generated
            original_url: originalArticle.original_url,
            is_updated: true,
            updated_article_id: originalArticle.id,
            reference_urls: referenceUrls.map(url => url.url)
        };
        
        const response = await axios.post(`${LARAVEL_API_URL}/articles`, articleData);
        
        console.log(`✓ Enhanced article published with ID: ${response.data.id}`);
        return response.data;
        
    } catch (error) {
        console.error('Error publishing article:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Fetch all non-enhanced articles from Laravel API
 */
async function fetchNonEnhancedArticles() {
    try {
        console.log('Fetching non-enhanced articles from Laravel API...');
        const response = await axios.get(`${LARAVEL_API_URL}/articles?is_updated=false`);
        
        if (!response.data || response.data.length === 0) {
            throw new Error('No non-enhanced articles found');
        }
        
        console.log(`✓ Found ${response.data.length} articles to enhance`);
        return response.data;
    } catch (error) {
        console.error('Error fetching articles:', error.message);
        throw error;
    }
}

/**
 * Main execution function
 */
async function main() {
    try {
        console.log('=== Article Enhancement Script ===\n');
        
        // Step 1: Fetch all non-enhanced articles
        const articles = await fetchNonEnhancedArticles();
        
        if (articles.length === 0) {
            console.log('✓ All articles have been enhanced!');
            process.exit(0);
        }
        
        // Filter out articles that already have enhanced versions
        const articlesToEnhance = [];
        for (const article of articles) {
            try {
                // Check if this article already has an enhanced version
                const allArticles = await axios.get(`${LARAVEL_API_URL}/articles`);
                const hasEnhanced = allArticles.data.some(a => 
                    a.is_updated && a.updated_article_id === article.id
                );
                
                if (!hasEnhanced) {
                    articlesToEnhance.push(article);
                } else {
                    console.log(`⚠ Skipping "${article.title}" - already has enhanced version`);
                }
            } catch (e) {
                // If check fails, include the article anyway
                articlesToEnhance.push(article);
            }
        }
        
        if (articlesToEnhance.length === 0) {
            console.log('✓ All articles already have enhanced versions!');
            process.exit(0);
        }
        
        // Use filtered articles
        const finalArticles = articlesToEnhance;
        
        console.log(`\nProcessing ${finalArticles.length} article(s)...\n`);
        
        // Process each article
        for (let i = 0; i < finalArticles.length; i++) {
            const article = finalArticles[i];
            console.log(`\n[${i + 1}/${articles.length}] Processing: "${article.title}"`);
            console.log('='.repeat(60));
        
        // Step 2: Search Google
        // Use a more descriptive search query
        const searchQuery = article.title.length > 20 
            ? article.title.substring(0, 50) 
            : `${article.title} article blog`;
        
        const searchResults = await searchGoogle(searchQuery);
        
        if (searchResults.length === 0) {
            console.warn('⚠ No search results found from Google.');
            console.log('This might be due to:');
            console.log('1. Google detecting automated access');
            console.log('2. Network issues');
            console.log('3. Search query too specific');
            console.log('\nTrying alternative search query...');
            
            // Try with a simpler query
            const altQuery = article.title.split(' ').slice(0, 3).join(' ');
            const altResults = await searchGoogle(altQuery);
            
            if (altResults.length === 0) {
                console.error('✗ Could not find any search results. Skipping enhancement.');
                console.log('You can manually enhance articles later or check your network/Google access.');
                process.exit(0);
            }
            
            searchResults.push(...altResults);
        }
        
        // Step 3: Scrape content from top 2 results
        console.log('\nScraping content from top results...');
        const referenceArticles = [];
        
        for (const result of searchResults.slice(0, 2)) {
            const content = await scrapeArticleContent(result.url);
            if (content) {
                referenceArticles.push({
                    title: result.title,
                    url: result.url,
                    content: content
                });
            }
            
            // Add delay to avoid being blocked
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (referenceArticles.length === 0) {
            console.error('Could not scrape content from any reference articles.');
            process.exit(1);
        }
        
        console.log(`✓ Scraped ${referenceArticles.length} reference articles`);
        
        // Step 4: Enhance article with OpenAI
        const enhancedContent = await enhanceArticleWithLLM(article, referenceArticles);
        
            // Step 5: Publish enhanced article
            const publishedArticle = await publishArticle(article, enhancedContent, referenceArticles);
            
            console.log(`\n✓ [${i + 1}/${articles.length}] Enhancement complete!`);
            console.log(`  Original Article ID: ${article.id}`);
            console.log(`  Enhanced Article ID: ${publishedArticle.id}`);
            
            // Add delay between articles to avoid rate limiting
            if (i < finalArticles.length - 1) {
                console.log('\nWaiting 5 seconds before next article...\n');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('=== All Articles Enhanced Successfully ===');
        console.log(`Total articles processed: ${finalArticles.length}`);
        
    } catch (error) {
        console.error('\n✗ Fatal error:', error.message);
        process.exit(1);
    }
}

// Run the script
main();

