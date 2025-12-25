<?php

namespace App\Console\Commands;

use App\Models\Article;
use Goutte\Client;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class ScrapeBeyondChatsArticles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'scrape:beyondchats {--count=5 : Number of articles to scrape}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scrape the oldest articles from BeyondChats blog';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $count = (int) $this->option('count');
        $this->info("Starting to scrape {$count} oldest articles from BeyondChats...");

        $client = new Client();
        $baseUrl = 'https://beyondchats.com/blogs/';
        
        $articles = [];
        $page = 1;
        $maxPages = 10; // Safety limit

        // First, find the last page
        $lastPage = $this->findLastPage($client, $baseUrl);
        $this->info("Found last page: {$lastPage}");

        // Collect ALL articles from all pages first, then sort by date
        $currentPage = 1;
        $allArticles = [];

        while ($currentPage <= $lastPage) {
            $this->info("Scraping page {$currentPage}...");
            $url = $currentPage === 1 ? $baseUrl : $baseUrl . "page/{$currentPage}/";
            
            try {
                $crawler = $client->request('GET', $url);
                
                // Look for blog article links - try multiple selectors
                $crawler->filter('a[href*="/blogs/"]')->each(function ($node) use (&$allArticles, $crawler) {

                    try {
                        $link = $node->attr('href');
                        if (!$link) {
                            return;
                        }

                        // Make link absolute if relative
                        if (strpos($link, 'http') !== 0) {
                            $link = 'https://beyondchats.com' . ltrim($link, '/');
                        }

                        // CRITICAL: Only collect actual blog articles from /blogs/ path
                        $linkLower = strtolower($link);
                        
                        // Must contain /blogs/ in the URL (not just /blog/)
                        if (strpos($linkLower, '/blogs/') === false) {
                            return; // Skip - not a blog article
                        }
                        
                        // Exclude tag pages, category pages, and other non-article pages
                        $excludedPatterns = [
                            '/blogs/tag/',
                            '/blogs/category/',
                            '/blogs/author/',
                            '/blogs/page/',
                            '/features',
                            '/integrations',
                            '/pricing',
                            '/about',
                            '/contact',
                            '/case-studies',
                            '/success-stories',
                            '/testimonials',
                            '/faq',
                            '/terms',
                            '/privacy',
                            '/careers',
                            '/team',
                            '/solutions'
                        ];
                        
                        foreach ($excludedPatterns as $excluded) {
                            if (strpos($linkLower, $excluded) !== false) {
                                return; // Skip excluded pages
                            }
                        }
                        
                        // Only accept URLs that look like actual blog posts
                        // Should be /blogs/article-slug/ format, not /blogs/tag/ or /blogs/category/
                        if (!preg_match('/\/blogs\/[^\/]+\/?$/', $link) || 
                            preg_match('/\/blogs\/(tag|category|author|page)\//', $linkLower)) {
                            return; // Skip - not a blog post URL
                        }

                        // Get title from link text or parent heading
                        $title = trim($node->text());
                        
                        // If link text is too short or generic, try to find h2/h3 in the same container
                        if (strlen($title) < 10 || 
                            in_array(strtolower($title), ['read more', 'read', 'more', '→', '»', 'beyondchats'])) {
                            // Try to find h2 or h3 that contains this link
                            $parentContainer = $node->closest('article, .post, .blog-post, [class*="blog"]');
                            if ($parentContainer->count() > 0) {
                                $heading = $parentContainer->filter('h2, h3')->first();
                                if ($heading->count() > 0) {
                                    $title = trim($heading->text());
                                }
                            } else {
                                // Fallback: look for h2/h3 before this link in the document
                                $allHeadings = $crawler->filter('h2, h3');
                                $nodeHtml = $node->outerHtml();
                                $allHeadings->each(function ($heading) use (&$title, $nodeHtml) {
                                    // Simple check - if heading is near the link
                                    if (strlen($title) < 10) {
                                        $headingText = trim($heading->text());
                                        if (strlen($headingText) > 10) {
                                            $title = $headingText;
                                            return false; // Stop iteration
                                        }
                                    }
                                });
                            }
                        }
                        
                        // Clean title - remove "BeyondChats" if present
                        $title = preg_replace('/\bBeyondChats\b/i', '', $title);
                        $title = trim($title);
                        $title = preg_replace('/\s+/', ' ', $title);

                        // Skip if title is still invalid
                        if (!$title || strlen($title) < 5 || strtolower($title) === 'beyondchats') {
                            return;
                        }

                        // Skip if already collected
                        $alreadyCollected = false;
                        foreach ($allArticles as $existing) {
                            if (isset($existing['url']) && $existing['url'] === $link) {
                                $alreadyCollected = true;
                                break;
                            }
                        }
                        if ($alreadyCollected) {
                            return;
                        }

                        // Try to extract date from the article container
                        $date = null;
                        $dateText = null;
                        
                        // Look for date in various formats near the article
                        // Try to find parent container
                        $container = null;
                        $parentSelectors = ['article', '.post', '.blog-post', '.entry', '[class*="blog"]'];
                        foreach ($parentSelectors as $selector) {
                            try {
                                $testContainer = $node->closest($selector);
                                if ($testContainer && $testContainer->count() > 0) {
                                    $container = $testContainer;
                                    break;
                                }
                            } catch (\Exception $e) {
                                // closest() might not be available, try alternative
                                continue;
                            }
                        }
                        
                        if ($container && $container->count() > 0) {
                            // Try date selectors
                            $dateSelectors = ['time', '[datetime]', '.date', '.published-date', '.post-date', '[class*="date"]'];
                            foreach ($dateSelectors as $selector) {
                                $dateNode = $container->filter($selector)->first();
                                if ($dateNode->count() > 0) {
                                    $dateAttr = $dateNode->attr('datetime');
                                    if ($dateAttr) {
                                        $dateText = $dateAttr;
                                    } else {
                                        $dateText = trim($dateNode->text());
                                    }
                                    if ($dateText) break;
                                }
                            }
                            
                            // Also try to find date text in the container text (e.g., "March 24, 2025")
                            if (!$dateText) {
                                $containerText = $container->text();
                                if (preg_match('/(\w+\s+\d{1,2},\s+\d{4})/', $containerText, $matches)) {
                                    $dateText = $matches[1];
                                } elseif (preg_match('/(\d{1,2}\/\d{1,2}\/\d{4})/', $containerText, $matches)) {
                                    $dateText = $matches[1];
                                }
                            }
                        }
                        
                        // Parse date
                        if ($dateText) {
                            try {
                                $date = \Carbon\Carbon::parse($dateText);
                            } catch (\Exception $e) {
                                // Try common formats
                                $dateFormats = ['F j, Y', 'M j, Y', 'Y-m-d', 'd/m/Y', 'M d, Y'];
                                foreach ($dateFormats as $format) {
                                    try {
                                        $date = \Carbon\Carbon::createFromFormat($format, $dateText);
                                        break;
                                    } catch (\Exception $e2) {
                                        continue;
                                    }
                                }
                            }
                        }
                        
                        // If no date found, use a very old date (will be sorted last)
                        if (!$date) {
                            $date = \Carbon\Carbon::parse('1900-01-01');
                        }

                        $allArticles[] = [
                            'title' => $title,
                            'url' => $link,
                            'date' => $date,
                            'date_text' => $dateText,
                        ];
                    } catch (\Exception $e) {
                        // Silently skip errors
                    }
                });

                $currentPage++;
            } catch (\Exception $e) {
                $this->error("Error scraping page {$currentPage}: " . $e->getMessage());
                $currentPage++;
            }
        }

        // Remove duplicates by URL first
        $uniqueArticles = [];
        $seenUrls = [];
        foreach ($allArticles as $article) {
            if (!in_array($article['url'], $seenUrls)) {
                $uniqueArticles[] = $article;
                $seenUrls[] = $article['url'];
            }
        }

        // Filter out articles without valid dates (1900-01-01 means no date was found)
        $articlesWithDates = array_filter($uniqueArticles, function ($article) {
            return $article['date']->year > 1900;
        });
        
        // If we have articles with dates, use those; otherwise use all
        $articlesToSort = !empty($articlesWithDates) ? $articlesWithDates : $uniqueArticles;

        // Sort articles by date (oldest first)
        usort($articlesToSort, function ($a, $b) {
            return $a['date']->lt($b['date']) ? -1 : 1;
        });

        // Take the oldest N articles
        $articles = array_slice($articlesToSort, 0, $count);
        
        $this->info("\nFound " . count($uniqueArticles) . " unique articles. Selecting {$count} oldest by date:");
        foreach ($articles as $article) {
            $dateStr = $article['date']->format('Y-m-d');
            $this->info("  - {$article['title']} ({$dateStr})");
        }

        if (empty($articles)) {
            $this->error("No articles found. The website structure might have changed.");
            $this->info("Attempting alternative scraping method...");
            $articles = $this->alternativeScrape($client, $baseUrl, $count);
        }

        // Now scrape full content for each article
        $this->info("\nScraping full content for " . count($articles) . " articles...");
        $saved = 0;

        foreach ($articles as $articleData) {
            try {
                $dateStr = $articleData['date']->format('Y-m-d');
                $this->info("Processing: {$articleData['title']} (Date: {$dateStr})");
                $fullArticle = $this->scrapeArticleContent($client, $articleData['url']);
                
                if ($fullArticle) {
                    $slug = Str::slug($fullArticle['title']);
                    $counter = 1;
                    $originalSlug = $slug;
                    while (Article::where('slug', $slug)->exists()) {
                        $slug = $originalSlug . '-' . $counter;
                        $counter++;
                    }

                    // Use the date from listing page if article page doesn't have a better date
                    $publishedDate = $fullArticle['published_date'] ?? $articleData['date']->format('Y-m-d');
                    
                    // If the scraped date is the default (1900), use the listing date
                    if ($fullArticle['published_date'] && 
                        \Carbon\Carbon::parse($fullArticle['published_date'])->year == 1900) {
                        $publishedDate = $articleData['date']->format('Y-m-d');
                    }

                    Article::create([
                        'title' => $fullArticle['title'],
                        'content' => $fullArticle['content'],
                        'author' => $fullArticle['author'] ?? null,
                        'published_date' => $publishedDate,
                        'slug' => $slug,
                        'original_url' => $articleData['url'],
                        'is_updated' => false,
                    ]);

                    $saved++;
                    $this->info("✓ Saved: {$fullArticle['title']} (Published: {$publishedDate})");
                }
            } catch (\Exception $e) {
                $this->error("Error saving article: " . $e->getMessage());
            }
        }

        $this->info("\n✓ Successfully scraped and saved {$saved} articles!");
        return 0;
    }

    /**
     * Find the last page number
     */
    private function findLastPage(Client $client, string $baseUrl): int
    {
        try {
            $crawler = $client->request('GET', $baseUrl);
            
            // Look for pagination links
            $lastPage = 1;
            $crawler->filter('a[href*="page/"], .pagination a, .page-numbers a')->each(function ($node) use (&$lastPage) {
                $href = $node->attr('href');
                $text = $node->text();
                
                // Extract page number from href or text
                if (preg_match('/page\/(\d+)/', $href, $matches)) {
                    $pageNum = (int) $matches[1];
                    if ($pageNum > $lastPage) {
                        $lastPage = $pageNum;
                    }
                }
                
                if (is_numeric($text) && (int) $text > $lastPage) {
                    $lastPage = (int) $text;
                }
            });

            return max(1, $lastPage);
        } catch (\Exception $e) {
            $this->warn("Could not determine last page, defaulting to page 1");
            return 1;
        }
    }

    /**
     * Alternative scraping method if main method fails
     */
    private function alternativeScrape(Client $client, string $baseUrl, int $count): array
    {
        $articles = [];
        
        try {
            $crawler = $client->request('GET', $baseUrl);
            
            // Try to find all links that are blog articles (must have /blogs/ in URL)
            $crawler->filter('a[href*="/blogs/"]')->each(function ($node) use (&$articles, $count) {
                if (count($articles) >= $count) {
                    return false;
                }

                $href = $node->attr('href');
                if (!$href) {
                    return;
                }

                if (strpos($href, 'http') !== 0) {
                    $href = 'https://beyondchats.com' . ltrim($href, '/');
                }

                // Only accept /blogs/ URLs that are actual blog posts (not tags/categories)
                $hrefLower = strtolower($href);
                if (strpos($hrefLower, '/blogs/') === false ||
                    preg_match('/\/blogs\/(tag|category|author|page)\//', $hrefLower)) {
                    return;
                }
                
                // Must match blog post URL pattern
                if (!preg_match('/\/blogs\/[^\/]+\/?$/', $href)) {
                    return;
                }

                $title = trim($node->text());
                
                // Try to find heading in the same container if link text is short
                if (strlen($title) < 10) {
                    $container = $node->closest('article, .post, .blog-post, [class*="blog"]');
                    if ($container->count() > 0) {
                        $heading = $container->filter('h2, h3')->first();
                        if ($heading->count() > 0) {
                            $title = trim($heading->text());
                        }
                    }
                }

                // Clean title
                $title = preg_replace('/\bBeyondChats\b/i', '', $title);
                $title = trim($title);

                if ($title && strlen($title) > 10 && strtolower($title) !== 'beyondchats') {
                    $articles[] = [
                        'title' => $title,
                        'url' => $href,
                    ];
                }
            });
        } catch (\Exception $e) {
            $this->error("Alternative scrape failed: " . $e->getMessage());
        }

        return $articles;
    }

    /**
     * Scrape full article content
     */
    private function scrapeArticleContent(Client $client, string $url): ?array
    {
        try {
            $crawler = $client->request('GET', $url);
            
            // Extract title - be more specific to avoid getting site name/logo
            $titleText = 'Untitled';
            
            // Try article-specific selectors first (most specific)
            $titleSelectors = [
                'article h1',
                'main h1',
                '.post h1',
                '.entry h1',
                '.article-header h1',
                '.post-header h1',
                'h1.entry-title',
                'h1.post-title',
                'h1.article-title',
                '.entry-title',
                '.post-title',
                '.article-title',
                'h1', // Fallback to any h1
            ];
            
            foreach ($titleSelectors as $selector) {
                $titleNode = $crawler->filter($selector)->first();
                if ($titleNode->count() > 0) {
                    $titleText = trim($titleNode->text());
                    // Filter out common site names/branding
                    if ($titleText && 
                        strtolower($titleText) !== 'beyondchats' && 
                        strlen($titleText) > 5 &&
                        !in_array(strtolower($titleText), ['home', 'blog', 'about', 'contact'])) {
                        break;
                    }
                }
            }
            
            // If still got site name, try to find title in article content area
            if (strtolower($titleText) === 'beyondchats' || $titleText === 'Untitled') {
                $articleContent = $crawler->filter('article, .post, .entry, main')->first();
                if ($articleContent->count() > 0) {
                    $articleTitle = $articleContent->filter('h1, h2')->first();
                    if ($articleTitle->count() > 0) {
                        $titleText = trim($articleTitle->text());
                    }
                }
            }

            // Extract content - try multiple selectors
            $contentSelectors = [
                '.entry-content',
                '.post-content',
                '.article-content',
                'article',
                '.content',
                'main',
                '[class*="content"]',
            ];

            $content = '';
            foreach ($contentSelectors as $selector) {
                $contentNode = $crawler->filter($selector)->first();
                if ($contentNode->count() > 0) {
                    $content = $contentNode->text();
                    if (strlen($content) > 100) {
                        break;
                    }
                }
            }

            // Fallback: get all paragraph text
            if (strlen($content) < 100) {
                $crawler->filter('p')->each(function ($node) use (&$content) {
                    $content .= "\n\n" . trim($node->text());
                });
            }

            // Extract author
            $author = null;
            $authorSelectors = ['.author', '.by-author', '[class*="author"]', '[rel="author"]'];
            foreach ($authorSelectors as $selector) {
                $authorNode = $crawler->filter($selector)->first();
                if ($authorNode->count() > 0) {
                    $author = trim($authorNode->text());
                    break;
                }
            }

            // Extract published date
            $publishedDate = null;
            $dateSelectors = ['time', '.published-date', '[class*="date"]', '[datetime]'];
            foreach ($dateSelectors as $selector) {
                $dateNode = $crawler->filter($selector)->first();
                if ($dateNode->count() > 0) {
                    $dateAttr = $dateNode->attr('datetime');
                    if ($dateAttr) {
                        $publishedDate = date('Y-m-d', strtotime($dateAttr));
                    } else {
                        $dateText = trim($dateNode->text());
                        if ($dateText) {
                            $publishedDate = date('Y-m-d', strtotime($dateText));
                        }
                    }
                    if ($publishedDate) break;
                }
            }

            // Clean up title - remove "BeyondChats" prefix/suffix and extra whitespace
            $titleText = preg_replace('/\bBeyondChats\b/i', '', $titleText);
            $titleText = trim($titleText);
            $titleText = preg_replace('/\s+/', ' ', $titleText); // Normalize whitespace
            
            // If title is empty or too short after cleaning, try URL-based title
            if (strlen($titleText) < 5) {
                // Extract from URL slug
                if (preg_match('/\/([^\/]+)\/?$/', $url, $matches)) {
                    $slug = urldecode($matches[1]);
                    $titleText = ucwords(str_replace(['-', '_'], ' ', $slug));
                }
            }
            
            return [
                'title' => $titleText ?: 'Untitled Article',
                'content' => trim($content),
                'author' => $author,
                'published_date' => $publishedDate,
            ];
        } catch (\Exception $e) {
            $this->error("Error scraping article content from {$url}: " . $e->getMessage());
            return null;
        }
    }
}

