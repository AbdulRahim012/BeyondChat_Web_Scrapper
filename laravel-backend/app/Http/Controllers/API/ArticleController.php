<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ArticleController extends Controller
{
    /**
     * Display a listing of the articles.
     */
    public function index(Request $request)
    {
        $query = Article::query();

        // Filter by is_updated if provided
        if ($request->has('is_updated')) {
            $query->where('is_updated', filter_var($request->is_updated, FILTER_VALIDATE_BOOLEAN));
        }

        // Get latest article
        if ($request->has('latest') && $request->latest) {
            $article = Article::where('is_updated', false)
                ->orderBy('published_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->first();
            
            if (!$article) {
                return response()->json(['message' => 'No articles found'], 404);
            }
            
            return response()->json($article);
        }

        $articles = $query->orderBy('published_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($articles);
    }

    /**
     * Store a newly created article.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'author' => 'nullable|string|max:255',
            'published_date' => 'nullable|date',
            'slug' => 'nullable|string|unique:articles,slug',
            'original_url' => 'required|url',
            'is_updated' => 'boolean',
            'updated_article_id' => 'nullable|exists:articles,id',
            'reference_urls' => 'nullable|array',
        ]);

        // Generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['title']);
            // Ensure uniqueness
            $counter = 1;
            $originalSlug = $validated['slug'];
            while (Article::where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = $originalSlug . '-' . $counter;
                $counter++;
            }
        }

        $article = Article::create($validated);

        return response()->json($article, 201);
    }

    /**
     * Display the specified article.
     */
    public function show($id)
    {
        $article = Article::findOrFail($id);
        return response()->json($article);
    }

    /**
     * Update the specified article.
     */
    public function update(Request $request, $id)
    {
        $article = Article::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required|string',
            'author' => 'nullable|string|max:255',
            'published_date' => 'nullable|date',
            'slug' => [
                'nullable',
                'string',
                Rule::unique('articles')->ignore($article->id)
            ],
            'original_url' => 'sometimes|required|url',
            'is_updated' => 'boolean',
            'updated_article_id' => 'nullable|exists:articles,id',
            'reference_urls' => 'nullable|array',
        ]);

        $article->update($validated);

        return response()->json($article);
    }

    /**
     * Remove the specified article.
     */
    public function destroy($id)
    {
        $article = Article::findOrFail($id);
        $article->delete();

        return response()->json(['message' => 'Article deleted successfully'], 200);
    }
}

