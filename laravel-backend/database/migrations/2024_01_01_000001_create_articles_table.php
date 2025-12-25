<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('content');
            $table->string('author')->nullable();
            $table->date('published_date')->nullable();
            $table->string('slug')->unique();
            $table->string('original_url');
            $table->boolean('is_updated')->default(false);
            $table->unsignedBigInteger('updated_article_id')->nullable();
            $table->json('reference_urls')->nullable();
            $table->timestamps();

            $table->foreign('updated_article_id')->references('id')->on('articles')->onDelete('set null');
            $table->index('is_updated');
            $table->index('published_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};

