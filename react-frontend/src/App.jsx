import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ArticleList />} />
        <Route path="/article/:id" element={<ArticleDetail />} />
      </Routes>
    </Router>
  )
}

function ArticleList() {
  const [articles, setArticles] = useState([])
  const [filteredArticles, setFilteredArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, original, updated

  useEffect(() => {
    fetchArticles()
  }, [])

  useEffect(() => {
    if (filter === 'all') {
      setFilteredArticles(articles)
    } else if (filter === 'original') {
      setFilteredArticles(articles.filter(a => !a.is_updated))
    } else if (filter === 'updated') {
      setFilteredArticles(articles.filter(a => a.is_updated))
    }
  }, [filter, articles])

  const fetchArticles = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/articles`)
      setArticles(response.data)
      setFilteredArticles(response.data)
    } catch (err) {
      setError(err.message || 'Failed to fetch articles')
      console.error('Error fetching articles:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getExcerpt = (content) => {
    if (!content) return 'No content available'
    const text = content.replace(/[#*\[\]()]/g, '').trim()
    return text.length > 150 ? text.substring(0, 150) + '...' : text
  }

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container">
          <div className="loading">Loading articles...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className="container">
          <div className="error">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header />
      <div className="container">
        <div className="filters">
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Articles ({articles.length})
          </button>
          <button
            className={`filter-button ${filter === 'original' ? 'active' : ''}`}
            onClick={() => setFilter('original')}
          >
            Original ({articles.filter(a => !a.is_updated).length})
          </button>
          <button
            className={`filter-button ${filter === 'updated' ? 'active' : ''}`}
            onClick={() => setFilter('updated')}
          >
            Updated ({articles.filter(a => a.is_updated).length})
          </button>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="empty-state">
            <h2>No articles found</h2>
            <p>Try selecting a different filter or check back later.</p>
          </div>
        ) : (
          <div className="articles-grid">
            {filteredArticles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className={`article-card ${article.is_updated ? 'updated' : 'original'}`}
              >
                <h2>{article.title}</h2>
                <div className="meta">
                  {article.author && <span>By {article.author}</span>}
                  <span>{formatDate(article.published_date)}</span>
                  <span className={`badge ${article.is_updated ? 'updated' : 'original'}`}>
                    {article.is_updated ? 'Updated' : 'Original'}
                  </span>
                </div>
                <div className="excerpt">{getExcerpt(article.content)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ArticleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchArticle()
  }, [id])

  const fetchArticle = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/articles/${id}`)
      setArticle(response.data)
    } catch (err) {
      setError(err.message || 'Failed to fetch article')
      console.error('Error fetching article:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderContent = (content) => {
    if (!content) return 'No content available'
    
    // Remove markdown bold formatting (**text**)
    let cleanedContent = content.replace(/\*\*([^*]+)\*\*/g, '$1')
    
    // Simple markdown-like rendering
    const lines = cleanedContent.split('\n')
    return lines.map((line, index) => {
      // Remove any remaining ** from the line
      line = line.replace(/\*\*/g, '')
      
      if (line.startsWith('## ')) {
        return <h2 key={index}>{line.substring(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={index}>{line.substring(4)}</h3>
      }
      if (line.trim() === '') {
        return <br key={index} />
      }
      // Simple link detection
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      const parts = []
      let lastIndex = 0
      let match
      
      while ((match = linkRegex.exec(line)) !== null) {
        parts.push(line.substring(lastIndex, match.index))
        
        // If link text is "Untitled", use the URL instead
        let linkText = match[1];
        if (linkText === 'Untitled' || !linkText || linkText.trim() === '') {
          try {
            const urlObj = new URL(match[2]);
            linkText = urlObj.hostname.replace('www.', '') + urlObj.pathname;
            // Truncate if too long
            if (linkText.length > 50) {
              linkText = linkText.substring(0, 47) + '...';
            }
          } catch (e) {
            linkText = match[2]; // Use full URL if parsing fails
          }
        }
        
        parts.push(
          <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer">
            {linkText}
          </a>
        )
        lastIndex = match.index + match[0].length
      }
      parts.push(line.substring(lastIndex))
      
      return <p key={index}>{parts}</p>
    })
  }

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container">
          <div className="loading">Loading article...</div>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div>
        <Header />
        <div className="container">
          <div className="error">Error: {error || 'Article not found'}</div>
          <Link to="/" className="back-button">Back to Articles</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header />
      <div className="container">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back to Articles
        </button>
        
        <article className="article-detail">
          <h1>{article.title}</h1>
          <div className="meta">
            {article.author && <span><strong>Author:</strong> {article.author}</span>}
            <span><strong>Published:</strong> {formatDate(article.published_date)}</span>
            <span className={`badge ${article.is_updated ? 'updated' : 'original'}`}>
              {article.is_updated ? 'Updated Version' : 'Original Article'}
            </span>
            {article.original_url && (
              <a href={article.original_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                View Original
              </a>
            )}
          </div>
          
          <div className="content">
            {renderContent(article.content)}
          </div>

          {article.reference_urls && article.reference_urls.length > 0 && (
            <div className="references">
              <h3>References</h3>
              <ul>
                {article.reference_urls.map((url, index) => {
                  // Extract domain or use full URL as display text
                  let displayText = url;
                  try {
                    const urlObj = new URL(url);
                    displayText = urlObj.hostname.replace('www.', '');
                    // If it's a long path, show a shortened version
                    if (urlObj.pathname.length > 30) {
                      displayText = urlObj.hostname.replace('www.', '') + urlObj.pathname.substring(0, 30) + '...';
                    } else {
                      displayText = urlObj.hostname.replace('www.', '') + urlObj.pathname;
                    }
                  } catch (e) {
                    // If URL parsing fails, use the URL as is
                    displayText = url;
                  }
                  
                  return (
                    <li key={index}>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        {displayText}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </article>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="header">
      <div className="container">
        <h1>BeyondChats Articles</h1>
        <p>Browse original and enhanced articles</p>
      </div>
    </header>
  )
}

export default App

