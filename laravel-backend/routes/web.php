<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'BeyondChats Article API',
        'version' => '1.0.0',
        'endpoints' => [
            'GET /api/articles' => 'Get all articles',
            'GET /api/articles/latest' => 'Get latest article',
            'GET /api/articles/{id}' => 'Get specific article',
            'POST /api/articles' => 'Create article',
            'PUT /api/articles/{id}' => 'Update article',
            'DELETE /api/articles/{id}' => 'Delete article',
        ]
    ]);
});

