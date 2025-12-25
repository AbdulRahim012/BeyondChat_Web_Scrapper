<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Article extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'content',
        'author',
        'published_date',
        'slug',
        'original_url',
        'is_updated',
        'updated_article_id',
        'reference_urls',
    ];

    protected $casts = [
        'published_date' => 'date',
        'is_updated' => 'boolean',
        'reference_urls' => 'array',
    ];

    /**
     * Get the original article if this is an updated version
     */
    public function originalArticle(): BelongsTo
    {
        return $this->belongsTo(Article::class, 'updated_article_id');
    }

    /**
     * Get all updated versions of this article
     */
    public function updatedVersions()
    {
        return $this->hasMany(Article::class, 'updated_article_id');
    }
}

